const router = require('express').Router();
const pool = require('../config/database');
const { auth, soloProfesor } = require('../middleware/auth');

// Carga académica del profesor
router.get('/:id/carga-academica', auth, async (req, res) => {
  const { id } = req.params;
  const { semestre } = req.query;
  try {
    const result = await pool.query(
      `SELECT ca.*, m.nombre as materia_nombre, m.codigo as materia_codigo,
        c.nombre as carrera_nombre, d.nombre as departamento_nombre
       FROM carga_academica ca
       JOIN materia m ON m.id = ca.materia_id
       JOIN carrera c ON c.id = m.carrera_id
       JOIN departamento d ON d.id = m.departamento_id
       WHERE ca.profesor_id = $1 AND ca.semestre_id = $2`,
      [id, semestre]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener carga académica' });
  }
});

// Historial de asistencia del profesor
router.get('/:id/historial', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ap.*, sc.fecha, sc.hora_activacion, sc.hora_cierre, sc.duracion_real_minutos,
        m.nombre as materia_nombre, co.numero_corte as corte
       FROM asistencia_profesor ap
       JOIN sesion_clase sc ON sc.id = ap.sesion_id
       JOIN carga_academica ca ON ca.id = sc.carga_academica_id
       JOIN materia m ON m.id = ca.materia_id
       JOIN corte co ON co.id = sc.corte_id
       WHERE ap.profesor_id = $1
       ORDER BY sc.fecha DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

// Estadísticas del profesor por corte
router.get('/:id/estadisticas', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT co.numero_corte as corte,
        COUNT(CASE WHEN ap.estado = 'presente' THEN 1 END) as presentes,
        COUNT(CASE WHEN ap.estado = 'tardio' THEN 1 END) as tardios,
        COUNT(CASE WHEN ap.estado = 'ausente' THEN 1 END) as ausentes,
        COUNT(CASE WHEN ap.estado = 'justificado' THEN 1 END) as justificadas,
        COUNT(CASE WHEN ap.estado = 'cubierta' THEN 1 END) as cubiertas,
        ROUND(COUNT(CASE WHEN ap.estado IN ('presente','tardio','cubierta') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as porcentaje
       FROM asistencia_profesor ap
       JOIN sesion_clase sc ON sc.id = ap.sesion_id
       JOIN corte co ON co.id = sc.corte_id
       JOIN carga_academica ca ON ca.id = sc.carga_academica_id
       WHERE ap.profesor_id = $1
       GROUP BY co.numero_corte
       ORDER BY co.numero_corte`,
      [id]
    );
    // Formatear por corte
    const stats = {};
    result.rows.forEach(r => {
      stats[`corte${r.corte}`] = r;
    });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
});

// Estudiantes de una sesión
router.get('/sesion/:sesionId/estudiantes', auth, soloProfesor, async (req, res) => {
  const { sesionId } = req.params;
  try {
    const result = await pool.query(
      `SELECT e.id, u.nombre, e.matricula,
        ae.habilitado_por_profesor as habilitado,
        ae.hora_firma, ae.estado as estado_firma,
        CASE WHEN ae.estado = 'tardio' THEN true ELSE false END as firmado_tardio,
        CASE WHEN ae.hora_firma IS NOT NULL THEN true ELSE false END as firmado
       FROM estudiante e
       JOIN usuario u ON u.id = e.usuario_id
       JOIN carga_academica ca ON ca.id = (SELECT carga_academica_id FROM sesion_clase WHERE id = $1)
       LEFT JOIN asistencia_estudiante ae ON ae.sesion_id = $1 AND ae.estudiante_id = e.id
       ORDER BY u.nombre`,
      [sesionId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estudiantes' });
  }
});

// Registrar sustitución
router.post('/sustitucion', auth, async (req, res) => {
  const { carga_academica_id, profesor_sustituto_id, fecha } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const corte = await client.query(
      `SELECT id FROM corte WHERE fecha_inicio <= $1 AND fecha_fin >= $1 LIMIT 1`,
      [fecha]
    );

    const sesion = await client.query(
      `INSERT INTO sesion_clase (carga_academica_id, corte_id, fecha, hora_activacion, estado, es_sustitucion, profesor_sustituto_id)
       VALUES ($1, $2, $3, NOW(), 'cerrada', true, $4) RETURNING *`,
      [carga_academica_id, corte.rows[0].id, fecha, profesor_sustituto_id]
    );

    // Registrar como cubierta para el profesor original
    const ca = await client.query(`SELECT profesor_id FROM carga_academica WHERE id = $1`, [carga_academica_id]);
    await client.query(
      `INSERT INTO asistencia_profesor (sesion_id, profesor_id, estado) VALUES ($1, $2, 'cubierta')`,
      [sesion.rows[0].id, ca.rows[0].profesor_id]
    );

    await client.query('COMMIT');
    res.json(sesion.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al registrar sustitución' });
  } finally {
    client.release();
  }
});

module.exports = router;
