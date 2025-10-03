const express = require('express');
const router = express.Router();
const pool = require('../db');

function toYMD(v) {
  if (!v) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function procesarFechasTerminacion() {
  console.log('⏰ Cron procesando insumos y kardex...');
  try {
    const hoy = toYMD(new Date()); 


    let eliminadosInsumos = 0;
    let eliminadosKardex = 0;

    // =========================
    // 1) INSUMOS vencidos hoy
    // =========================
    const [insumosVencidos] = await pool.query(
      `SELECT i.id_insumo, i.id_laboratorio, i.cantidad, n.nombre AS nombre_del_insumo
       FROM insumos i
       JOIN nombre_del_insumo n ON i.id_nombre_del_insumo = n.id_nombre_del_insumo
       WHERE i.termino = ?`,
      [hoy]
    );
    console.log(`📌 Insumos vencidos encontrados: ${insumosVencidos.length}`);

    for (const ins of insumosVencidos) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [stockRows] = await conn.query(
          `SELECT * FROM stock_inventario
           WHERE id_insumo = ? AND id_laboratorio = ?
           ORDER BY id_stock_inventario ASC FOR UPDATE`,
          [ins.id_insumo, ins.id_laboratorio]
        );

        let cantidadPendiente = ins.cantidad;
        let descontadoTotal = 0;

        for (const row of stockRows) {
          if (cantidadPendiente <= 0) break;
          const rowQty = Number(row.cantidad_actual || 0);

          if (rowQty > cantidadPendiente) {
            await conn.query(
              `UPDATE stock_inventario
               SET cantidad_actual = cantidad_actual - ?
               WHERE id_stock_inventario = ?`,
              [cantidadPendiente, row.id_stock_inventario]
            );
            descontadoTotal += cantidadPendiente;
            cantidadPendiente = 0;
          } else {
            await conn.query(
              `DELETE FROM stock_inventario WHERE id_stock_inventario = ?`,
              [row.id_stock_inventario]
            );
            descontadoTotal += rowQty;
            cantidadPendiente -= rowQty;
            eliminadosInsumos++;
          }
        }

        await conn.commit();
        conn.release();

        console.log(`✅ Insumo "${ins.nombre_del_insumo}" (lab ${ins.id_laboratorio}) → descontado ${descontadoTotal}`);
      } catch (err) {
        await conn.rollback();
        conn.release();
        console.error(`❌ Error procesando insumo ${ins.id_insumo}:`, err);
      }
    }

    // =========================
    // 2) KARDEX vencidos hoy
    // =========================
    const [kardexVencidos] = await pool.query(
      `SELECT k.id_kardex, k.id_casa_comercial, k.cantidad, n.nombre AS nombre_insumo
       FROM kardex k
       JOIN nombre_insumo n ON k.id_nombre_insumo = n.id_nombre_insumo
       WHERE k.fecha_terminacion = ?`,
      [hoy]
    );
    console.log(`📌 Kardex vencidos encontrados: ${kardexVencidos.length}`);

    for (const kdx of kardexVencidos) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [stockRows] = await conn.query(
          `SELECT * FROM stock_inventario
           WHERE id_kardex = ? AND id_casa_comercial = ?
           ORDER BY id_stock_inventario ASC FOR UPDATE`,
          [kdx.id_kardex, kdx.id_casa_comercial]
        );

        let cantidadPendiente = kdx.cantidad;
        let descontadoTotal = 0;

        for (const row of stockRows) {
          if (cantidadPendiente <= 0) break;
          const rowQty = Number(row.cantidad_actual || 0);

          if (rowQty > cantidadPendiente) {
            await conn.query(
              `UPDATE stock_inventario
               SET cantidad_actual = cantidad_actual - ?
               WHERE id_stock_inventario = ?`,
              [cantidadPendiente, row.id_stock_inventario]
            );
            descontadoTotal += cantidadPendiente;
            cantidadPendiente = 0;
          } else {
            await conn.query(
              `DELETE FROM stock_inventario WHERE id_stock_inventario = ?`,
              [row.id_stock_inventario]
            );
            descontadoTotal += rowQty;
            cantidadPendiente -= rowQty;
            eliminadosKardex++;
          }
        }

        await conn.commit();
        conn.release();

        console.log(`✅ Kardex "${kdx.nombre_insumo}" (casa ${kdx.id_casa_comercial}) → descontado ${descontadoTotal}`);
      } catch (err) {
        await conn.rollback();
        conn.release();
        console.error(`❌ Error procesando kardex ${kdx.id_kardex}:`, err);
      }
    }

    console.log(`✅ Cron procesado. Resumen: ajustados ${eliminadosInsumos} insumos en stock, ${eliminadosKardex} kardex en stock.`);
  } catch (err) {
    console.error("❌ Error en cron de fechas:", err);
  }
}


// GET todo el stock, separado por Insumos y Reactivos

router.get("/", async (req, res) => {
  try {
    const { tipo, nombre, laboratorio, casaComercial } = req.query;

    // Parámetros y condiciones por tipo
    let whereInsumos = "s.id_insumo IS NOT NULL";
    let paramsInsumos = [];

    let whereReactivos = "s.id_kardex IS NOT NULL";
    let paramsReactivos = [];

    // Filtros dinámicos
    if (nombre) {
      whereInsumos += " AND s.nombre_producto LIKE ?";
      paramsInsumos.push(`%${nombre}%`);

      whereReactivos += " AND s.nombre_producto LIKE ?";
      paramsReactivos.push(`%${nombre}%`);
    }

    if (laboratorio) { // solo insumos
      whereInsumos += " AND l.nombre LIKE ?";
      paramsInsumos.push(`%${laboratorio}%`);
    }

    if (casaComercial) { // solo reactivos
      whereReactivos += " AND c.nombre LIKE ?";
      paramsReactivos.push(`%${casaComercial}%`);
    }

    let insumos = [];
    let reactivos = [];

    // Obtener insumos
    if (!tipo || tipo === "INSUMO") {
      const [rows] = await pool.query(
        `
        SELECT 
          s.nombre_producto,
          l.nombre AS laboratorio,
          SUM(s.cantidad_actual) AS cantidad_total
        FROM stock_inventario s
        LEFT JOIN laboratorio l ON s.id_laboratorio = l.id_laboratorio
        WHERE ${whereInsumos}
        GROUP BY s.nombre_producto, l.nombre
        `,
        paramsInsumos
      );
      insumos = rows;
    }

    // Obtener reactivos
    if (!tipo || tipo === "REACTIVO") {
      const [rows] = await pool.query(
        `
        SELECT 
          s.nombre_producto,
          c.nombre AS casa_comercial,
          SUM(s.cantidad_actual) AS cantidad_total
        FROM stock_inventario s
        LEFT JOIN casa_comercial c ON s.id_casa_comercial = c.id_casa_comercial
        WHERE ${whereReactivos}
        GROUP BY s.nombre_producto, c.nombre
        `,
        paramsReactivos
      );
      reactivos = rows;
    }

    res.json({ insumos, reactivos });
  } catch (err) {
    console.error("Error en /stock_inventario:", err);
    res.status(500).json({ error: "Error al obtener stock" });
  }
});

// Función para actualizar stock de manera segura
async function actualizarStock(idKardex, cantidadADescontar) {
  try {
    // 1️⃣ Buscar el registro de kardex
    const [kardexRows] = await pool.query(
      'SELECT * FROM kardex WHERE id_kardex = ?',
      [idKardex]
    );
    if (kardexRows.length === 0) return; // no existe

    const kardex = kardexRows[0];

    // 2️⃣ Buscar el stock correspondiente en stock_inventario
    const [stockRows] = await pool.query(
      'SELECT * FROM stock_inventario WHERE id_nombre_insumo = ? AND id_casa_comercial = ? LIMIT 1',
      [kardex.id_nombre_insumo, kardex.id_casa_comercial]
    );
    if (stockRows.length === 0) return; // no hay stock

    const stock = stockRows[0];

    // 3️⃣ Calcular nueva cantidad
    const nuevaCantidad = stock.cantidad_actual - cantidadADescontar;

    if (nuevaCantidad <= 0) {
      // Si se acabó, eliminar stock
      await pool.query(
        'DELETE FROM stock_inventario WHERE id_stock_inventario = ?',
        [stock.id_stock_inventario]
      );
    } else {
      // Actualizar stock
      await pool.query(
        'UPDATE stock_inventario SET cantidad_actual = ?, updatedAt = NOW() WHERE id_stock_inventario = ?',
        [nuevaCantidad, stock.id_stock_inventario]
      );
    }

    // 4️⃣ Actualizar salida acumulada en kardex
    const nuevaSalida = Number(kardex.salida || 0) + cantidadADescontar;
    await pool.query(
      'UPDATE kardex SET salida = ? WHERE id_kardex = ?',
      [nuevaSalida, idKardex]
    );

  } catch (err) {
    console.error('Error actualizando stock Kardex:', err);
  }
}

// Exportar módulos
module.exports = { router, procesarFechasTerminacion, actualizarStock };