const express = require('express');
const router = express.Router();
const pool = require('../db');


router.post ('/', async (req, res) => {
    try { 

     const {nombre}  = req.body;
    
    const [result] = await pool.query(
            'INSERT INTO nombre_del_insumo(nombre) VALUES (?)',
            [nombre]
        );

    res.status(201).json({ message: 'nombre de insumo creada exitosamente!', id_nombre_del_insumo: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/:id_nombre_del_insumo', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_nombre_del_insumo} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE nombre_del_insumo SET nombre = ? WHERE id_nombre_del_insumo = ?',
        [nombre, id_nombre_del_insumo]
    );

    if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'el insumo no  se encontro con ese ID' });
        }

    res.json({ message: 'El nombre  se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_nombre_del_insumo', async (req, res) => {
    try { 
        const {id_nombre_del_insumo} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM nombre_del_insumo WHERE id_nombre_del_insumo = ?',
            [id_nombre_del_insumo]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Nombre  no encontrada' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
});

router.delete ('/:id_nombre_del_insumo', async (req, res) => {
    try {
        const {id_nombre_del_insumo} = req.params;
        const [result] = await pool.query(
            'DELETE FROM nombre_del_insumo WHERE id_nombre_del_insumo = ?',
            [id_nombre_del_insumo]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: 'insumo  no encontrada'});

        }

        res.json({message: 'insumo eliminado exitosamente'});
    }catch (error){
        res.status(500).json({error: error.message});
    }
});



module.exports = router;