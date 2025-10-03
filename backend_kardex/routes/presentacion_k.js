const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
    try {
        const {nombre} = req.body;

        const[result] =  await pool.query(
            'INSERT INTO presentacion_k(nombre) VALUES  (?) ',
            [nombre]
        );

        res.status(201).json({message: 'presentacion creada exitosamente', id_presentacion_k: result.insertId});
    } catch (error) {
    res.status(500).json({error: error.message})
    }

});


router.put('/:id_presentacion_k', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_presentacion_k} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE presentacion_k SET nombre = ? WHERE id_presentacion_k = ?',
        [nombre, id_presentacion_k]
    );

    

     res.json({ message: 'La presentación se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_presentacion_k', async (req, res) => {
    try { 
        const {id_presentacion_k} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM presentacion_k WHERE id_presentacion_k = ?',
            [id_presentacion_k]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Presentacion  no encontrada' });
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
      "SELECT id_presentacion_k, nombre AS presentacion_k FROM presentacion_k"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete ('/:id_presentacion_k', async (req, res) => {
    try {
        const {id_presentacion_k} = req.params;
        const [result] = await pool.query(
            'DELETE FROM presentacion_k WHERE id_presentacion_k= ?',
            [id_presentacion_k]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: 'Presentacion  no encontrada'});

        }

        res.json({message: 'Presentacion eliminada exitosamente'});
    }catch (error){
        res.status(500).json({error: error.message});
    }
});


module.exports = router;