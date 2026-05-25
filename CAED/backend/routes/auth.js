const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  const { cedula, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT u.*, 
        CASE WHEN u.rol = 'profesor' THEN p.id END as profesor_id,
        CASE WHEN u.rol = 'admin' THEN a.id END as admin_id,
        CASE WHEN u.rol = 'estudiante' THEN e.id END as estudiante_id,
        CASE WHEN u.rol = 'admin' THEN a.nivel_acceso END as nivel_acceso
       FROM usuario u
       LEFT JOIN profesor p ON p.usuario_id = u.id
       LEFT JOIN administrador a ON a.usuario_id = u.id
       LEFT JOIN estudiante e ON e.usuario_id = u.id
       WHERE u.cedula = $1`,
      [cedula]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Credenciales incorrectas' });

    const user = result.rows[0];

    if (user.estado !== 'aprobado')
      return res.status(403).json({ message: 'Tu cuenta aún no ha sido aprobada por el administrador' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      return res.status(401).json({ message: 'Credenciales incorrectas' });

    const semestre = await pool.query(
      `SELECT id FROM semestre WHERE fecha_inicio <= NOW() AND fecha_fin >= NOW() LIMIT 1`
    );

    const payload = {
      id: user.id,
      nombre: user.nombre,
      cedula: user.cedula,
      email: user.email,
      foto: user.foto,
      rol: user.rol,
      profesor_id: user.profesor_id,
      admin_id: user.admin_id,
      estudiante_id: user.estudiante_id,
      nivel_acceso: user.nivel_acceso,
      semestre_activo: semestre.rows[0]?.id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    await pool.query(
      `INSERT INTO log_actividad (usuario_id, accion, fecha_hora, detalles) VALUES ($1, $2, NOW(), $3)`,
      [user.id, 'LOGIN', 'Inicio de sesión exitoso']
    );

    res.json({ token, user: payload });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Registro
router.post('/register', async (req, res) => {
  const { nombre, cedula, email, telefono, password, rol,
          foto_facial_registrada, foto, carrera_id } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuario (nombre, cedula, email, telefono, password, rol, foto, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente') RETURNING id`,
      [nombre, cedula, email, telefono || null, hash, rol, foto || null]
    );
    const userId = result.rows[0].id;

    if (rol === 'profesor') {
      await pool.query(
        `INSERT INTO profesor (usuario_id, foto_facial_registrada) VALUES ($1,$2)`,
        [userId, foto_facial_registrada || null]
      );
    } else if (rol === 'estudiante') {
      await pool.query(
        `INSERT INTO estudiante (usuario_id, matricula, carrera_id) VALUES ($1,$2,$3)`,
        [userId, cedula, carrera_id || null]
      );
    }

    res.json({ message: 'Solicitud enviada, pendiente de aprobación por el administrador' });
  } catch (error) {
    console.error(error);
    if (error.code === '23505')
      return res.status(400).json({ message: 'La cédula o email ya está registrado' });
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Perfil
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, cedula, email, foto, rol FROM usuario WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Actualizar push token
router.put('/push-token', auth, async (req, res) => {
  const { pushToken } = req.body;
  try {
    await pool.query(
      'UPDATE usuario SET push_token = $1 WHERE id = $2',
      [pushToken, req.user.id]
    );
    res.json({ message: 'Token actualizado' });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
