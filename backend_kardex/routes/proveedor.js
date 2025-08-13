const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post ('/', async (req, res) => {
    try { 

     const {nombre}  = req.body;
     const [result] = await pool.query(
            'INSERT INTO proveedor(nombre) VALUES (?)',
            [nombre]
        );

    res.status(201).json({ message: 'nombre de proveedor creada exitosamente!', id_proveedor: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put('/:id_proveedor', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_proveedor} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE proveedor SET nombre = ? WHERE id_proveedor = ?',
        [nombre, id_proveedor]
    );

    
    res.json({ message: 'El proveedor se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_proveedor', async (req, res) => {
    try { 
        const {id_proveedor} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM proveedor WHERE id_proveedor = ?',
            [id_proveedor]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Proveedor  no encontrado' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
});

router.delete ('/:id_proveedor', async (req, res) => {
    try {
        const {id_proveedor} = req.params;
        const [result] = await pool.query(
            'DELETE FROM proveedor WHERE id_proveedor = ?',
            [id_proveedor]
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