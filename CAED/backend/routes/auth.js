const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { cedula, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT u.*,
        CASE WHEN u.rol = 'profesor' THEN p.id END as profesor_id,
        CASE WHEN u.rol = 'admin'    THEN a.id END as admin_id,
        CASE WHEN u.rol = 'admin'    THEN a.nivel_acceso END as nivel_acceso,
        CASE WHEN u.rol = 'estudiante' THEN e.id END as estudiante_id
       FROM usuario u
       LEFT JOIN profesor p ON p.usuario_id = u.id
       LEFT JOIN administrador a ON a.usuario_id = u.id
       LEFT JOIN estudiante e ON e.usuario_id = u.id
       WHERE u.cedula = $1`,
      [cedula]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Cédula o contraseña incorrecta' });

    const user = result.rows[0];

    if (user.estado === 'pre_cargado' || user.password === 'PENDIENTE_REGISTRO')
      return res.status(403).json({ message: 'Debes registrarte primero en la app con tu cédula' });

    if (user.estado === 'pendiente')
      return res.status(403).json({ message: 'Tu cuenta está pendiente de aprobación por el administrador' });

    if (user.estado === 'rechazado')
      return res.status(403).json({ message: 'Tu solicitud fue rechazada. Contacta al administrador' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      return res.status(401).json({ message: 'Cédula o contraseña incorrecta' });

    const semestre = await pool.query(
      `SELECT id FROM semestre WHERE fecha_inicio <= NOW() AND fecha_fin >= NOW() LIMIT 1`
    );

    const payload = {
      id: user.id,
      nombre: user.nombre,
      cedula: user.cedula,
      email: user.email,
      rol: user.rol,
      profesor_id: user.profesor_id,
      admin_id: user.admin_id,
      estudiante_id: user.estudiante_id,
      nivel_acceso: user.nivel_acceso,
      semestre_activo: semestre.rows[0]?.id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    await pool.query(
      `INSERT INTO log_actividad (usuario_id, accion, fecha_hora, detalles)
       VALUES ($1, 'LOGIN', NOW(), 'Inicio de sesión exitoso')`,
      [user.id]
    );

    res.json({ token, user: { ...payload, foto: user.foto } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.post('/register', async (req, res) => {
  const { nombre, cedula, email, telefono, password, rol,
          foto_facial_registrada, foto, carrera_id } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existente = await client.query(
      `SELECT u.id, u.estado, u.password, u.rol FROM usuario u WHERE u.cedula = $1`,
      [cedula]
    );

    if (existente.rows.length > 0 && existente.rows[0].estado !== 'pre_cargado') {
      return res.status(400).json({
        message: 'Esta cédula ya tiene una cuenta registrada. Inicia sesión directamente.'
      });
    }

    const hash = await bcrypt.hash(password, 10);
    let userId;
    let esVinculacion = false;

    if (existente.rows.length > 0 && existente.rows[0].estado === 'pre_cargado') {
      esVinculacion = true;
      userId = existente.rows[0].id;

      if (existente.rows[0].rol !== rol) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Tu cédula está registrada como ${existente.rows[0].rol}, no como ${rol}`
        });
      }

      await client.query(
        `UPDATE usuario SET
          nombre    = COALESCE($1, nombre),
          email     = $2,
          telefono  = COALESCE($3, telefono),
          password  = $4,
          foto      = COALESCE($5, foto),
          estado    = 'pendiente'
         WHERE id = $6`,
        [nombre, email, telefono || null, hash, foto || null, userId]
      );

      if (rol === 'profesor' && foto_facial_registrada) {
        await client.query(
          `UPDATE profesor SET foto_facial_registrada = $1 WHERE usuario_id = $2`,
          [foto_facial_registrada, userId]
        );
      }

    } else {
      const result = await client.query(
        `INSERT INTO usuario (nombre, cedula, email, telefono, password, rol, foto, estado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente') RETURNING id`,
        [nombre, cedula, email, telefono || null, hash, rol, foto || null]
      );
      userId = result.rows[0].id;

      if (rol === 'profesor') {
        await client.query(
          `INSERT INTO profesor (usuario_id, foto_facial_registrada) VALUES ($1,$2)`,
          [userId, foto_facial_registrada || null]
        );
      } else if (rol === 'estudiante') {
        await client.query(
          `INSERT INTO estudiante (usuario_id, matricula, carrera_id) VALUES ($1,$2,$3)`,
          [userId, cedula, carrera_id || null]
        );
      }
    }

    await client.query(
      `INSERT INTO log_actividad (usuario_id, accion, fecha_hora, detalles)
       VALUES ($1, 'REGISTRO', NOW(), $2)`,
      [userId, esVinculacion ? 'Perfil pre-cargado vinculado' : 'Registro nuevo']
    );

    await client.query('COMMIT');

    res.json({
      message: esVinculacion
        ? 'Tu perfil académico fue encontrado y vinculado. Pendiente de aprobación.'
        : 'Solicitud enviada. Pendiente de aprobación por el administrador.',
      vinculado: esVinculacion,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en /register:', error.message, '| code:', error.code);
    if (error.code === '23505')
      return res.status(400).json({ message: 'El email ya está en uso por otra cuenta' });
    res.status(500).json({ message: `Error del servidor: ${error.message}` });
  } finally {
    client.release();
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, cedula, email, foto, rol FROM usuario WHERE id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

router.put('/push-token', auth, async (req, res) => {
  const { pushToken } = req.body;
  try {
    await pool.query(
      `UPDATE usuario SET push_token = $1 WHERE id = $2`,
      [pushToken, req.user.id]
    );
    res.json({ message: 'Token actualizado' });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
