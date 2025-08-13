const express = require('express');
const router = express.Router();
const pool = require('../db');


router.post ('/', async (req, res) => {
    try { 

     const  {nombre}  = req.body;
     const [result] = await pool.query(
            'INSERT INTO categoria(nombre) VALUES (?)',
            [nombre]
        );

    res.status(201).json({ message: 'nombre de categoria creada exitosamente!', id_categoria: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});



router.put('/:id_categoria', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_categoria} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE categoria SET nombre = ? WHERE id_categoria = ?',
        [nombre, id_categoria  ]
    );

    if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Categoria  no encontrado con ese ID' });
        }

     res.json({ message: 'La categoria se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_categoria', async (req, res) => {
    try { 
        const {id_categoria} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM categoria WHERE id_categoria = ?',
            [id_categoria]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Categoria no encontrada' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
})

router.delete ('/:id_categoria', async (req, res) => {
    try {
        const {id_categoria} = req.params;
        const [result] = await pool.query(
            'DELETE FROM categoria WHERE id_categoria = ?',
            [id_categoria]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: 'Categoria  no encontrada'});

        }

        res.json({message: 'Categoria eliminada exitosamente'});
    }catch (error){
        res.status(500).json({error: error.message});
    }
});



module.exports = router;