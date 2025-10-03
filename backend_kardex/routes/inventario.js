const express = require("express");
const router = express.Router();
const pool = require("../db"); // tu conexión MySQL


// 🔹 Obtener inventario completo, con filtros opcionales
router.get("/", async (req, res) => {
  try {
    const { tipo, nombre, mes } = req.query;

    // 🔹 Consulta Reactivos (kardex JOIN nombre_insumo)
    let queryKardex = `
      SELECT 
        k.id_nombre_insumo AS id,
        n.nombre AS nombre,
        k.fecha_recepcion,
        k.fecha_vencimiento,
        k.cantidad,
        'REACTIVO' AS tipo
      FROM kardex k
      JOIN nombre_insumo n ON k.id_nombre_insumo = n.id_nombre_insumo
      WHERE 1=1
    `;

    // 🔹 Consulta Insumos (insumos JOIN nombre_del_insumo)
    let queryInsumos = `
      SELECT 
        i.id_nombre_del_insumo AS id,
        n.nombre AS nombre,
        i.fecha AS fecha,
        i.fecha_de_vto AS fecha_de_vto,
        i.cantidad,
        'INSUMO' AS tipo
      FROM insumos i
      JOIN nombre_del_insumo n ON i.id_nombre_del_insumo = n.id_nombre_del_insumo
      WHERE 1=1
    `;

    const paramsKardex = [];
    const paramsInsumos = [];

    // 🔹 Filtro por tipo
    if (tipo) {
      if (tipo.toUpperCase() === "INSUMO") {
        queryKardex += " AND 0"; // no trae nada
      } else if (tipo.toUpperCase() === "REACTIVO") {
        queryInsumos += " AND 0"; // no trae nada
      }
    }

    // 🔹 Filtro por nombre
    if (nombre) {
      queryKardex += ` AND n.nombre LIKE ?`;
      paramsKardex.push(`%${nombre}%`);

      queryInsumos += ` AND n.nombre LIKE ?`;
      paramsInsumos.push(`%${nombre}%`);
    }

    // 🔹 Filtro por mes
    if (mes) {
      queryKardex += ` AND MONTH(k.fecha_recepcion) = ?`;
      paramsKardex.push(mes);

      queryInsumos += ` AND MONTH(i.fecha) = ?`;
      paramsInsumos.push(mes);
    }

    // 🔹 Ejecutar consultas
    const [rowsKardex] = await pool.query(queryKardex, paramsKardex);
    const [rowsInsumos] = await pool.query(queryInsumos, paramsInsumos);

    // 🔹 Combinar resultados
    const inventario = [...rowsKardex, ...rowsInsumos];

    res.json(inventario);
  } catch (error) {
    console.error("Error al obtener inventario:", error);
    res.status(500).json({ error: "Error al obtener inventario" });
  }
});

module.exports = router;
