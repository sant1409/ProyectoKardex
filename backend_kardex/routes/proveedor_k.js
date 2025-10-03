const express = require('express');
const router = express.Router();
const pool = require('../db');


router.post ('/', async (req, res) => {
    try { 

     const  {nombre}  = req.body;
     const [result] = await pool.query(
            'INSERT INTO proveedor_k (nombre) VALUES (?)',
            [nombre]
        );

    res.status(201).json({ message: 'proveedor creado exitosamente!', id_proveedor_k: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/:id_proveedor_k', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_proveedor_k} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE proveedor_k SET nombre = ? WHERE id_proveedor_k = ?',
        [nombre, id_proveedor_k]
    );

    

     res.json({ message: 'El proveedor se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_proveedor_k', async (req, res) => {
    try { 
        const {id_proveedor_k} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM proveedor_k WHERE id_proveedor_k = ?',
            [id_proveedor_k]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Proveedor  no encontrado' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
});

// GET todos los registros
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_proveedor_k, nombre AS proveedor_k FROM proveedor_k"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete ('/:id_proveedor_k', async (req, res) => {
    try {
        const {id_proveedor_k} = req.params;
        const [result] = await pool.query(
            'DELETE FROM proveedor_k WHERE id_proveedor_k = ?',
            [id_proveedor_k]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: 'Proveedor   no encontrado'});

        }

        res.json({message: 'Proveedor eliminado exitosamente'});
    }catch (error){
        res.status(500).json({error: error.message});
    }
});

module.exports = router;