const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
    try{
        const {nombre} = req.body;
        const [result] = await pool.query(
            'INSERT INTO casa_comercial (nombre) VALUES(?)',
            [nombre]
        );

    res.status(201).json({ message: 'nombre de l casa comercial creada exitosamente!', id_casa_comercial: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put('/:id_casa_comercial', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_casa_comercial} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE casa_comercial SET nombre = ? WHERE id_casa_comercial = ?',
        [nombre, id_casa_comercial ]
    );

    if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Casa comercial no encontrado con ese ID' });
        }

     res.json({ message: 'La casa_comercial se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_casa_comercial', async (req, res) => {
    try { 
        const {id_casa_comercial} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM casa_comercial WHERE id_casa_comercial = ?',
            [id_casa_comercial]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Casa comercial no encontrada' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
})

router.delete ('/:id_casa_comercial', async (req, res) => {
    try {
        const {id_casa_comercial} = req.params;
        const [result] = await pool.query(
            'DELETE FROM casa_comercial WHERE id_casa_comercial = ?',
            [id_casa_comercial]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: 'Casa comercial no encontrada'});

        }

        res.json({message: 'Casa comercial eliminada exitosamente'});
    }catch (error){
        res.status(500).json({error: error.message});
    }
});



module.exports = router;