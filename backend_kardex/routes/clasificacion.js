const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {

  try {
    const  { id_clasificacion, nombre} = req.body;
    const [result] = await pool.query(
      'INSERT INTO insumos (id_clasificacion, nombre) VALUES (?, ?, ?)',
      [id_clasificacion, nombre]
    );

    res.status(201).json({ message: 'clasificacion creada exitosamente!', id_clasificacion: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id_clasificacion', async (req, res) => {
    try{

       const {nombre } = req.body;
        
       const {id_clasificacion} =  req.params; 

    const   [result] = await pool.query(
        'UPDATE clasificacion SET nombre = ? WHERE id_clasificacion= ?',
        [nombre, id_clasificacion ]
    );

    if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Clasificacion  no encontrado con ese ID' });
        }

     res.json({ message: 'La clasificacion se actualizó exitosamente' });
    }catch (error) {
     res.status(500).json({ error: error.message });
    }

});

router.get ('/:id_clasificacion', async (req, res) => {
    try { 
        const {id_clasificacion} = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM clasificacion WHERE id_clasificacion = ?',
            [id_clasificacion]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Clasificacion  no encontrada' });
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
      "SELECT id_clasificacion, nombre AS clasificacion FROM clasificacion"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.delete ('/:id_clasificacion', async (req, res) => {
    try {
        const {id_clasificacion} = req.params;
        const [result] = await pool.query(
            'DELETE FROM clasificacion WHERE id_clasificacion = ?',
            [id_clasificacion]
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



