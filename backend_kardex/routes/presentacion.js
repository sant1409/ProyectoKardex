const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post ('/', async (req, res) => {
    try { 

     const {nombre}  = req.body;
     const [result] = await pool.query(
            'INSERT INTO presentacion(nombre) VALUES (?)',
            [nombre]
        );

    res.status(201).json({ message: 'nombre de presentacion creada exitosamente!', id_presentacion: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/:id_presentacion', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_presentacion} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE presentacion SET nombre = ? WHERE id_presentacion = ?',
        [nombre, id_presentacion]
    );

    
     res.json({ message: 'La presentación se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_presentacion', async (req, res) => {
    try { 
        const {id_presentacion} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM presentacion WHERE id_presentacion = ?',
            [id_presentacion]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Presentacion  no encontrada' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
});

router.delete ('/:id_presentacion', async (req, res) => {
    try {
        const {id_presentacion} = req.params;
        const [result] = await pool.query(
            'DELETE FROM presentacion WHERE id_presentacion = ?',
            [id_presentacion]
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