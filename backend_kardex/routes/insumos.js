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


            const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!fecha || !fechaRegex.test(fecha)) {
            return res.status(400).json({ error: 'La fecha debe tener el formato YYYY-MM-DD' });
            }


            if (!fecha_de_vto || ! fechaRegex.test(fecha)) {
                return res.status(400).json({errror:  'La fecha de vencimineto debe tener el formato YYYY-MM-DD'})
            }


          //  Validar fk con la nueva funcion

            const idNombreDelInsumo = await validarFKObligatorio(pool, 'nombre_del_insumo', id_nombre_del_insumo);
            const idPresentacion = await validarFKObligatorio(pool, 'presentacion', id_presentacion);
            const idLaboratorio = await validarFKObligatorio(pool, 'laboratorio', id_laboratorio);
            const idProveedor = await validarFKObligatorio(pool, 'proveedor', id_proveedor);
            const idClasificacion = await validarFKObligatorio(pool, 'clasificacion', id_clasificacion);
            const idCategoria = await validarFKObligatorio(pool, 'categoria', id_categoria);


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
        
            

        res.status(201).json({ message: 'Insumo creado exitosamente!', insumoid: result.insertId });
    }   catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar insumo por fecha, lote, proveedor o  por nombre

router.get('/buscar_insumos', async (req, res) => {
    const { nombre, proveedor, desde, hasta, lote } = req.query;

    let condiciones = [];
    let valores = [];

    if (nombre) {
        condiciones.push("id_nombre_del_insumo LIKE ?");
        valores.push(`%${nombre}%`);
    }

    if (proveedor) {
        condiciones.push("id_proveedor LIKE ?");
        valores.push(`%${proveedor}%`);
    }

    if (lote) {
        condiciones.push("lote = ?");
        valores.push(lote);
    }

    if (desde && hasta) {
        condiciones.push("DATE(fecha) BETWEEN ? AND ?");

        valores.push(desde, hasta);
    }

    let sql = "SELECT * FROM insumos";

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
        res.status(500).json({ error: 'Error al obtener los insumos' });
    }
});




// Alerta, fecha de vencimineto de insumos

router.get('/alerta_vencimineto_insumos', async (req, res)=>{
    console.log("✅ Entró a la ruta /alerta-vencimiento");
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

     const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!fecha || !fechaRegex.test(fecha)) {
       return res.status(400).json({ error: 'La fecha debe tener el formato YYYY-MM-DD' });
 }

     if (!fecha_de_vto || ! fechaRegex.test(fecha)) {
                return res.status(400).json({errror:  'La fecha de vencimineto debe tener el formato YYYY-MM-DD'})
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
      //Validar FK solo si no es null
     for (const [tabla, valor] of Object.entries(fkFields)) {
       if (valor !== null) {
          //el nombre de tabla en validarFKObligatorio no debe llevar "id_"
         const tablaSinId = tabla.replace(/^id_/, '');
         fkFields[tabla] = await validarFKObligatorio(pool, tablaSinId, valor);
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

         if (result.affectedRows === 0) {
       return res.status(404).json({ message: 'Insumo no encontrado con ese ID' });
     }


         const [usuarioResult] = await pool.query(
             'SELECT nombre FROM usuarios WHERE id_usuario = ?',
             [usuarioId]
         );

         const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre: 'Desconocido';

         await registrarAuditoria( 'insumos', id_insumo, 'modificacion',  `Se modificó el insumo con ID ${id_insumo}`, usuarioId, nombreUsuario);



         if (result.affectedRows === 0) {
             return res.status(404).json({ message: 'Insumo no encontrado con ese ID' });
         }

         res.json({ message: 'Insumo actualizado exitosamente', result });
     } catch (error) {
         res.status(500).json({ error: error.message });
     }
 });

//  Buscar un insumo por ID
 router.get('/:id_insumo', async (req, res) => {
     const { id_insumo } = req.params;
     try {
         const [result] = await pool.query(
             'SELECT * FROM insumos WHERE id_insumo = ?',
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
         res.status(500).json({
             success: false,
             message: 'Hubo un problema al obtener el insumo.',
             error: error.message
         });
     }
 });



// Obtener todos los insumos
router.get('/', async (req, res) => {
    try {
        const [insumos] = await pool.query('SELECT * FROM insumos');
        res.json(insumos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un insumo
router.delete('/:id_insumo', async (req, res) => {
    const { id_insumo } = req.params;
     const { usuarioId } = req.body;
    
    try {
        const [result] = await pool.query(
            'DELETE FROM insumos WHERE id_insumo = ?',
            [id_insumo]
        );

        const [usuarioResult] = await pool.query(
            
            'SELECT nombre FROM usuarios WHERE id_usuario = ?',
            [usuarioId]
        );

        const nombreUsuario = usuarioResult.length > 0 ? usuarioResult[0].nombre: 'Desconocido';

        await registrarAuditoria( 'insumos', id_insumo, 'eliminación',  `Se elimino el insumo con ID ${id_insumo}`, usuarioId, nombreUsuario);


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se puede eliminar el insumo con el ID proporcionado'
            });
        }

        res.status(202).json({
            success: true,
            message: 'Insumo eliminado correctamente.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Hubo un problema al intentar eliminar el insumo',
            error: error.message
        });
    }
});

module.exports = router;







