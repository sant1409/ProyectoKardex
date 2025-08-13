const express = require('express');
const router = express.Router();
const pool = require('../db');


router.post ('/', async (req, res) => {
    try { 

     const  {nombre}  = req.body;
     const [result] = await pool.query(
            'INSERT INTO clasificacion_riesgo(nombre) VALUES (?)',
            [nombre]
        );

    res.status(201).json({ message: 'clasificacion  creada exitosamente!', id_clasificacion_riesgo: result.insertId });
    }catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.put('/:id_clasificacion_riesgo', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_clasificacion_riesgo} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE clasificacion_riesgo SET nombre = ? WHERE id_clasificacion_riesgo = ?',
        [nombre, id_clasificacion_riesgo  ]
    );

    if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Clasificacion  no encontrado con ese ID' });
        }

        res.json({ message: 'La clasificacion se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_clasificacion_riesgo', async (req, res) => {
    try { 
        const {id_clasificacion_riesgo} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM clasificacion_riesgo WHERE id_clasificacion_riesgo = ?',
            [id_clasificacion_riesgo]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Clasificacion  no encontrada' });
        }

      res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });

    }
})

router.delete ('/:id_clasificacion_riesgo', async (req, res) => {
    try {
        const {id_clasificacion_riesgo} = req.params;
        const [result] = await pool.query(
            'DELETE FROM clasificacion_riesgo WHERE id_clasificacion_riesgo = ?',
            [id_clasificacion_riesgo]
        );
        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: 'Clasificacion  no encontrada'});

        }

        res.json({message: 'Clasificacion eliminada exitosamente'});
    }catch (error){
        res.status(500).json({error: error.message});
    }
});



module.exports = router;