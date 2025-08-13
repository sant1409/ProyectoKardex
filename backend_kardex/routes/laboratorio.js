const express = require('express');
const router = express.Router();
const pool = require('../db');


router.post ('/', async (req, res) => {
    try { 

        const {nombre}  = req.body;
        const [result] = await pool.query(
            'INSERT INTO laboratorio(nombre) VALUES (?)',
            [nombre]
        );

    res.status(201).json({ message: 'nombre de laboratorio creada exitosamente!', id_laboratorio: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/:id_laboratorio', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_laboratorio} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE laboratorio SET nombre = ? WHERE id_laboratorio= ?',
        [nombre, id_laboratorio ]
    );

    if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Laboratorio  no encontrado con ese ID' });
        }

        res.json({ message: 'El laboratorio se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_laboratorio', async (req, res) => {
    try { 
        const {id_laboratorio} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM laboratorio WHERE id_laboratorio = ?',
            [id_laboratorio]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Laboratorio  no encontrada' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
})

router.delete ('/:id_laboratorio', async (req, res) => {
    try {
        const {id_laboratorio} = req.params;
        const [result] = await pool.query(
            'DELETE FROM laboratorio WHERE id_laboratorio = ?',
            [id_laboratorio]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: 'Laboratorio  no encontrada'});

        }

        res.json({message: 'Laboratorio eliminado exitosamente'});
    }catch (error){
        res.status(500).json({error: error.message});
    }
});


module.exports = router;