const express = require('express');
const router = express.Router();
const pool = require('../db');
const { registrarAuditoria } = require('../utils/auditoria');



// Funcion que permite registrar  los campos de la foreing key en null 
async function validarFKObligatorio(pool, tabla, id) {
    if (!id || id  === '') return null;
    
    if (isNaN(Number (id)) || Number(id) <= 0) {
        throw new Error(`El id de ${tabla} no es valido.`);

    }

    const [rows] = await pool.query(
        `SELECT 1 FROM ${tabla} WHERE id_${tabla} = ? LIMIT 1 `,
        [id]
    );

    if (rows.length === 0 ) {
        throw new Error(`El id ${id} de ${tabla} no existe.`);
    }

    return Number(id);
}
// Crear kardex
router.post('/', async (req, res) => {

    try {

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

      

            //  Validar fk con la nueva funcion

            const idNombreInsumo = await validarFKObligatorio(pool, 'nombre_del_insumo', id_nombre_insumo);
            const idPresentacion = await validarFKObligatorio(pool, 'presentacion', id_presentacion_k);
            const idCasacomercial = await validarFKObligatorio(pool, 'laboratorio', id_casa_comercial);
            const idProveedor = await validarFKObligatorio(pool, 'proveedor', id_proveedor_k);
            const idClasificacionRiesgo = await validarFKObligatorio(pool, 'clasificacion', id_clasificacion_riesgo);

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

        await registrarAuditoria( 'kardex', result.insertId, 'creacion', 'Se creó un nuevo kardex', usuarioId, nombreUsuario);

        res.status(201).json({ message: 'Registro en kardex creado exitosamente!', id_kardex: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//buscar kardex por nombre, casa_comercial, fecha, lote

router.get('/buscar_kardex', async (req, res) => {
    const { nombre, casa_comercial, desde, hasta, lote } = req.query;
    
    let condiciones = [];
    let valores = [];

    if (nombre) {
        condiciones.push("id_nombre_insumo LIKE ?");
        valores.push(`%${nombre}%`);
    }

    if (casa_comercial) {
        condiciones.push("id_casa_comercial LIKE ?");
        valores.push(`%${casa_comercial}%`);
    }

    if (lote) {
        condiciones.push("lote = ?");
        valores.push(lote);
    }

    if (desde && hasta) {
        condiciones.push("DATE(fecha_recepcion) BETWEEN ? AND ?");
        valores.push(desde, hasta);
    }

    let sql = "SELECT * FROM kardex";
    if (condiciones.length > 0) {
        sql += " WHERE " + condiciones.join(" AND ");
    }

    console.log("Consulta generada:", sql);
    console.log("Valores:", valores);

    try {
        const [result] = await pool.query(sql, valores);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el kardex' });
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


     const fkFields = {
     id_nombre_insumo: emptyToNull(id_nombre_insumo),
     id_presentacion_k: emptyToNull(id_presentacion_k),
     id_casa_comercial: emptyToNull(id_casa_comercial),
     id_proveedor_k: emptyToNull(id_proveedor_k),
     id_clasificacion_riesgo: emptyToNull(id_clasificacion_riesgo)
   };


    
      try {
      //Validar FK solo si no es null
     for (const [tabla, valor] of Object.entries(fkFields)) {
       if (valor !== null) {
          //el nombre de tabla en validarFKObligatorio no debe llevar "id_"
         const tablaSinId = tabla.replace(/^id_/, '');
         fkFields[tabla] = await validarFKObligatorio(pool, tablaSinId, valor);
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


        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Registro no encontrado con ese ID' });
        }

        res.json({ message: 'Registro actualizado exitosamente', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar un kardex por ID
router.get('/:id_kardex', async (req, res) => {
    const { id_kardex } = req.params;
    try {
        const [result] = await pool.query(
            'SELECT * FROM kardex WHERE id_kardex = ?',
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
        res.status(500).json({
            success: false,
            message: 'Hubo un problema al obtener el registro.',
            error: error.message
        });
    }
});

// Obtener todos los registros de kardex
router.get('/', async (req, res) => {
    try {
        const [registros] = await pool.query('SELECT * FROM kardex');
        res.json(registros);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un registro del kardex
router.delete('/:id_kardex', async (req, res) => {
    const { id_kardex } = req.params;
    const {usuarioId} = req.body;
    try {
        const [result] = await pool.query(
            'DELETE FROM kardex WHERE id_kardex = ?',
            [id_kardex]
        );
        
             const [usuarioResult ] = await pool.query(
                   'SELECT nombre FROM usuarios WHERE id_usuario = ?',
                   [usuarioId]
            );
             const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre: 'Desconocido';
             await registrarAuditoria('kardex', id_kardex, 'elimino', `Se elimino el kardex con ID ${id_kardex}`, usuarioId, nombreUsuario)

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se puede eliminar el registro con el ID proporcionado'
            });
        }

        res.status(202).json({
            success: true,
            message: 'Registro eliminado correctamente.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Hubo un problema al intentar eliminar el registro',
            error: error.message
        });
    }
});

module.exports = router;

