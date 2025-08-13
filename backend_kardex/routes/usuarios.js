const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// registrar un usuario
router.post('/registrarse', async (req, res) => {
    const { correo, nombre, contraseña } = req.body;

    if (!correo || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(correo)) {
        return res.status(400).json ({error: 'Correo invalido o faltante'});
    }

    if (!nombre || nombre.trim() === ''){
        return res.status(400).json ({error: 'El nombre es obligatorio'});
    }

    if (!contraseña || contraseña.length < 6) {
        return res.status(400).json({error: 'La contraseña debe tener almenos 6 caracteres'});
    }

    try {
        const contraseñaEncriptada = await bcrypt.hash(contraseña, 10);

        const [result] = await pool.query(
            'INSERT INTO usuarios (correo, nombre, contraseña) VALUES (?, ?, ?)',
            [correo, nombre, contraseñaEncriptada]


        );
        res.status(201).json({ message: 'Usuario registrado exitosamente!', id_usuario: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//iniciar sesion 

router.post('/login', async (req, res) => {
    const {correo, contraseña} = req. body;

    if (!correo || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(correo)) {
        return res.status(400).json ({error: 'Correo invalido o faltante'});
    }

    if (!contraseña) {
        return res.status(400).json({error: 'La contraseña es requerida'})
    }
    try {


        const correoLimpio = correo.trim();

        const [rows] = await pool.query(
            'SELECT * FROM usuarios WHERE correo = ?',
            [correoLimpio]
        );

        if (rows.length === 0) {
            return res.status(401).json({mensaje: 'correo no registrado'});
        }
        const usuarios = rows[0];
        const coincide = await bcrypt.compare(contraseña, usuarios.contraseña);

        if (!coincide){
            return res.status(401).json ({mensaje: 'Contraseña incorrecta'});
        }

       
       req.session.usuario = {
        id_usuario: usuarios.id_usuario,
        nombre: usuarios.nombre,
        correo: usuarios.correo
       };
    
       res.json ({mensaje: 'Inicio de sesion exitoso', usuario: req.session.usuario});


    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: 'Error en el servidor' });
    }
    
});

router.get('/perfil', (req, res)=> {
    if (!req.session.usuario) {
        return res.status(401).json({error: 'No se ha iniciado sesión'});
    }

    res.json({mensaje: 'Perfil accedido correctamente', usuario: req.session.usuario});
});




// cerra sesion 


router.post('/logout', async (req, res)=> {
    req.session.destroy(err =>{
        if (err) {
            return res.status(500).json({mensaje: 'Error al cerrar sesión'});  
        }
        res.clearCookie('connect.sid');
        res.json({mensaje: 'Sesión cerrada correctamente'})
    });
});

// recuperar contraseña
router.post('/recuperar_password', async (req, res)=>{
    const {correo, nuevaContraseña}= req.body;

    if (!correo || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(correo)) {
        return res.status(400).json({ error: 'Correo inválido o faltante' });
    }

    if (!nuevaContraseña || nuevaContraseña.length < 6) {
        return res.status(400).json ({error: 'La nueva contraseña debe de tener almenos 6 caracteres'})
    }
    


    try {

        
        const contraseñaEncriptada = await bcrypt.hash(nuevaContraseña, 10);
        const [result] = await pool.query(
            'UPDATE usuarios SET contraseña = ? WHERE correo = ?',
            [contraseñaEncriptada, correo]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({mensaje: 'Correo no  encontrado'});
        }
        res.json({mensaje: 'Contraseña actulizada con  éxito'});
    }catch (error){
        console.error(error);
        res.status(500).json({mensaje: 'Error en el servidor'});
    }
});

// Modificar usuario
router.put('/:id_usuario', async (req, res) => {
    const { correo, nombre, contraseña } = req.body;
    const { id_usuario } = req.params;

    if (!correo || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(correo)) {
        return res.status(400).json({ error: 'Correo inválido o faltante' });
    }

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({error: ' El nombre es obligatorio '});
    }

    if  (!contraseña || contraseña.length < 6) {
        return res.status(400).json({error: 'La contraseña debede tener al menos 6 caracteristicas'})
    }

    if (isNaN (id_usuario)) {
        return res.status(400).json ({error: 'ID de usuario invalido'});
    }

    try {
        const contraseñaEncriptada = await bcrypt.hash(contraseña, 10);
        const [result] = await pool.query(
            'UPDATE usuarios SET correo = ?, nombre = ?, contraseña = ? WHERE id_usuario = ?',
            [correo, nombre, contraseñaEncriptada, id_usuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado con ese ID' });
        }

        res.json({ message: 'Usuario actualizado exitosamente', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar un usuario por ID
router.get('/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;

    try {
        const [result] = await pool.query(
            'SELECT * FROM usuarios WHERE id_usuario = ?',
            [id_usuario]
        );

        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se puede encontrar al usuario con el ID proporcionado.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Usuario encontrado correctamente.',
            data: result[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Hubo un problema al obtener el usuario.',
            error: error.message
        });
    }
});

// Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        const [usuarios] = await pool.query('SELECT * FROM usuarios');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar un usuario
router.delete('/:id_usuario', async (req, res) => {
    const { id_usuario } = req.params;

    if (isNaN (id_usuario)) {
        return res.status(400).json ({error: 'ID de usuario invalido'});
    }

    try {
        const [result] = await pool.query(
            'DELETE FROM usuarios WHERE id_usuario = ?',
            [id_usuario]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se puede eliminar el usuario con el ID proporcionado'
            });
        }

        res.status(202).json({
            success: true,
            message: 'Usuario eliminado correctamente.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Hubo un problema en el servidor al intentar eliminar el usuario',
            error: error.message
        });
    }
});

module.exports = router;


