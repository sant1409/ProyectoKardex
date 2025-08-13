const pool = require('../db');

async function registrarAuditoria(entidad_afectada,	id_entidad,	accion,	detalle_adicional, id_usuario,	nombre_responsable	 ) {
    try {
        await pool.query(
    
    `INSERT INTO auditoria (entidad_afectada,	id_entidad,	accion,	detalle_adicional, id_usuario, nombre_responsable)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [entidad_afectada,	id_entidad,	accion,	detalle_adicional,	id_usuario, nombre_responsable]
        );
    } catch (error){
        console.error('Error al registrar auditoria:', error);
    }

}

module.exports = {registrarAuditoria};