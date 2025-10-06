const express = require('express');
const router = express.Router();
const pool = require('../db');

// Crear auditoría
router.post('/', async (req, res) => {
    const {  entidad_afectada, id_entidad, accion, detalle_adicional, id_usuario, nombre_responsable } = req.body;
      const id_sede = req.session.id_sede;

    try {
        const [result] = await pool.query(
            `INSERT INTO auditoria (
                 entidad_afectada, id_entidad, accion, detalle_adicional , id_usuario, nombre_responsable, id_sede) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ entidad_afectada, id_entidad, accion, detalle_adicional, id_usuario, nombre_responsable, id_sede]
            
        );
        res.status(201).json({ message: 'Auditoría creada exitosamente!', id_auditoria: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//Buscar auditoria por usuario, fecha, entidad
router.get('/buscar_auditoria', async (req, res) => {
  const { usuario, fecha, entidad } = req.query;

try {
    let query = 'SELECT * FROM auditoria WHERE 1  =  1 ';
    const params = [];

    if (usuario) {
      query += ' AND id_usuario = ?';
      params.push(usuario);
    }

    if (fecha) {
        query += ' AND DATE(fecha_hora) = ?';
        params.push(fecha);
    }

    if (entidad) {
      query += ' AND entidad_afectada = ?';
      params.push(entidad);
    }

    query += ' ORDER BY fecha_hora DESC';

    const [result] = await pool.query(query, params);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron auditorías con esos criterios.'
      });
    }

    res.status(200).json({
      success: true,
      mensaje: 'Auditorías encontradas correctamente',
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error en el servidor al intentar obtener auditorías",
      error: error.message
    });
  }
});


router.get('/auditoria', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT * FROM auditoria ORDER BY fecha DESC');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = router;
