const pool = require('../db');

async function registrarAuditoria(entidad_afectada, id_entidad, accion, detalle_adicional, id_usuario, nombre_responsable) {
    try {
        const [result] = await pool.query(
            `INSERT INTO auditoria (entidad_afectada, id_entidad, accion, detalle_adicional, id_usuario, nombre_responsable)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [entidad_afectada, id_entidad, accion, detalle_adicional, id_usuario, nombre_responsable]
        );

        console.log("Auditoría creada con ID:", result.insertId);
        return result.insertId;
    } catch (error) {
         console.error("Error en registrarAuditoria:", error.sqlMessage, error.code);
        throw error; // así lo vemos también en el delete
    }
}
module.exports = { registrarAuditoria };
