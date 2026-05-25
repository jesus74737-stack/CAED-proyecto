const router = require('express').Router();
const pool = require('../config/database');
const { auth, soloProfesor } = require('../middleware/auth');
const moment = require('moment');
const { enviarNotificacion } = require('../controllers/notificacionController');

// Activar sesión de clase
router.post('/activar', auth, soloProfesor, async (req, res) => {
  const { carga_academica_id, foto_facial, coordenadas_gps, profesor_id } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const hoy = moment().format('YYYY-MM-DD');

    // Verificar sesión duplicada
    const duplicada = await client.query(
      `SELECT id FROM sesion_clase WHERE carga_academica_id = $1 AND fecha = $2 AND estado != 'inasistencia'`,
      [carga_academica_id, hoy]
    );
    if (duplicada.rows.length > 0)
      return res.status(400).json({ message: 'Ya existe una sesión activa para esta clase hoy' });

    // Verificar horario oficial
    const carga = await client.query(
      `SELECT * FROM carga_academica WHERE id = $1`,
      [carga_academica_id]
    );
    if (carga.rows.length === 0)
      return res.status(404).json({ message: 'Clase no encontrada' });

    // Verificar si es feriado
    const feriado = await client.query(
      `SELECT id FROM calendario_academico WHERE fecha = $1 AND tipo IN ('feriado', 'receso')`,
      [hoy]
    );
    if (feriado.rows.length > 0)
      return res.status(400).json({ message: 'Hoy es feriado o receso, no se puede activar sesión' });

    // Obtener corte activo
    const corte = await client.query(
      `SELECT id FROM corte WHERE fecha_inicio <= NOW() AND fecha_fin >= NOW() LIMIT 1`
    );
    if (corte.rows.length === 0)
      return res.status(400).json({ message: 'No hay un corte activo en este momento' });

    const ahora = moment();
    const ventanaNormalFin = moment().add(carga.rows[0].horario_fin ? 0 : 15, 'minutes');
    const ventanaTardioFin = moment().add(parseInt(process.env.MINUTOS_VENTANA_TARDIO) || 30, 'minutes');

    // Calcular estado del profesor (presente o tardío)
    const horarioInicio = moment(carga.rows[0].horario_inicio, 'HH:mm');
    const minutosRetraso = ahora.diff(horarioInicio, 'minutes');
    const estadoProfesor = minutosRetraso > 0 ? 'tardio' : 'presente';

    // Crear sesión
    const sesion = await client.query(
      `INSERT INTO sesion_clase 
       (carga_academica_id, corte_id, fecha, hora_activacion, foto_facial_profesor, coordenadas_gps, estado, ventana_normal_fin, ventana_tardio_fin, es_sustitucion)
       VALUES ($1, $2, $3, NOW(), $4, $5, 'activa', $6, $7, false)
       RETURNING *`,
      [
        carga_academica_id,
        corte.rows[0].id,
        hoy,
        foto_facial,
        coordenadas_gps,
        ventanaNormalFin.toISOString(),
        ventanaTardioFin.toISOString(),
      ]
    );

    // Registrar asistencia del profesor
    await client.query(
      `INSERT INTO asistencia_profesor (sesion_id, profesor_id, hora_firma, estado, minutos_retraso)
       VALUES ($1, $2, NOW(), $3, $4)`,
      [sesion.rows[0].id, profesor_id, estadoProfesor, Math.max(0, minutosRetraso)]
    );

    // Log
    await client.query(
      `INSERT INTO log_actividad (usuario_id, accion, fecha_hora, coordenadas_gps, detalles)
       VALUES ($1, 'ACTIVAR_SESION', NOW(), $2, $3)`,
      [req.user.id, coordenadas_gps, `Sesión ${sesion.rows[0].id} activada`]
    );

    await client.query('COMMIT');
    res.json(sesion.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error al activar sesión' });
  } finally {
    client.release();
  }
});

// Cerrar sesión
router.put('/:id/cerrar', auth, soloProfesor, async (req, res) => {
  try {
    const { id } = req.params;
    const sesion = await pool.query(
      `UPDATE sesion_clase SET estado = 'cerrada', hora_cierre = NOW(),
       duracion_real_minutos = EXTRACT(EPOCH FROM (NOW() - hora_activacion))/60
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Marcar ausentes a los que no firmaron
    await pool.query(
      `UPDATE asistencia_estudiante SET estado = 'ausente'
       WHERE sesion_id = $1 AND estado IS NULL`,
      [id]
    );

    // Verificar si nadie firmó
    const firmados = await pool.query(
      `SELECT COUNT(*) FROM asistencia_estudiante WHERE sesion_id = $1 AND estado != 'ausente'`,
      [id]
    );
    if (parseInt(firmados.rows[0].count) === 0) {
      await pool.query(
        `UPDATE sesion_clase SET estado = 'sin_asistentes' WHERE id = $1`,
        [id]
      );
    }

    res.json(sesion.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
});

// Habilitar estudiante
router.post('/:id/habilitar', auth, soloProfesor, async (req, res) => {
  const { id } = req.params;
  const { estudianteId } = req.body;
  try {
    const sesion = await pool.query(`SELECT * FROM sesion_clase WHERE id = $1`, [id]);
    if (!sesion.rows[0] || sesion.rows[0].estado !== 'activa')
      return res.status(400).json({ message: 'Sesión no activa' });

    // Crear o actualizar registro del estudiante
    await pool.query(
      `INSERT INTO asistencia_estudiante (sesion_id, estudiante_id, habilitado_por_profesor)
       VALUES ($1, $2, true)
       ON CONFLICT (sesion_id, estudiante_id) DO UPDATE SET habilitado_por_profesor = true`,
      [id, estudianteId]
    );

    // Notificar al estudiante
    await enviarNotificacion(estudianteId, 'Asistencia habilitada', 'Tu profesor te ha habilitado para firmar la asistencia');

    res.json({ message: 'Estudiante habilitado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al habilitar estudiante' });
  }
});

// Firmar asistencia (estudiante)
router.post('/:id/firmar', auth, async (req, res) => {
  const { id } = req.params;
  const { coordenadas } = req.body;
  try {
    const sesion = await pool.query(`SELECT * FROM sesion_clase WHERE id = $1`, [id]);
    if (!sesion.rows[0] || sesion.rows[0].estado !== 'activa')
      return res.status(400).json({ message: 'Sesión no activa' });

    const registro = await pool.query(
      `SELECT * FROM asistencia_estudiante WHERE sesion_id = $1 AND estudiante_id = $2`,
      [id, req.user.estudiante_id]
    );

    if (!registro.rows[0]?.habilitado_por_profesor)
      return res.status(403).json({ message: 'No estás habilitado para firmar' });

    if (registro.rows[0]?.hora_firma)
      return res.status(400).json({ message: 'Ya firmaste la asistencia' });

    const ahora = moment();
    const ventanaNormal = moment(sesion.rows[0].ventana_normal_fin);
    const esTardio = ahora.isAfter(ventanaNormal);
    const estado = esTardio ? 'tardio' : 'presente';

    await pool.query(
      `UPDATE asistencia_estudiante SET hora_firma = NOW(), estado = $1
       WHERE sesion_id = $2 AND estudiante_id = $3`,
      [estado, id, req.user.estudiante_id]
    );

    res.json({ message: 'Asistencia firmada', estado });
  } catch (error) {
    res.status(500).json({ message: 'Error al firmar asistencia' });
  }
});

// Sesiones activas para estudiantes
router.get('/activas', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sc.*, m.nombre as materia_nombre, ca.aula,
        u.nombre as profesor_nombre,
        ae.habilitado_por_profesor as habilitado,
        ae.hora_firma, ae.estado as estado_firma,
        NOW() > sc.ventana_normal_fin as es_tardio
       FROM sesion_clase sc
       JOIN carga_academica ca ON ca.id = sc.carga_academica_id
       JOIN materia m ON m.id = ca.materia_id
       JOIN profesor p ON p.id = ca.profesor_id
       JOIN usuario u ON u.id = p.usuario_id
       LEFT JOIN asistencia_estudiante ae ON ae.sesion_id = sc.id AND ae.estudiante_id = $1
       WHERE sc.estado = 'activa' AND sc.fecha = CURRENT_DATE`,
      [req.user.estudiante_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sesiones' });
  }
});

module.exports = router;
