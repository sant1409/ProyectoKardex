const express = require('express');
const router = express.Router();
const pool = require('../db');
const { crearNotificacion, marcarLeida } = require('../utils/notificaciones');

// 🔹 Obtener todas las notificaciones con info de kardex e insumos
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
    n.id_notificacion, n.mensaje, n.tipo, n.fecha_evento, n.leido,
    k.lote, k.fecha_terminacion, ni.nombre AS nombre_insumo, cc.nombre AS casa_comercial,
    i.id_insumo, ndi.nombre AS nombre_del_insumo, l.nombre AS laboratorio
  FROM notificaciones n
  LEFT JOIN kardex k ON n.id_kardex = k.id_kardex
  LEFT JOIN nombre_insumo ni ON k.id_nombre_insumo = ni.id_nombre_insumo
  LEFT JOIN casa_comercial cc ON k.id_casa_comercial = cc.id_casa_comercial
  LEFT JOIN insumos i ON n.id_insumo = i.id_insumo
  LEFT JOIN nombre_del_insumo ndi ON i.id_nombre_del_insumo = ndi.id_nombre_del_insumo
  LEFT JOIN laboratorio l ON i.id_laboratorio = l.id_laboratorio
  WHERE n.leido = 0
  ORDER BY n.fecha_creacion DESC
`);
    res.json(rows);
  } catch (error) {
     console.error('💥 Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// 🔹 Crear una notificación
router.post('/', async (req, res) => {
  try {
    const id = await crearNotificacion(req.body);
    res.json({ id });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
});

// 🔹 Marcar como leída
router.put('/:id/leida', async (req, res) => {
  try {
    const ok = await marcarLeida(req.params.id);
    res.json({ success: ok });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({ error: 'Error al marcar notificación como leída' });
  }
});


module.exports = router;
