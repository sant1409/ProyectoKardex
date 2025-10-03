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

// Crear kardex
router.post('/', async (req, res) => {

    try {
        console.log("DEBUG req.body recibido:", req.body);
      const {
        fecha_recepcion, temperatura_llegada, maximo, minimo, cantidad, salida, saldo, id_nombre_insumo,
        id_presentacion_k, id_casa_comercial, id_proveedor_k, lote, fecha_vencimiento, registro_invima, expediente_invima,
        estado_revision, temperatura_almacenamiento, id_clasificacion_riesgo, principio_activo, forma_farmaceutica,
        concentracion, unidad_medida, fecha_salida, fecha_inicio, fecha_terminacion, area, factura,
        costo_general, costo_caja, costo_prueba, iva, consumible, mes_registro,	lab_sas,	 usuarioId
    } = req.body;
        
     
    //Validar formato fecha 
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!fecha_recepcion || !fechaRegex.test(fecha_recepcion)) {
            return res.status(400).json({ error: 'La fecha de recepción debe tener el formato YYYY-MM-DD' });
    }

      //Validar formato fecha vto
      if (!fecha_vencimiento || ! fechaRegex.test(fecha_vencimiento)) {
                return res.status(400).json({errror:  'La fecha de vencimineto debe tener el formato YYYY-MM-DD'})
            }

        // Validar lab/ sas

        if (!["lab", "sas"].includes(lab_sas)) {
            return res.status(400).json({error: "El campo solo puede ser 'lab' o 'sas'."});
        }

         //Validar nombre del reactivo para que el stock funcione correctamente
         if (!id_nombre_insumo || (typeof id_nombre_insumo === "string" && id_nombre_insumo.trim() === "")) {
              return res.status(400).json({ error: "El nombre del reactivo es obligatorio para que stock funcione correctamente" });
              }

          //Validar cantidad para que el stock funcione correctamente
         if (
             cantidad === undefined ||
             cantidad === null ||
              (typeof cantidad === 'string' && cantidad.trim() === '') ||
              isNaN(Number(cantidad))
            ) {
            return res.status(400).json({ error: "La cantidad es obligatoria para que el stock pueda funcionar correctamente" });
            }

        // Validar o crear FK (acepta ID o nombre nuevo)
        const idNombreInsumo = await obtenerOcrearFK(pool, 'nombre_insumo', 'nombre_insumo', id_nombre_insumo);
        const idPresentacion = await obtenerOcrearFK(pool, 'presentacion_k', 'presentacion_k', id_presentacion_k);
        const idCasacomercial = await obtenerOcrearFK(pool, 'casa_comercial', 'casa_comercial', id_casa_comercial);
        const idProveedor = await obtenerOcrearFK(pool, 'proveedor_k', 'proveedor_k', id_proveedor_k);
        const idClasificacionRiesgo = await obtenerOcrearFK(pool, 'clasificacion_riesgo', 'clasificacion_riesgo', id_clasificacion_riesgo);



        const [result] = await pool.query(
            `INSERT INTO kardex (
                fecha_recepcion, temperatura_llegada, maximo, minimo, cantidad, salida, saldo, id_nombre_insumo,
                id_presentacion_k, id_casa_comercial, id_proveedor_k, lote, fecha_vencimiento, registro_invima, expediente_invima,
                estado_revision, temperatura_almacenamiento, id_clasificacion_riesgo, principio_activo, forma_farmaceutica,
                concentracion, unidad_medida, fecha_salida, fecha_inicio, fecha_terminacion, area, factura,
                costo_general, costo_caja, costo_prueba, iva, consumible, mes_registro,	lab_sas, usuarioId
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?)`,
            [
                fecha_recepcion, temperatura_llegada, maximo, minimo, cantidad, salida, saldo, idNombreInsumo,
                idPresentacion, idCasacomercial, idProveedor, lote, fecha_vencimiento, registro_invima, expediente_invima,
                estado_revision, temperatura_almacenamiento, idClasificacionRiesgo, principio_activo, forma_farmaceutica,
                concentracion, unidad_medida, fecha_salida, fecha_inicio, fecha_terminacion, area, factura,
                costo_general, costo_caja, costo_prueba, iva, consumible, mes_registro,	lab_sas,	 usuarioId
            ]
        );
        const [usuarioResult] = await pool.query(
            'SELECT nombre FROM usuarios WHERE id_usuario = ?',
            [usuarioId]
        );

        const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre: 'Desconocido';
        const idUsuario = req.body.usuarioId;

        await registrarAuditoria('kardex', result.insertId, 'creo', `Se creó el kardex con ID ${result.insertId}`, usuarioId,  nombreUsuario);

       // Obtener nombre del producto desde nombre_insumo
       const [productoRow] = await pool.query('SELECT nombre AS nombre_producto FROM nombre_insumo WHERE id_nombre_insumo = ?',[idNombreInsumo]);
       const nombre_producto = productoRow.length > 0 ? productoRow[0].nombre_producto : null;
       // Forzar valores numéricos
       const cantidadNum = Number(cantidad);
       const casaId = Number(idCasacomercial);

       if (nombre_producto && cantidadNum > 0) {
          await pool.query(
            `INSERT INTO stock_inventario (nombre_producto, id_kardex, id_casa_comercial, cantidad_actual, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, NOW(), NOW())`,
            [nombre_producto, result.insertId, casaId, cantidadNum]
      );
    }
        res.status(201).json({ message: 'Registro en kardex creado exitosamente!', id_kardex: result.insertId });
         } catch (error) {
            res.status(500).json({ error: error.message });
   }
});

// Buscar kardex (con joins completos y filtros)
router.get('/buscar_kardex', async (req, res) => {
  const { q, nombre, casa_comercial, lote, desde, hasta } = req.query;

  let condiciones = [];
  let valores = [];

  // Buscador único (q)
  if (q && q.trim() !== '') {
    const like = `%${q.trim()}%`;
    condiciones.push("(ni.nombre LIKE ? OR cc.nombre LIKE ? OR k.lote LIKE ?)");
    valores.push(like, like, like);
  }

  // Filtros opcionales
  if (nombre) {
    condiciones.push("ni.nombre LIKE ?");
    valores.push(`%${nombre}%`);
  }

  if (casa_comercial) {
    condiciones.push("cc.nombre LIKE ?");
    valores.push(`%${casa_comercial}%`);
  }

  if (lote) {
    condiciones.push("k.lote LIKE ?");
    valores.push(`%${lote}%`);
  }

  if (desde && hasta) {
    condiciones.push("k.fecha_recepcion BETWEEN ? AND ?");
    valores.push(desde, hasta);
  } else if (desde) {
    condiciones.push("k.fecha_recepcion >= ?");
    valores.push(desde);
  } else if (hasta) {
    condiciones.push("k.fecha_recepcion <= ?");
    valores.push(hasta);
  }

  // Query con todos los JOINs necesarios
  let sql = `
    SELECT
      k.id_kardex,
      k.fecha_recepcion,
      k.temperatura_llegada,
      k.maximo,
      k.minimo,
      k.cantidad,
      k.salida,
      k.saldo,
      ni.nombre AS nombre_insumo,
      p.nombre AS presentacion_k,
      cc.nombre AS casa_comercial,
      pr.nombre AS proveedor,
      cr.nombre AS clasificacion_riesgo,
      k.lote,
      k.fecha_vencimiento,
      k.registro_invima,
      k.expediente_invima,
      k.estado_revision,
      k.temperatura_almacenamiento,
      k.principio_activo,
      k.forma_farmaceutica,
      k.concentracion,
      k.unidad_medida,
      k.fecha_salida,
      k.fecha_inicio,
      k.fecha_terminacion,
      k.area,
      k.factura,
      k.costo_general,
      k.costo_caja,
      k.costo_prueba,
      k.iva,
      k.consumible,
      k.mes_registro,
      k.lab_sas,
      k.usuarioId AS usuario_id,
      u.nombre AS usuario_nombre
    FROM kardex k
    LEFT JOIN nombre_insumo ni ON k.id_nombre_insumo = ni.id_nombre_insumo
    LEFT JOIN presentacion_k p ON k.id_presentacion_k = p.id_presentacion_k
    LEFT JOIN casa_comercial cc ON k.id_casa_comercial = cc.id_casa_comercial
    LEFT JOIN proveedor_k pr ON k.id_proveedor_k = pr.id_proveedor_k
    LEFT JOIN clasificacion_riesgo cr ON k.id_clasificacion_riesgo = cr.id_clasificacion_riesgo
    LEFT JOIN usuarios u ON k.usuarioId = u.id_usuario
  `;

  if (condiciones.length > 0) {
    sql += " WHERE " + condiciones.join(" AND ");
  }

  sql += " ORDER BY k.id_kardex DESC";

  try {
    const [rows] = await pool.query(sql, valores);
    res.json(rows);
  } catch (err) {
    console.error("Error en buscar_kardex:", err);
    res.status(500).json({ error: "Error al buscar en el kardex" });
  }
});

// Alerta, fecha de vencimineto de kardex
router.get('/alerta_vencimineto_kardex', async (req, res)=>{
    const hoy = new Date();
     try{
        const [rows] = await pool.query(
            `SELECT k.id_kardex, k.fecha_vencimiento, n.nombre 
             FROM kardex k
             JOIN nombre_insumo n ON k.id_nombre_insumo =  n.id_nombre_insumo `
            );
        const insumosVencidos = rows.filter(insumo => {
            const fechaVto = new Date(insumo.fecha_vencimiento);
            const diferencia = (fechaVto - hoy) / (1000*60*24);
            return diferencia <= 7;
        });

        res.json({ alerta: insumosVencidos});
    }catch (error) {
        console.error(error);
        res.status(500).json({mensaje:'Error al obtener la alerta'});
    }
});

// Modificar kardex
function emptyToNull(val) {
   return val === undefined || val === null || (typeof val === 'string' && val.trim() === '') ? null : val;
 }

router.put('/:id_kardex', async (req, res) => {
    const {

        fecha_recepcion, temperatura_llegada, maximo, minimo, cantidad, salida, saldo, id_nombre_insumo,
        id_presentacion_k, id_casa_comercial, id_proveedor_k, lote, fecha_vencimiento, registro_invima, expediente_invima,
        estado_revision, temperatura_almacenamiento, id_clasificacion_riesgo, principio_activo, forma_farmaceutica,
        concentracion, unidad_medida, fecha_salida, fecha_inicio, fecha_terminacion, area, factura,
        costo_general, costo_caja, costo_prueba, iva, consumible, mes_registro,	lab_sas,  usuarioId
    } = req.body;

    const { id_kardex } = req.params;
    
    //validar el formato fecha
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fecha_recepcion || !fechaRegex.test(fecha_recepcion)) {
        return res.status(400).json({ error: 'La fecha de recepción debe tener el formato YYYY-MM-DD' });
    }

    //Validar fecha vto
     if (!fecha_vencimiento || ! fechaRegex.test(fecha_vencimiento)) {
        return res.status(400).json({errror:  'La fecha de vencimineto debe tener el formato YYYY-MM-DD'})
            }

     // Validar lab/ sas

        if (!["lab", "sas"].includes(lab_sas)) {
            return res.status(400).json({error: "El campo solo puede ser 'lab' o 'sas'."});
        }
         
         //Validar el campo reactivo 
         if (!id_nombre_insumo || (typeof id_nombre_insumo === "string" && id_nombre_insumo.trim() === "")) {
              return res.status(400).json({ error: "El nombre del reactivo es obligatorio" });
              }

     const fkFields = {
     id_nombre_insumo: emptyToNull(id_nombre_insumo),
     id_presentacion_k: emptyToNull(id_presentacion_k),
     id_casa_comercial: emptyToNull(id_casa_comercial),
     id_proveedor_k: emptyToNull(id_proveedor_k),
     id_clasificacion_riesgo: emptyToNull(id_clasificacion_riesgo)
   };

      try { 
        // --- BLOQUE A: leer registro viejo (para comparar después)
         const [oldRows] = await pool.query('SELECT * FROM kardex WHERE id_kardex = ?', [id_kardex]);
         const oldKardex = oldRows.length > 0 ? oldRows[0] : null;
         if (!oldKardex) return res.status(404).json({ message: 'Reactivo no encontrado con ese ID' });

      //Validar FK solo si no es null
     for (const [tabla, valor] of Object.entries(fkFields)) {
       if (valor !== null) {
          //el nombre de tabla en validarFKObligatorio no debe llevar "id_"
         const tablaSinId = tabla.replace(/^id_/, '');

         fkFields[tabla] = await obtenerOcrearFK(pool, tablaSinId, tablaSinId, valor);
       }
     }
        const [result] = await pool.query(
            `UPDATE kardex SET
                fecha_recepcion = ?, temperatura_llegada = ?, maximo = ?, minimo = ?, cantidad = ?, salida = ?, saldo = ?, id_nombre_insumo = ?,
                id_presentacion_k = ?, id_casa_comercial = ?, id_proveedor_k = ?, lote = ?, fecha_vencimiento = ?, registro_invima = ?, expediente_invima = ?,
                estado_revision = ?, temperatura_almacenamiento = ?, id_clasificacion_riesgo = ?, principio_activo = ?, forma_farmaceutica = ?,
                concentracion = ?, unidad_medida = ?, fecha_salida = ?, fecha_inicio = ?, fecha_terminacion = ?, area = ?, factura = ?,
                costo_general = ?, costo_caja = ?, costo_prueba = ?, iva = ?, consumible = ?, mes_registro = ?,	lab_sas = ?,	 usuarioId = ? WHERE id_kardex = ?`,
            [
                fecha_recepcion, temperatura_llegada, maximo, minimo, cantidad, salida, saldo, fkFields.id_nombre_insumo,
                fkFields.id_presentacion_k, fkFields.id_casa_comercial, fkFields.id_proveedor_k, lote, fecha_vencimiento, registro_invima, expediente_invima,
                estado_revision, temperatura_almacenamiento, fkFields.id_clasificacion_riesgo, principio_activo, forma_farmaceutica,
                concentracion, unidad_medida, fecha_salida, fecha_inicio, fecha_terminacion, area, factura,
                costo_general, costo_caja, costo_prueba, iva, consumible,  mes_registro,	lab_sas,	usuarioId,  id_kardex
            ]
        );
             const [usuarioResult ] = await pool.query(
                   'SELECT nombre FROM usuarios WHERE id_usuario = ?',
                   [usuarioId]
            );
             const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre: 'Desconocido';
             await registrarAuditoria('kardex', id_kardex, 'modifico', `Se modifico el kardex con ID ${id_kardex}`, usuarioId, nombreUsuario)

                 
         //Notificar fecha de salida
         await procesarSalidas();
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Registro no encontrado con ese ID' });
        }
        
         try { 
  // --- Valores antiguos 
  const oldCantidad = Number(oldKardex?.cantidad || 0); 
  const oldSalida = Number(oldKardex?.salida || 0); 
  const oldIdNombre = oldKardex?.id_nombre_insumo; 
  const oldCasa = oldKardex?.id_casa_comercial; 
  const oldFechaTermRaw = oldKardex?.fecha_terminacion; 
  
  // --- Valores nuevos (si no vienen, usar viejo) 
  const newCantidad = (cantidad === undefined || cantidad === null || cantidad === '') ? oldCantidad: Number(cantidad); 
  const newSalida = (salida === undefined || salida === null || salida === '') ? oldSalida : Number(salida); 
  const newIdNombre = fkFields.id_nombre_insumo ?? oldIdNombre; 
  const newCasa = fkFields.id_casa_comercial ?? oldCasa; 
  const newFechaTermRaw = fecha_terminacion 
  
  // --- Helper para parsear fechas 
  const parseDate = (v) => { 
    if (!v) return null; 
    const d = (v instanceof Date) ? v : new Date(v); 
    return isNaN(d.getTime()) ? null : d; 
  }; 
  
  const oldDate = parseDate(oldFechaTermRaw); 
  const newTerminoDate = parseDate(newFechaTermRaw); 
  
  // --- Obtener nombres legibles 
  const [oldNameRow] = await pool.query( 
    'SELECT nombre AS nombre_producto FROM nombre_insumo WHERE id_nombre_insumo = ?', 
    [oldIdNombre] 
  ); 
  const oldNombreProducto = oldNameRow.length ? oldNameRow[0].nombre_producto : null; 
  
  const [newNameRow] = await pool.query( 
    'SELECT nombre AS nombre_producto FROM nombre_insumo WHERE id_nombre_insumo = ?', 
    [newIdNombre] 
  ); 
  const newNombreProducto = newNameRow.length ? newNameRow[0].nombre_producto : null; 
  
  // --- Normalización 
  const oldNombreClean = oldNombreProducto ? oldNombreProducto.trim().toUpperCase() : null; 
  const newNombreClean = newNombreProducto ? newNombreProducto.trim().toUpperCase() : null; 
  
  // --- Leer la fila de stock correspondiente 
  const [stockRows] = await pool.query( 
    'SELECT * FROM stock_inventario WHERE id_kardex = ? LIMIT 1', 
    [id_kardex] 
  ); 
  
  let stockRow = stockRows.length ? stockRows[0] : null; 
  // --- Diferencias 
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
      'INSERT INTO stock_inventario (id_kardex, nombre_producto, id_casa_comercial, cantidad_actual, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())', 
      [id_kardex, newNombreProducto, newCasa, cantidadInicial] 
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
  const terminoYMD = toYMD(newFechaTermRaw); 
   
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
    'UPDATE kardex SET cantidad = ?, salida = ? WHERE id_kardex = ?', 
    [newCantidad, newSalida, id_kardex] 
  ); 
} catch (errAdjust) { 
  console.error('ERROR ajustando stock en PUT:', errAdjust); 
} 
 
res.json({ message: 'Registro actualizado exitosamente', result }); 
 
} catch (error) { 
  res.status(500).json({ error: error.message }); 
} 
}); 



// Buscar un kardex por ID (con nombres en lugar de IDs)
router.get('/:id_kardex', async (req, res) => {
  const { id_kardex } = req.params;
  try {
    const [result] = await pool.query(
      `
      SELECT
  k.id_kardex,
  k.fecha_recepcion,
  k.temperatura_llegada,
  k.maximo,
  k.minimo,
  k.cantidad,
  k.salida,
  k.saldo,

  -- Nombres en lugar de IDs
  ni.nombre  AS nombre_insumo,
  pk.nombre  AS presentacion,
  cc.nombre  AS casa_comercial,
  pr.nombre  AS proveedor,
  cr.nombre  AS clasificacion_riesgo,

  k.lote,
  k.fecha_vencimiento,
  k.registro_invima,
  k.expediente_invima,
  k.estado_revision,
  k.temperatura_almacenamiento,
  k.principio_activo,
  k.forma_farmaceutica,
  k.concentracion,
  k.unidad_medida,
  k.fecha_salida,
  k.fecha_inicio,
  k.fecha_terminacion,
  k.area,
  k.factura,
  k.costo_general,
  k.costo_caja,
  k.costo_prueba,
  k.iva,
  k.consumible,
  k.mes_registro,
  k.lab_sas,

  -- Usuario: devuelvo ID y nombre
  u.id_usuario AS usuario_id,
  u.nombre     AS usuario_nombre

FROM kardex k
LEFT JOIN nombre_insumo       ni ON k.id_nombre_insumo       = ni.id_nombre_insumo
LEFT JOIN presentacion_k      pk ON k.id_presentacion_k      = pk.id_presentacion_k
LEFT JOIN casa_comercial      cc ON k.id_casa_comercial      = cc.id_casa_comercial
LEFT JOIN proveedor_k         pr ON k.id_proveedor_k         = pr.id_proveedor_k
LEFT JOIN clasificacion_riesgo cr ON k.id_clasificacion_riesgo = cr.id_clasificacion_riesgo
LEFT JOIN usuarios            u  ON k.usuarioId              = u.id_usuario
WHERE k.id_kardex = ?;
      `,
      [id_kardex]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se puede encontrar el registro con el ID proporcionado.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Registro encontrado correctamente.',
      data: result[0]
    });
  } catch (error) {
     console.error("Error en /:id_kardex:", error);
    res.status(500).json({
      success: false,
      message: 'Hubo un problema al obtener el registro.',
      error: error.message
    });
  }
});

// Obtener todos los registros de kardex con nombres (no IDs)
router.get('/', async (req, res) => {
  try {
    const [registros] = await pool.query(`
      SELECT
        k.id_kardex,
        k.fecha_recepcion,
        k.temperatura_llegada,
        k.maximo,
        k.minimo,
        k.cantidad,
        k.salida,
        k.saldo,
        -- Nombres en lugar de IDs
        ni.nombre  AS nombre_insumo,
        pk.nombre  AS presentacion,
        cc.nombre  AS casa_comercial,
        pr.nombre  AS proveedor,
        cr.nombre  AS clasificacion_riesgo,
        k.lote,
        k.fecha_vencimiento,
        k.registro_invima,
        k.expediente_invima,
        k.estado_revision,
        k.temperatura_almacenamiento,
        k.principio_activo,
        k.forma_farmaceutica,
        k.concentracion,
        k.unidad_medida,
        k.fecha_salida,
        k.fecha_inicio,
        k.fecha_terminacion,
        k.area,
        k.factura,
        k.costo_general,
        k.costo_caja,
        k.costo_prueba,
        k.iva,
        k.consumible,
        k.mes_registro,
        k.lab_sas,

        -- Usuario: devuelvo ID y nombre
        u.id_usuario    AS usuario_id,
        u.nombre        AS usuario_nombre

      FROM kardex k
      LEFT JOIN nombre_insumo   ni ON k.id_nombre_insumo   = ni.id_nombre_insumo
      LEFT JOIN presentacion_k  pk ON k.id_presentacion_k  = pk.id_presentacion_k
      LEFT JOIN casa_comercial  cc ON k.id_casa_comercial  = cc.id_casa_comercial
      LEFT JOIN proveedor_k     pr ON k.id_proveedor_k     = pr.id_proveedor_k
      LEFT JOIN clasificacion_riesgo cr ON k.id_clasificacion_riesgo = cr.id_clasificacion_riesgo
      LEFT JOIN usuarios        u  ON k.usuarioId          = u.id_usuario
      ORDER BY k.id_kardex DESC
    `);

    res.json(registros);
  } catch (error) {
    console.error("Error en GET /kardex:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un registro del kardex
router.delete('/:id_kardex', async (req, res) => {
  const { id_kardex } = req.params;
  const { usuarioId } = req.body;

  try {
    // 1) Obtener el kardex antes de eliminar
     const [kardex] = await pool.query('SELECT * FROM kardex WHERE id_kardex = ?', [id_kardex]);
    if (kardex.length === 0) {
      return res.status(404).json({ success: false, message: 'No existe un registro con ese ID de reactivo' });
    }

    const reactivo = kardex[0];
    const cantidad = Number(reactivo.cantidad || 0);
    const idNombre = reactivo.id_nombre_insumo;
    const idCasa = reactivo.id_casa_comercial;


    // 2) Obtener nombre legible del insumo
    const [nameRows] = await pool.query(
      'SELECT nombre AS nombre_producto FROM nombre_insumo WHERE id_nombre_insumo = ?',
      [idNombre]
    );
    const nombreProducto = nameRows.length > 0 ? nameRows[0].nombre_producto : null;
    
    if (nombreProducto) {
    // 3) Ver cuántos registros de stock hay para este producto
    const [stockRows] = await pool.query(
        'SELECT * FROM stock_inventario WHERE nombre_producto = ? AND id_casa_comercial = ? ORDER BY id_stock_inventario ASC',
      [nombreProducto, idCasa]
    );

       if (stockRows.length === 1) {
        // Si solo hay un registro de stock, eliminarlo también
    
        await pool.query('DELETE FROM stock_inventario WHERE nombre_producto = ? AND id_casa_comercial = ?', [nombreProducto, idCasa]);
      }
      // Si hay más de uno, no hacemos nada, el stock restante sigue intacto
    }

    // 4) Eliminar insumo
    await pool.query('DELETE FROM kardex WHERE id_kardex = ?', [id_kardex]);

    // 5) Auditoría
    const [usuarioResult] = await pool.query('SELECT nombre FROM usuarios WHERE id_usuario = ?', [usuarioId]);
    const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre : 'Desconocido';

    await registrarAuditoria(
      'kardex',
      id_kardex,
      'elimino',
      `Se eliminó el kardex con ID ${id_kardex}`,
      usuarioId,
      nombreUsuario
    );

    res.status(202).json({success: true,message: 'Registro eliminado y stock ajustado correctamente.'});
  } catch (error) {
    console.error(error);
    res.status(500).json({success: false, message: 'Hubo un problema al intentar eliminar el registro',error: error.message});
  }
});



module.exports = router;

