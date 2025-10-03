
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { registrarAuditoria } = require('../utils/auditoria');
const {  procesarSalidas } = require('../utils/notificaciones');

// Funcion que permite validar o crear si el valor de FK no existe
async function obtenerOcrearFK(pool, tabla, columna, valor) {
  if (!valor || valor === '') return null;

  // Si el valor es un número → asumimos que es un ID y validamos
  if (!isNaN(Number(valor))) {
    const [rows] = await pool.query(
      `SELECT 1 FROM ${tabla} WHERE id_${columna} = ? LIMIT 1`,
      [valor]
    );
    if (rows.length === 0) {
      throw new Error(`El id ${valor} de ${tabla} no existe.`);
    }
    return Number(valor);
  }

  // Si no es número → asumimos que es un NOMBRE y lo insertamos si no existe
  const [rowsNombre] = await pool.query(
    `SELECT id_${columna} FROM ${tabla} WHERE nombre = ? LIMIT 1`,
    [valor]
  );

  if (rowsNombre.length > 0) {
    return rowsNombre[0][`id_${columna}`];
  }

  const [insertResult] = await pool.query(
    `INSERT INTO ${tabla} (nombre) VALUES (?)`,
    [valor]
  );

  return insertResult.insertId;
}



// Crear insumo
router.post('/', async (req, res) => {

    try {

    const {
        fecha, temperatura, cantidad, salida, saldo, id_nombre_del_insumo, id_presentacion,
        id_laboratorio, id_proveedor, lote, fecha_de_vto, registro_invima, expediente_invima,
        id_clasificacion, estado_de_revision, salida_fecha, inicio, termino,
        lab_sas, factura, costo_global, costo, costo_prueba, costo_unidad, iva,
        consumible, mes_registro, id_categoria, usuarioId
    } = req.body;
          
    
    
            //Validar formato de fecha
            const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!fecha || !fechaRegex.test(fecha)) {
            return res.status(400).json({ error: 'La fecha debe tener el formato YYYY-MM-DD' });
            }
             
            // Validar formato de fecha vto
            if (fecha_de_vto && !fechaRegex.test(fecha_de_vto)) {
            return res.status(400).json({ error: 'La fecha de vencimiento debe tener el formato YYYY-MM-DD' });
            }


              //Validar el nombre del isnumo para que stock funcione correctamente
              if (!id_nombre_del_insumo || (typeof id_nombre_del_insumo === "string" && id_nombre_del_insumo.trim() === "")) {
              return res.status(400).json({ error: "El nombre del insumo es obligatorio, para que el stock funcione correctamente " });
              }

              //Validar  la cantidad para que funcione el stock
              if (
                 cantidad === undefined ||
                   cantidad === null ||
                  (typeof cantidad === 'string' && cantidad.trim() === '') ||
                   isNaN(Number(cantidad))
                  ) {
                   return res.status(400).json({ error: "La cantidad es obligatoria para que el stock pueda funcionar correctamente" });
                }

 
           // Validar o crear FK (acepta ID o nombre nuevo) — con los nombres de variable que pediste
           const idNombreDelInsumo = await obtenerOcrearFK(pool, 'nombre_del_insumo', 'nombre_del_insumo', id_nombre_del_insumo);
           const idPresentacion     = await obtenerOcrearFK(pool, 'presentacion',  'presentacion',  id_presentacion);
           const idLaboratorio      = await obtenerOcrearFK(pool, 'laboratorio',   'laboratorio',   id_laboratorio);
           const idProveedor        = await obtenerOcrearFK(pool, 'proveedor',     'proveedor',     id_proveedor);
           const idClasificacion    = await obtenerOcrearFK(pool, 'clasificacion', 'clasificacion', id_clasificacion);
           const idCategoria        = await obtenerOcrearFK(pool, 'categoria',     'categoria',     id_categoria);


        const [result] = await pool.query(
            `INSERT INTO insumos (
                fecha, temperatura, cantidad, salida, saldo, id_nombre_del_insumo, id_presentacion,
                id_laboratorio, id_proveedor, lote, fecha_de_vto, registro_invima, expediente_invima,
                id_clasificacion, estado_de_revision, salida_fecha, inicio, termino,
                lab_sas, factura, costo_global, costo, costo_prueba, costo_unidad, iva,
                consumible, mes_registro, id_categoria, usuarioId
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,

            [
                fecha, temperatura, cantidad, salida, saldo, idNombreDelInsumo, idPresentacion,
                idLaboratorio, idProveedor, lote, fecha_de_vto, registro_invima, expediente_invima,
                idClasificacion, estado_de_revision, salida_fecha, inicio, termino,
                lab_sas, factura, costo_global, costo, costo_prueba, costo_unidad, iva,
                consumible, mes_registro, idCategoria, usuarioId
            ]
        );

        const [usuarioResult] = await pool.query(
            'SELECT nombre FROM usuarios WHERE id_usuario = ?',
            [usuarioId]
        );
        const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre: 'Desconocido';
        await registrarAuditoria( 'insumos', result.insertId, 'creacion', 'Se creó un nuevo insumo', usuarioId, nombreUsuario);

         // Stock: siempre crear un registro nuevo, no actualizar
    const [productoRow] = await pool.query('SELECT nombre AS nombre_producto FROM nombre_del_insumo WHERE id_nombre_del_insumo = ?', [idNombreDelInsumo]);
    const nombre_producto = productoRow.length ? productoRow[0].nombre_producto : null;
    const cantidadNum = Number(cantidad);
    const laboId = Number(idLaboratorio);

    if (nombre_producto && cantidadNum > 0) {
      await pool.query(
        `INSERT INTO stock_inventario (nombre_producto, id_insumo, id_laboratorio, cantidad_actual, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [nombre_producto, result.insertId, laboId, cantidadNum]
      );
    }
    res.status(201).json({ message: 'Registro en insumo creado exitosamente!', id_insumo: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar insumos (con joins completos y filtros)
router.get('/buscar_insumos', async (req, res) => {
  const { q, nombre, laboratorio, lote, desde, hasta } = req.query;

  let condiciones = [];
  let valores = [];

  // Buscador único (q)
  if (q && q.trim() !== '') {
    const like = `%${q.trim()}%`;
    condiciones.push("(ni.nombre LIKE ? OR l.nombre LIKE ? OR i.lote LIKE ?)");
    valores.push(like, like, like);
  }

  // Filtros opcionales
  if (nombre) {
    condiciones.push("ni.nombre LIKE ?");
    valores.push(`%${nombre}%`);
  }

  if (laboratorio) {
    condiciones.push("l.nombre LIKE ?");
    valores.push(`%${laboratorio}%`);
  }

  if (lote) {
    condiciones.push("i.lote LIKE ?");
    valores.push(`%${lote}%`);
  }

  if (desde && hasta) {
    condiciones.push("i.fecha BETWEEN ? AND ?");
    valores.push(desde, hasta);
  } else if (desde) {
    condiciones.push("i.fecha >= ?");
    valores.push(desde);
  } else if (hasta) {
    condiciones.push("i.fecha <= ?");
    valores.push(hasta);
  }

  // Query con JOINs a todas las tablas relacionadas
  let sql = `
    SELECT
      i.id_insumo,
      i.fecha,
      i.temperatura,
      i.cantidad,
      i.salida,
      i.saldo,
      ni.nombre AS nombre_del_insumo,
      p.nombre  AS presentacion,
      l.nombre  AS laboratorio,
      pr.nombre AS proveedor,
      c.nombre  AS clasificacion,
      cat.nombre AS categoria,
      i.lote,
      i.fecha_de_vto,
      i.registro_invima,
      i.expediente_invima,
      i.estado_de_revision,
      i.salida_fecha,
      i.inicio,
      i.termino,
      i.lab_sas,
      i.factura,
      i.costo_global,
      i.costo,
      i.costo_prueba,
      i.costo_unidad,
      i.iva,
      i.consumible,
      i.mes_registro,
      i.usuarioId,
      u.nombre AS usuario_nombre
    FROM insumos i
    LEFT JOIN nombre_del_insumo ni ON i.id_nombre_del_insumo = ni.id_nombre_del_insumo
    LEFT JOIN presentacion p      ON i.id_presentacion = p.id_presentacion
    LEFT JOIN laboratorio l       ON i.id_laboratorio = l.id_laboratorio
    LEFT JOIN proveedor pr        ON i.id_proveedor = pr.id_proveedor
    LEFT JOIN clasificacion c     ON i.id_clasificacion = c.id_clasificacion
    LEFT JOIN categoria cat       ON i.id_categoria = cat.id_categoria
    LEFT JOIN usuarios u          ON i.usuarioId = u.id_usuario
  `;

  if (condiciones.length > 0) {
    sql += " WHERE " + condiciones.join(" AND ");
  }

  sql += " ORDER BY i.id_insumo DESC";

  try {
    const [rows] = await pool.query(sql, valores);
    res.json(rows);
  } catch (err) {
    console.error("Error en buscar_insumos:", err);
    res.status(500).json({ error: "Error al buscar en insumos" });
  }
});

// Alerta, fecha de vencimineto de insumos
router.get('/alerta_vencimineto_insumos', async (req, res)=>{
    const hoy = new Date();
    try{
        const [rows] = await pool.query(
            `SELECT i.id_insumo, i.fecha_de_vto, n.nombre 
             FROM insumos i
             JOIN nombre_del_insumo n ON i.id_nombre_del_insumo =  n.id_nombre_del_insumo `
            );
           const insumosVencidos = rows.filter(insumo => {
            const fechaVto = new Date(insumo.fecha_de_vto);
            const diferencia = (fechaVto - hoy) / (1000 * 60 * 60 * 24);
            return diferencia <= 7;
        });
        res.json({ alerta: insumosVencidos});
    }catch (error) {
        console.error(error);
        res.status(500).json({mensaje:'Error al obtener la alerta'});
    }
});

// Modificar insumo

function emptyToNull(val) {
   return val === undefined || val === null || (typeof val === 'string' && val.trim() === '') ? null : val;
 }
 router.put('/:id_insumo', async (req, res) => {
     const {
         fecha, temperatura, cantidad, salida, saldo, id_nombre_del_insumo, id_presentacion,
         id_laboratorio, id_proveedor, lote, fecha_de_vto, registro_invima, expediente_invima,
         id_clasificacion, estado_de_revision, salida_fecha, inicio, termino,
         lab_sas, factura, costo_global, costo, costo_prueba, costo_unidad, iva,
         consumible, mes_registro, id_categoria, usuarioId
     } = req.body;

     const { id_insumo } = req.params;

    
      //Validar formato de fecha
            const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!fecha || !fechaRegex.test(fecha)) {
            return res.status(400).json({ error: 'La fecha debe tener el formato YYYY-MM-DD' });
            }

            // Validar formato de fecha vto
            if (fecha_de_vto && !fechaRegex.test(fecha_de_vto)) {
             return res.status(400).json({ error: 'La fecha de vencimiento debe tener el formato YYYY-MM-DD' });
              }

            //Validar el nombre del inumo para que funcione el stock
              if (!id_nombre_del_insumo || (typeof id_nombre_del_insumo === "string" && id_nombre_del_insumo.trim() === "")) {
              return res.status(400).json({ error: "El nombre del insumo es obligatorio para que pueda funcionar el stock" });
              }
   
              //Validar  la cantidad para que funcione el stock
              if (
                 cantidad === undefined ||
                   cantidad === null ||
                  (typeof cantidad === 'string' && cantidad.trim() === '') ||
                   isNaN(Number(cantidad))
                  ) {
                   return res.status(400).json({ error: "La cantidad es obligatoria para que el stock pueda funcionar correctamente" });
                }
    
                const fkFields = {
                id_nombre_del_insumo: emptyToNull(id_nombre_del_insumo),
                id_presentacion: emptyToNull(id_presentacion),
                id_laboratorio: emptyToNull(id_laboratorio),
                id_proveedor: emptyToNull(id_proveedor),
                id_clasificacion: emptyToNull(id_clasificacion),
                id_categoria: emptyToNull(id_categoria),
            };

      try {
       // Leer registro viejo
    const [oldRows] = await pool.query('SELECT * FROM insumos WHERE id_insumo = ?', [id_insumo]);
    const oldInsumos = oldRows.length > 0 ? oldRows[0] : null;
    if (!oldInsumos) return res.status(404).json({ message: 'Insumo no encontrado con ese ID' });

      //Validar FK solo si no es null
     for (const [tabla, valor] of Object.entries(fkFields)) {
       if (valor !== null) {
          //el nombre de tabla en validarFKObligatorio no debe llevar "id_"
         const tablaSinId = tabla.replace(/^id_/, '');
         fkFields[tabla] = await obtenerOcrearFK(pool, tablaSinId, tablaSinId, valor);
       }
     }
         const [result] = await pool.query(
              `UPDATE insumos SET
                 fecha = ?, temperatura = ?, cantidad = ?, salida = ?, saldo = ?, id_nombre_del_insumo = ?, id_presentacion = ?,
                 id_laboratorio = ?, id_proveedor = ?, lote = ?, fecha_de_vto = ?, registro_invima = ?, expediente_invima = ?,
                 id_clasificacion = ?, estado_de_revision = ?, salida_fecha = ?, inicio = ?, termino = ?,
                 lab_sas = ?, factura = ?, costo_global = ?, costo = ?, costo_prueba = ?, costo_unidad = ?, iva = ?,
                 consumible = ?,mes_registro = ?, id_categoria = ?,  usuarioId = ? WHERE id_insumo = ?`,
            
                 [
                    fecha, temperatura, cantidad, salida, saldo,
         fkFields.id_nombre_del_insumo, fkFields.id_presentacion, fkFields.id_laboratorio, fkFields.id_proveedor,
         lote, fecha_de_vto, registro_invima, expediente_invima,
         fkFields.id_clasificacion, estado_de_revision, salida_fecha, inicio, termino,
        lab_sas, factura, costo_global, costo, costo_prueba, costo_unidad,
         iva, consumible, mes_registro, fkFields.id_categoria, usuarioId, id_insumo
      
                 ]
         );
         const [usuarioResult] = await pool.query(
             'SELECT nombre FROM usuarios WHERE id_usuario = ?',
             [usuarioId]
         );
        

         const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre: 'Desconocido';
         await registrarAuditoria( 'insumos', id_insumo, 'modificacion',  `Se modificó el insumo con ID ${id_insumo}`, usuarioId, nombreUsuario);

            //Notificar fecha de salida
        await procesarSalidas();
         if (result.affectedRows === 0) {
             return res.status(404).json({ message: 'Insumo no encontrado con ese ID' });
         }

        try {
  // --- Valores antiguos
  const oldCantidad = Number(oldInsumos?.cantidad || 0);
  const oldSalida = Number(oldInsumos?.salida || 0); 
  const oldIdNombre = oldInsumos?.id_nombre_del_insumo;
  const oldLab = oldInsumos?.id_laboratorio;
  const oldTerminoRaw = oldInsumos?.termino;

  // --- Valores nuevos (si no vienen, usar viejo)
  const newCantidad = (cantidad === undefined || cantidad === null || cantidad === '') ? oldCantidad : Number(cantidad);
  const newSalida = (salida === undefined || salida === null || salida === '') ? oldSalida : Number(salida);
  const newIdNombre = fkFields.id_nombre_del_insumo ?? oldIdNombre;
  const newLab = fkFields.id_laboratorio ?? oldLab;
  const newTerminoRaw = termino;

  // --- Helper para parsear fechas
  const parseDate = (v) => {
    if (!v) return null;
    const d = (v instanceof Date) ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const oldTerminoDate = parseDate(oldTerminoRaw);
  const newTerminoDate = parseDate(newTerminoRaw);

  // --- Obtener nombres legibles
  const [oldNameRow] = await pool.query(
    'SELECT nombre AS nombre_producto FROM nombre_del_insumo WHERE id_nombre_del_insumo = ?',
    [oldIdNombre]
  );
  const oldNombreProducto = oldNameRow.length ? oldNameRow[0].nombre_producto : null;

  const [newNameRow] = await pool.query(
    'SELECT nombre AS nombre_producto FROM nombre_del_insumo WHERE id_nombre_del_insumo = ?',
    [newIdNombre]
  );
  const newNombreProducto = newNameRow.length ? newNameRow[0].nombre_producto : null;

    // --- Normalización 
  const oldNombreClean = oldNombreProducto ? oldNombreProducto.trim().toUpperCase() : null;
  const newNombreClean = newNombreProducto ? newNombreProducto.trim().toUpperCase() : null;

  // --- Leer la fila de stock correspondiente
  const [stockRows] = await pool.query(
    'SELECT * FROM stock_inventario WHERE id_insumo = ? LIMIT 1',
    [id_insumo]
  );
  let stockRow = stockRows.length ? stockRows[0] : null;

  const diffCantidad = newCantidad - oldCantidad; 
  const diffSalida   = newSalida - oldSalida; 
   
  if (stockRow) { 
    // Actualizar cantidad con cantidad y salida 
    const nuevaCantidadActual = stockRow.cantidad_actual + diffCantidad - diffSalida; 
    if (nuevaCantidadActual <= 0) { 
      await pool.query( 
        'DELETE FROM stock_inventario WHERE id_stock_inventario = ?', 
        [stockRow.id_stock_inventario] 
      ); 
    } else { 
      await pool.query( 
        'UPDATE stock_inventario SET cantidad_actual = ?, updatedAt = NOW() WHERE id_stock_inventario = ?', 
        [nuevaCantidadActual, stockRow.id_stock_inventario] 
      ); 
    } 
  } else { 
    // Crear fila nueva si no existía 
    const cantidadInicial = newCantidad - newSalida; 
    await pool.query( 
      'INSERT INTO stock_inventario (id_insumo, nombre_producto, id_laboratorio, cantidad_actual, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())', 
      [id_insumo, newNombreProducto, newLab, cantidadInicial] 
    ); 
  } 

  // --- Helper para normalizar fecha "YYYY-MM-DD"
  const toYMD = (v) => {
    if (!v) return null;
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const todayYMD = toYMD(new Date());
  const terminoYMD = toYMD(newTerminoRaw);

  // --- Solo si hay fecha de término y stockRow
  if (terminoYMD && stockRow) {
    // Si la fecha de término es hoy, eliminar stock
    if (terminoYMD === todayYMD) {
      await pool.query(
        'DELETE FROM stock_inventario WHERE id_stock_inventario = ?',
        [stockRow.id_stock_inventario]
      );
    }
  }
   // --- Actualizar salida y cantidad en Kardex 
  await pool.query( 
    'UPDATE insumos SET cantidad = ?, salida = ? WHERE id_insumo = ?', 
    [newCantidad, newSalida, id_insumo] 
  ); 

} catch (errAdjust) {
  console.error('ERROR ajustando stock en PUT:', errAdjust);
}

res.json({ message: 'Registro actualizado exitosamente', result });
} catch (error) {
  res.status(500).json({ error: error.message });
}
});

 // Buscar un insumo por ID (con joins y nombres descriptivos)
router.get('/:id_insumo', async (req, res) => {
  const { id_insumo } = req.params;
  try {
    const [result] = await pool.query(
      `
      SELECT
        i.id_insumo,
        i.fecha,
        i.temperatura,
        i.cantidad,
        i.salida,
        i.saldo,

        -- Nombres en lugar de IDs
        ni.nombre       AS nombre_del_insumo,
        p.nombre        AS presentacion,
        l.nombre        AS laboratorio,
        pr.nombre       AS proveedor,
        c.nombre        AS clasificacion,
        cat.nombre      AS categoria,

        i.lote,
        i.fecha_de_vto,
        i.registro_invima,
        i.expediente_invima,
        i.estado_de_revision,
        i.salida_fecha,
        i.inicio,
        i.termino,
        i.lab_sas,
        i.factura,
        i.costo_global,
        i.costo,
        i.costo_prueba,
        i.costo_unidad,
        i.iva,
        i.consumible,
        i.mes_registro,

        -- Usuario: id y nombre
        u.id_usuario    AS usuario_id,
        u.nombre        AS usuario_nombre

      FROM insumos i
      LEFT JOIN nombre_del_insumo ni ON i.id_nombre_del_insumo = ni.id_nombre_del_insumo
      LEFT JOIN presentacion      p  ON i.id_presentacion      = p.id_presentacion
      LEFT JOIN laboratorio       l  ON i.id_laboratorio       = l.id_laboratorio
      LEFT JOIN proveedor         pr ON i.id_proveedor         = pr.id_proveedor
      LEFT JOIN clasificacion     c  ON i.id_clasificacion     = c.id_clasificacion
      LEFT JOIN categoria         cat ON i.id_categoria        = cat.id_categoria
      LEFT JOIN usuarios          u  ON i.usuarioId            = u.id_usuario
      WHERE i.id_insumo = ?
      `,
      [id_insumo]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se puede encontrar el insumo con el ID proporcionado.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Insumo encontrado correctamente.',
      data: result[0]
    });
  } catch (error) {
    console.error("Error en /:id_insumo:", error);
    res.status(500).json({
      success: false,
      message: 'Hubo un problema al obtener el insumo.',
      error: error.message
    });
  }
});

// Obtener todos los insumos con nombres (no IDs)
router.get('/', async (req, res) => {
  try {
    const [insumos] = await pool.query(`
      SELECT
        i.id_insumo,
        i.fecha,
        i.temperatura,
        i.cantidad,
        i.salida,
        i.saldo,

        -- Nombres en lugar de IDs
        ni.nombre   AS nombre_del_insumo,
        p.nombre    AS presentacion,
        l.nombre    AS laboratorio,
        pr.nombre   AS proveedor,
        c.nombre    AS clasificacion,
        cat.nombre  AS categoria,

        i.lote,
        i.fecha_de_vto,
        i.registro_invima,
        i.expediente_invima,
        i.estado_de_revision,
        i.salida_fecha,
        i.inicio,
        i.termino,
        i.lab_sas,
        i.factura,
        i.costo_global,
        i.costo,
        i.costo_prueba,
        i.costo_unidad,
        i.iva,
        i.consumible,
        i.mes_registro,

        -- Usuario: ID y nombre
        u.id_usuario AS usuario_id,
        u.nombre     AS usuario_nombre

      FROM insumos i
      LEFT JOIN nombre_del_insumo ni ON i.id_nombre_del_insumo = ni.id_nombre_del_insumo
      LEFT JOIN presentacion      p  ON i.id_presentacion      = p.id_presentacion
      LEFT JOIN laboratorio       l  ON i.id_laboratorio       = l.id_laboratorio
      LEFT JOIN proveedor         pr ON i.id_proveedor         = pr.id_proveedor
      LEFT JOIN clasificacion     c  ON i.id_clasificacion     = c.id_clasificacion
      LEFT JOIN categoria         cat ON i.id_categoria        = cat.id_categoria
      LEFT JOIN usuarios          u  ON i.usuarioId            = u.id_usuario
      ORDER BY i.id_insumo DESC
    `);

    res.json(insumos);
  } catch (error) {
    console.error("Error en GET /insumos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un insumo
router.delete('/:id_insumo', async (req, res) => {
  const { id_insumo } = req.params;
  const { usuarioId } = req.body;

  try {
    // 1) Obtener insumo a eliminar
    const [insumos] = await pool.query('SELECT * FROM insumos WHERE id_insumo = ?', [id_insumo]);
    if (insumos.length === 0) {
      return res.status(404).json({ success: false, message: 'No existe un registro con ese ID de insumo' });
    }

    const insumo = insumos[0];
    const cantidad = Number(insumo.cantidad || 0);
    const idNombre = insumo.id_nombre_del_insumo;
    const idLab = insumo.id_laboratorio;

    // 2) Obtener nombre legible del insumo
    const [nameRows] = await pool.query(
      'SELECT nombre AS nombre_producto FROM nombre_del_insumo WHERE id_nombre_del_insumo = ?',
      [idNombre]
    );
    const nombreProducto = nameRows.length ? nameRows[0].nombre_producto : null;

    if (nombreProducto) {
      // 3) Ver cuántos registros de stock hay para este producto
      const [stockRows] = await pool.query(
        'SELECT * FROM stock_inventario WHERE nombre_producto = ? AND id_laboratorio = ? ORDER BY id_stock_inventario ASC',
        [nombreProducto, idLab]
      );

      if (stockRows.length === 1) {
        // Si solo hay un registro de stock, eliminarlo también
    
        await pool.query('DELETE FROM stock_inventario WHERE nombre_producto = ? AND id_laboratorio = ?', [nombreProducto, idLab]);
      }
      // Si hay más de uno, no hacemos nada, el stock restante sigue intacto
    }

    // 4) Eliminar insumo
    await pool.query('DELETE FROM insumos WHERE id_insumo = ?', [id_insumo]);

    // 5) Auditoría
    const [usuarioResult] = await pool.query('SELECT nombre FROM usuarios WHERE id_usuario = ?', [usuarioId]);
    const nombreUsuario = usuarioResult.length ? usuarioResult[0].nombre : 'Desconocido';

    await registrarAuditoria(
      'insumos',
      id_insumo,
      'eliminación',
      `Se eliminó el insumo con ID ${id_insumo}`,
      usuarioId,
      nombreUsuario
    );

    res.status(202).json({ success: true, message: 'Insumo eliminado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Hubo un problema al intentar eliminar el insumo', error: error.message });
  }
});

module.exports = router;










