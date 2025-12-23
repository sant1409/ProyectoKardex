
// Rutas para la gestión de usuarios (registro, login, verificación, recuperación, CRUD)
// Mejoras: seguridad .env, corrección de from, orden transaccional al enviar correos,
// validaciones claras, JWT sin valor por defecto, no mezcla de sesiones con JWT.

const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { verificarToken } = require('../middlewares/auth');

// Requerir variables de entorno obligatorias
if (!process.env.JWT_SECRET) {
  console.error('FATAL: falta JWT_SECRET en las variables de entorno');
  // opcional: lanzar error para que el proceso no arranque en producción
  // throw new Error('JWT_SECRET no definido');
}

const JWT_SECRET = process.env.JWT_SECRET;



const transporte = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});



// Verificar conexión (no bloqueante, solo log)
transporte.verify().then(() => {

  console.log('Transporte de correo verificado');
}).catch(err => {
  console.warn('Advertencia: no se pudo verificar transporte de correo:', err.message || err);
});

// Helper: validar correo
function validarCorreo(correo) {
  if (!correo) return false;
  const re = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(correo);
}

// Helper: generar codigo de 6 digitos
function generarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------------------- RUTAS ---------------------- //

// Registrar un usuario
router.post('/registrarse', async (req, res) => {
  const { correo, nombre, contraseña, id_sede } = req.body;

  if (!validarCorreo(correo)) return res.status(400).json({ error: 'Correo inválido o faltante' });
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!contraseña || contraseña.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (!id_sede) return res.status(400).json({ error: 'La sede es obligatoria' });

  try {
    const contraseñaEncriptada = await bcrypt.hash(contraseña, 10);
    const codigo = generarCodigo();

    // Insertar usuario antes de enviar correo
    const [result] = await pool.query(
      'INSERT INTO usuarios (correo, nombre, contraseña, id_sede, codigo_verificacion, verificado) VALUES (?, ?, ?, ?, ?, 0)',
      [correo, nombre, contraseñaEncriptada, id_sede, codigo]
    );

    // Intentar enviar correo; si falla, eliminar usuario insertado para mantener consistencia
    try {
        await transporte.sendMail({
        from: `"Mi APP" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Verificar tu cuenta',
        text: `Tu código de verificación es: ${codigo}`,
      });

      return res.status(201).json({ message: 'Usuario registrado. Revisa tu correo para verificar la cuenta!', id_usuario: result.insertId });
    } catch (mailErr) {
      // borrar usuario creado por que no llegó el mail
      await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [result.insertId]);
      console.error('Error enviando mail, se eliminó usuario creado:', mailErr.message || mailErr);
      return res.status(500).json({ error: 'No se pudo enviar el correo de verificación. Intenta nuevamente más tarde.' });
    }
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error en /registrarse:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Iniciar sesión (genera JWT)
router.post('/iniciar_sesion', async (req, res) => {
  const { correo, contraseña } = req.body;
  if (!correo || !contraseña) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (rows.length === 0) return res.status(401).json({ error: 'Correo no registrado' });

    const usuario = rows[0];
    if (!usuario.verificado) return res.status(403).json({ error: 'Cuenta no verificada' });

    const coincide = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!coincide) return res.status(401).json({ error: 'Contraseña incorrecta' });

    if (!JWT_SECRET) return res.status(500).json({ error: 'Clave JWT no configurada' });

    const token = jwt.sign({
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      id_sede: usuario.id_sede
    }, JWT_SECRET, { expiresIn: '1d' });

    return res.json({ mensaje: 'Inicio de sesión exitoso', token });
  } catch (error) {
    console.error('Error en /iniciar_sesion:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Verificar código de registro
router.post('/verificar', async (req, res) => {
  const { correo, codigo } = req.body;
  if (!validarCorreo(correo) || !codigo) return res.status(400).json({ error: 'Correo o código faltante' });

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const usuario = rows[0];
    if (usuario.codigo_verificacion != codigo) return res.status(400).json({ error: 'Código incorrecto' });

    await pool.query('UPDATE usuarios SET verificado = 1, codigo_verificacion = NULL WHERE correo = ?', [correo]);
    return res.json({ message: 'Cuenta verificada correctamente' });
  } catch (error) {
    console.error('Error en /verificar:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Cerrar sesión (usando JWT la acción principal es borrar token en cliente)
// Si quieres implementar blacklist en servidor, añade lógica aquí.
router.post('/cerrar_sesion', (req, res) => {
  // No usamos sesiones en este flujo. Indicar al cliente que elimine el token.
  return res.json({ mensaje: 'Cierre de sesión: elimina el token en el cliente para completar el logout.' });
});

// Recuperar contraseña (envía código)
router.post('/recuperar_clave', async (req, res) => {
  const { correo } = req.body;
  if (!validarCorreo(correo)) return res.status(400).json({ error: 'Correo inválido o faltante' });

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (rows.length === 0) return res.status(404).json({ error: 'Correo no registrado' });

    const codigo = generarCodigo();
    await pool.query('UPDATE usuarios SET codigo_recuperacion = ? WHERE correo = ?', [codigo, correo]);

    try {
      await transporte.sendMail({
        from: `"Mi APP" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Recuperar contraseña',
        text: `Tu código de recuperación es: ${codigo}`,
      });
      return res.json({ mensaje: 'Código enviado al correo' });
    } catch (mailErr) {
      console.error('Error enviando mail de recuperación:', mailErr);
      // revertir: eliminar codigo_recuperacion
      await pool.query('UPDATE usuarios SET codigo_recuperacion = NULL WHERE correo = ?', [correo]);
      return res.status(500).json({ error: 'No se pudo enviar el correo. Intenta nuevamente más tarde.' });
    }
  } catch (error) {
    console.error('Error en /recuperar_clave:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Verificar código de recuperación
router.post('/verificar_codigo', async (req, res) => {
  const { correo, codigo } = req.body;
  if (!validarCorreo(correo) || !codigo) return res.status(400).json({ error: 'Correo o código faltante' });

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE correo = ? AND codigo_recuperacion = ?', [correo, codigo]);
    if (rows.length === 0) return res.status(400).json({ error: 'Código incorrecto' });
    return res.json({ message: 'Código válido, puedes cambiar la contraseña' });
  } catch (error) {
    console.error('Error en /verificar_codigo:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Resetear contraseña
router.post('/resetear_clave', async (req, res) => {
  const { codigo, nuevaContraseña } = req.body;
  if (!nuevaContraseña || nuevaContraseña.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE codigo_recuperacion = ?', [codigo]);
    if (rows.length === 0) return res.status(400).json({ error: 'Código incorrecto' });

    const contraseñaEncriptada = await bcrypt.hash(nuevaContraseña, 10);
    await pool.query('UPDATE usuarios SET contraseña = ?, codigo_recuperacion = NULL WHERE id_usuario = ?', [contraseñaEncriptada, rows[0].id_usuario]);

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en /resetear_clave:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Modificar usuario
router.put('/:id_usuario', async (req, res) => {
  const { correo, nombre, contraseña } = req.body;
  const { id_usuario } = req.params;

  if (!validarCorreo(correo)) return res.status(400).json({ error: 'Correo inválido o faltante' });
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!contraseña || contraseña.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (isNaN(Number(id_usuario))) return res.status(400).json({ error: 'ID de usuario inválido' });

  try {
    const contraseñaEncriptada = await bcrypt.hash(contraseña, 10);
    const [result] = await pool.query('UPDATE usuarios SET correo = ?, nombre = ?, contraseña = ? WHERE id_usuario = ?', [correo, nombre, contraseñaEncriptada, id_usuario]);

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado con ese ID' });
    return res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El correo ya está registrado' });
    console.error('Error en PUT /:id_usuario:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener perfil (requiere verificarToken middleware)
router.get('/sesion', verificarToken, async (req, res) => {
  const { id_usuario, nombre, correo, id_sede } = req.usuario;
  return res.json({ mensaje: 'Perfil accedido correctamente', usuario: { id_usuario, nombre, correo, id_sede } });
});

// Buscar un usuario por ID
router.get('/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const [result] = await pool.query('SELECT * FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (result.length === 0) return res.status(404).json({ success: false, message: 'No se puede encontrar al usuario con el ID proporcionado.' });
    return res.status(200).json({ success: true, message: 'Usuario encontrado correctamente.', data: result[0] });
  } catch (error) {
    console.error('Error GET /:id_usuario:', error);
    return res.status(500).json({ success: false, message: 'Hubo un problema al obtener el usuario.', error: error.message });
  }
});

// Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const [usuarios] = await pool.query('SELECT * FROM usuarios');
    return res.json(usuarios);
  } catch (error) {
    console.error('Error GET /usuarios:', error);
    return res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar usuario
router.delete('/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  if (isNaN(Number(id_usuario))) return res.status(400).json({ error: 'ID de usuario inválido' });

  try {
    const [result] = await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id_usuario]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'No se puede eliminar el usuario con el ID proporcionado' });
    return res.status(202).json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (error) {
    console.error('Error DELETE /:id_usuario:', error);
    return res.status(500).json({ success: false, message: 'Hubo un problema en el servidor al intentar eliminar el usuario', error: error.message });
  }
});

module.exports = router;


