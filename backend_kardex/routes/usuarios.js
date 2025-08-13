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

    if (!correo || !nombre || !contraseña) return res.status(400).json({error: 'Datos incompletos'});

    try {
        const contraseñaEncriptada = await bcrypt.hash(contraseña, 10);

        const [result] = await pool.query(
            'INSERT INTO usuarios (correo, nombre, contraseña, verificado) VALUES (?, ?, ?, ?)',
            [correo, nombre, contraseñaEncriptada, 0] // 0 = no verificado

        );
        //Crear un codigo aleatorio de verificacion
        const codigo = Math.floor(100000 + Math.random () * 900000);

        //Guardar codigo en la base de datos 
        await pool.query('UPDATE usuarios SET codigo_verificacion = ? WHERE id_usuario = ?', [codigo, result.insertId]);

        // Enviar correo
        await transporte.sendMail({
            from: '"Mi APP" <tucorreo@gmail.com>',
            to: correo,
            subject: "Verificar tu cuenta",
            text: `Tu código de verificación es: ${codigo}`
        });



        res.status(201).json({ message: 'Usuario registrado. revisa tu correo para verificar la cuenta!', id_usuario: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Ruta de verificacion correo 
router.post('/verificar', async (req, res) => {
    const {correo, codigo} = req.body;
    const [rows] = await pool.query(
        'SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (rows.length === 0) return res.status(404).json({error: 'Usuario no encontrado'});

        const usuario  = rows[0];

        if (usuario.codigo_verificacion != codigo) {
            return res.status(400).json({error: 'Codigo incorrecto'});
        }

        // Activar usuario
        await pool.query('UPDATE usuarios SET verificado = 1, codigo_verificacion = NULL WHERE correo= ?', [correo]);
        res.json({message: 'Cuenta verificada correctamente'});
});

//iniciar sesion 

router.post('/iniciar_sesion', async (req, res) => {
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




// cerra sesion 


router.post('/cerrar_sesion', async (req, res)=> {
    req.session.destroy(err =>{
        if (err) {
            return res.status(500).json({mensaje: 'Error al cerrar sesión'});  
        }
        res.clearCookie('connect.sid');
        res.json({mensaje: 'Sesión cerrada correctamente'})
    });
});

// recuperar contraseña
router.post('/recuperar_clave', async (req, res)=>{
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


//Obtener el perfil del usuario
router.get('/perfil', async (req , res) => {
    if (!req.session.usuario) {
        return res.status(401).json({error: 'No has iniciado sesion'});
    }
    const {id_usuario, nombre, correo} = req.session.usuario;

    res.json({
        mensaje: 'Perfil accedido correctamente',
        usuario: {id_usuario, nombre, correo}
    });      
});

//Ruta para configurar Nodemailer, permite envia codigos de verificacion al correo

const nodemailer = require("nodemailer");
//configurar el transporte

const transporte = nodemailer.createTransport({
    service: "gmail", //O otro proveedor de direccion
    auth: {
        user: "tucorreo@gmail.com",
        pass: "tu_contraseña_app", // generar contraseña de app si es gmail
    },
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


