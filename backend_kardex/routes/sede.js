const express = require('express');
const router = express.Router();
const pool = require('../db'); // tu conexión MySQL

// Obtener todas las sedes
router.get('/', async (req, res) => {
  try {
    const [sedes] = await pool.query('SELECT * FROM sede');
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear una nueva sede
router.post('/', async (req, res) => {
  const { nombre } = req.body;
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre de la sede es obligatorio' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO sede (nombre) VALUES (?)',
      [nombre]
    );
    res.status(201).json({ id_sede: result.insertId, nombre });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
