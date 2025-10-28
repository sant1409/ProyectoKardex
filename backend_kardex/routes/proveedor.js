const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verificarToken } = require('../middlewares/auth');
// ✅ Crear proveedor (solo para la id_sede del usuario)
router.post('/', verificarToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    const id_sede = req.usuario.id_sede;

    if (!id_sede) {
      return res.status(401).json({ message: 'id_sede no encontrada' });
    }

    const [result] = await pool.query(
      'INSERT INTO proveedor (nombre, id_sede) VALUES (?, ?)',
      [nombre, id_sede]
    );

    res.status(201).json({
      message: 'Proveedor creado exitosamente!',
      id_proveedor: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Actualizar proveedor (solo si pertenece a su id_sede)
router.put('/:id_proveedor', verificarToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    const { id_proveedor } = req.params;
    const id_sede = req.usuario.id_sede;

    const [result] = await pool.query(
      'UPDATE proveedor SET nombre = ? WHERE id_proveedor = ? AND id_sede = ?',
      [nombre, id_proveedor, id_sede]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado en tu id_sede' });
    }

    res.json({ message: 'El proveedor se actualizó exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Obtener un proveedor (solo si pertenece a su id_sede)
router.get('/:id_proveedor', verificarToken, async (req, res) => {
  try {
    const { id_proveedor } = req.params;
    const id_sede = req.usuario.id_sede;

    const [rows] = await pool.query(
      'SELECT * FROM proveedor WHERE id_proveedor = ? AND id_sede = ?',
      [id_proveedor, id_sede]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado en tu id_sede' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Listar todos los proveedores de su id_sede
router.get('/', verificarToken, async (req, res) => {
  try {
    const id_sede = req.usuario.id_sede;

    const [rows] = await pool.query(
      'SELECT id_proveedor, nombre FROM proveedor WHERE id_sede = ?',
      [id_sede]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Eliminar proveedor (solo si pertenece a su id_sede)
router.delete('/:id_proveedor', verificarToken, async (req, res) => {
  try {
    const { id_proveedor } = req.params;
    const id_sede = req.usuario.id_sede;

    const [result] = await pool.query(
      'DELETE FROM proveedor WHERE id_proveedor = ? AND id_sede = ?',
      [id_proveedor, id_sede]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado en tu id_sede' });
    }

    res.json({ message: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
