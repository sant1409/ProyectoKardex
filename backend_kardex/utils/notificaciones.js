const pool = require('../db');
const nodemailer = require('nodemailer');

// 🔹 Crear notificación
async function crearNotificacion({ tipo, id_kardex = null, id_insumo = null, mensaje, fecha_evento = null, creado_por = null }) {
  const id_kardex_nn = id_kardex ?? 0;
  const id_insumo_nn = id_insumo ?? 0;
  const fecha_evento_date = fecha_evento ? new Date(fecha_evento).toISOString().split('T')[0] : null;

  const [result] = await pool.query(
    `INSERT INTO notificaciones 
      (tipo, id_kardex, id_insumo, mensaje, fecha_evento, creado_por, id_kardex_nn, id_insumo_nn, fecha_evento_date)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
     FROM DUAL
     WHERE NOT EXISTS (
       SELECT 1 FROM notificaciones
       WHERE id_kardex_nn = ?
         AND id_insumo_nn = ?
         AND tipo = ?
         AND fecha_evento_date = ?
     ) LIMIT 1`,
    [
      tipo, id_kardex, id_insumo, mensaje, fecha_evento, creado_por,
      id_kardex_nn, id_insumo_nn, fecha_evento_date,
      id_kardex_nn, id_insumo_nn, tipo, fecha_evento_date
    ]
  );

  return result.insertId ? result.insertId : null;
}

// 🔹 Obtener notificaciones
async function obtenerNotificaciones({ soloNoLeidas = false } = {}) {
  let query = 'SELECT * FROM notificaciones ORDER BY fecha_creacion DESC';
  if (soloNoLeidas) {
    query = 'SELECT * FROM notificaciones WHERE leido = 0 ORDER BY fecha_creacion DESC';
  }
  const [rows] = await pool.query(query);
  return rows;
}

// 🔹 Marcar notificación como leída
async function marcarLeida(id_notificacion) {
  const [result] = await pool.query(
    'UPDATE notificaciones SET leido = 1 WHERE id_notificacion = ?',
    [id_notificacion]
  );
  return result.affectedRows > 0;
}

// 🔹 Crear notificación automática por vencimiento
// 🔹 Crear notificación automática por vencimiento
async function generarNotificacionesAutomaticas() {
  // Función para normalizar fechas al inicio del día (ignorar horas/min/seg)
  function normalizarFecha(fecha) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  }

  const hoy = normalizarFecha(new Date());

  function esFechaValida(fecha) {
    const d = new Date(fecha);
    return !isNaN(d.getTime());
  }

  // 1️⃣ Vencimiento de kardex (reactivos)
  const [kardex] = await pool.query(`
    SELECT k.id_kardex, k.fecha_vencimiento, ni.nombre AS nombre_insumo, cc.nombre AS casa_comercial
    FROM kardex k
    LEFT JOIN nombre_insumo ni ON k.id_nombre_insumo = ni.id_nombre_insumo
    LEFT JOIN casa_comercial cc ON k.id_casa_comercial = cc.id_casa_comercial
  `);

  for (const item of kardex) {
    if (!item.fecha_vencimiento || !esFechaValida(item.fecha_vencimiento)) continue;

    const fechaVto = normalizarFecha(new Date(item.fecha_vencimiento));
    const diffDias = Math.floor((fechaVto - hoy) / (1000 * 60 * 60 * 24));
    const fechaStr = fechaVto.toISOString().split('T')[0];

    if (diffDias === 7) {
      await crearNotificacion({
        tipo: 'vencimiento_kardex',
        id_kardex: item.id_kardex,
        mensaje: `El reactivo "${item.nombre_insumo}" de la casa comercial "${item.casa_comercial}" vencerá en 7 días .`,
        fecha_evento: fechaStr,
      });
    }

    if (diffDias === 0) {
      await crearNotificacion({
        tipo: 'vencimiento_kardex',
        id_kardex: item.id_kardex,
        mensaje: `⚠️ El reactivo "${item.nombre_insumo}" de la casa comercial "${item.casa_comercial}" vence HOY .`,
        fecha_evento: fechaStr,
      });
    }
  }

  // 2️⃣ Vencimiento de insumos
  const [insumos] = await pool.query(`
    SELECT i.id_insumo, i.fecha_de_vto, ni.nombre AS nombre_del_insumo, l.nombre AS laboratorio
    FROM insumos i
    LEFT JOIN nombre_del_insumo ni ON i.id_nombre_del_insumo = ni.id_nombre_del_insumo
    LEFT JOIN laboratorio l ON i.id_laboratorio = l.id_laboratorio
  `);

  for (const item of insumos) {
    if (!item.fecha_de_vto || !esFechaValida(item.fecha_de_vto)) continue;

    const fechaVto = normalizarFecha(new Date(item.fecha_de_vto));
    const diffDias = Math.floor((fechaVto - hoy) / (1000 * 60 * 60 * 24));
    const fechaStr = fechaVto.toISOString().split('T')[0];

    if (diffDias === 7) {
      await crearNotificacion({
        tipo: 'vencimiento_insumo',
        id_insumo: item.id_insumo,
        mensaje: `El insumo "${item.nombre_del_insumo}" del laboratorio "${item.laboratorio}" vencerá en 7 días .`,
        fecha_evento: fechaStr,
      });
    }

    if (diffDias === 0) {
      await crearNotificacion({
        tipo: 'vencimiento_insumo',
        id_insumo: item.id_insumo,
        mensaje: `⚠️ El insumo "${item.nombre_del_insumo}" del laboratorio "${item.laboratorio}" vence HOY .`,
        fecha_evento: fechaStr,
      });
    }
  }
}




// 🔹 Procesar salidas
async function procesarSalidas() {
  const hoy = new Date().toISOString().split('T')[0];

  // 🔹 Salida de reactivos (kardex)
  const [kardexSalidas] = await pool.query(`
    SELECT k.id_kardex, k.fecha_terminacion, ni.nombre AS nombre_insumo, cc.nombre AS casa_comercial
    FROM kardex k
    LEFT JOIN nombre_insumo ni ON k.id_nombre_insumo = ni.id_nombre_insumo
    LEFT JOIN casa_comercial cc ON k.id_casa_comercial = cc.id_casa_comercial
    WHERE k.fecha_terminacion IS NOT NULL AND k.fecha_terminacion <> ''
  `);

  for (const item of kardexSalidas) {
    const terminacionStr = item.fecha_terminacion ? String(item.fecha_terminacion) : null;
    if (!terminacionStr || terminacionStr.startsWith('0000-00-00')) continue;

    const fechaSalida = new Date(terminacionStr).toISOString().split('T')[0];

    if (fechaSalida === hoy) {
      await crearNotificacion({
        tipo: 'salida_kardex',
        id_kardex: item.id_kardex,
        mensaje: `El reactivo "${item.nombre_insumo}" de la casa comercial "${item.casa_comercial}" ha sido dado de salida`,
        fecha_evento: fechaSalida,
      });
    }
  }

  // 🔹 Salida de insumos
  const [insumosSalidas] = await pool.query(`
    SELECT i.id_insumo, i.termino, ndi.nombre AS nombre_del_insumo, l.nombre AS laboratorio
    FROM insumos i
    LEFT JOIN nombre_del_insumo ndi ON i.id_nombre_del_insumo = ndi.id_nombre_del_insumo
    LEFT JOIN laboratorio l ON i.id_laboratorio = l.id_laboratorio
    WHERE i.termino IS NOT NULL AND i.termino <> '0000-00-00 00:00:00'
  `);

  for (const item of insumosSalidas) {
    const terminoStr = item.termino ? String(item.termino) : null;
    if (!terminoStr || terminoStr.startsWith('0000-00-00')) continue;

    const fechaSalida = new Date(terminoStr).toISOString().split('T')[0];

    if (fechaSalida === hoy) {
      await crearNotificacion({
        tipo: 'salida_insumo',
        id_insumo: item.id_insumo,
        mensaje: `El insumo "${item.nombre_del_insumo}" del laboratorio "${item.laboratorio}" ha sido dado de salida`,
        fecha_evento: fechaSalida,
      });
    }
  }
}


// 🔹 Enviar notificaciones por correo
async function enviarNotificacionesPorCorreo() {
  console.log("📩 Entrando a enviarNotificacionesPorCorreo() con credenciales:",
    process.env.EMAIL_USER, process.env.EMAIL_PASS);

  const [notis] = await pool.query(`
    SELECT * 
    FROM notificaciones
    WHERE enviado_email = 0
  `);

  if (!notis.length) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
      user: 'automatizarkardex@gmail.com', 
      pass: 'dnnv qksc ddma fkgm'
    }
  });

  const destinatarios = [
    "rodriguezcardonasantiago30@gmail.com"
  ];

  for (const n of notis) {
    await transporter.sendMail({
      from: '"Kardex Sistema" <automatizarkardex@gmail.com>',
      to: destinatarios.join(','),
      subject: 'Notificación del Sistema Kardex',
      text: n.mensaje
    });

    await pool.query(
      `UPDATE notificaciones SET enviado_email = 1 WHERE id_notificacion = ?`,
      [n.id_notificacion]
    );
  }

  console.log('Notificaciones enviadas por correo correctamente ✅');
}

module.exports = { 
  crearNotificacion, 
  obtenerNotificaciones, 
  marcarLeida, 
  procesarSalidas, 
  generarNotificacionesAutomaticas, 
  enviarNotificacionesPorCorreo 
};
