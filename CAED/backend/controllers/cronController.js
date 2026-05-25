const pool = require('../config/database');
const moment = require('moment');
const { enviarNotificacionPush } = require('./notificacionController');

// Verificar sesiones no activadas y notificar al profesor
const verificarSesionesNoActivadas = async () => {
  try {
    const minutosAlerta = parseInt(process.env.MINUTOS_NOTIFICACION_PROFESOR) || 15;
    const ahora = moment();
    const horaLimite = moment().subtract(minutosAlerta, 'minutes').format('HH:mm:ss');
    const hoy = ahora.format('YYYY-MM-DD');
    const diaSemana = ahora.format('dddd').toLowerCase();

    // Buscar clases que deberían haber iniciado hace X minutos y no tienen sesión
    const clasesNoActivadas = await pool.query(
      `SELECT ca.*, m.nombre as materia_nombre,
        u.nombre as profesor_nombre, p.id as profesor_id,
        a.id as alerta_existente
       FROM carga_academica ca
       JOIN materia m ON m.id = ca.materia_id
       JOIN profesor p ON p.id = ca.profesor_id
       JOIN usuario u ON u.id = p.usuario_id
       LEFT JOIN sesion_clase sc ON sc.carga_academica_id = ca.id AND sc.fecha = $1
       LEFT JOIN alerta a ON a.profesor_id = p.id AND a.tipo = 'no_activo' AND DATE(a.fecha_generacion) = $1
       LEFT JOIN calendario_academico cal ON cal.fecha = $1 AND cal.tipo IN ('feriado','receso')
       WHERE sc.id IS NULL
         AND cal.id IS NULL
         AND ca.horario_inicio <= $2
         AND ca.horario_inicio >= $3
         AND LOWER(ca.dias_semana) LIKE $4
         AND a.id IS NULL`,
      [hoy, ahora.format('HH:mm:ss'), horaLimite, `%${diaSemana}%`]
    );

    for (const clase of clasesNoActivadas.rows) {
      // Notificar al profesor
      await enviarNotificacionPush(
        clase.profesor_id,
        '⏰ Recordatorio de asistencia',
        `Debes activar la sesión de ${clase.materia_nombre}. Si no lo haces, se generará una inasistencia.`
      );

      // Registrar alerta
      await pool.query(
        `INSERT INTO alerta (profesor_id, tipo, descripcion, fecha_generacion, fecha_notificacion_profesor)
         VALUES ($1, 'no_activo', $2, NOW(), NOW())`,
        [clase.profesor_id, `No activó la sesión de ${clase.materia_nombre} a tiempo`]
      );

      console.log(`✅ Notificación enviada al profesor ${clase.profesor_nombre} - ${clase.materia_nombre}`);
    }
  } catch (error) {
    console.error('Error en cron verificarSesionesNoActivadas:', error);
  }
};

// Cerrar ventanas de tardíos y generar inasistencias automáticas
const cerrarVentanasTardios = async () => {
  try {
    const ahora = moment();

    // Cerrar ventanas de tardíos que ya expiraron
    await pool.query(
      `UPDATE sesion_clase SET estado = 'cerrada', hora_cierre = NOW(),
        duracion_real_minutos = EXTRACT(EPOCH FROM (NOW() - hora_activacion))/60
       WHERE estado = 'activa' AND ventana_tardio_fin <= NOW()`
    );

    // Generar inasistencias para clases que nunca se activaron (después del horario)
    const hoy = ahora.format('YYYY-MM-DD');
    const diaSemana = ahora.format('dddd').toLowerCase();

    const clasesInasistencia = await pool.query(
      `SELECT ca.*, p.id as profesor_id, m.nombre as materia_nombre,
        co.id as corte_id
       FROM carga_academica ca
       JOIN materia m ON m.id = ca.materia_id
       JOIN profesor p ON p.id = ca.profesor_id
       JOIN corte co ON co.fecha_inicio <= NOW() AND co.fecha_fin >= NOW()
       LEFT JOIN sesion_clase sc ON sc.carga_academica_id = ca.id AND sc.fecha = $1
       LEFT JOIN calendario_academico cal ON cal.fecha = $1 AND cal.tipo IN ('feriado','receso')
       WHERE sc.id IS NULL
         AND cal.id IS NULL
         AND ca.horario_fin < $2
         AND LOWER(ca.dias_semana) LIKE $3`,
      [hoy, ahora.format('HH:mm:ss'), `%${diaSemana}%`]
    );

    for (const clase of clasesInasistencia.rows) {
      // Crear sesión con estado inasistencia
      const sesion = await pool.query(
        `INSERT INTO sesion_clase (carga_academica_id, corte_id, fecha, estado, es_sustitucion)
         VALUES ($1, $2, $3, 'inasistencia', false)
         ON CONFLICT DO NOTHING RETURNING id`,
        [clase.id, clase.corte_id, hoy]
      );

      if (sesion.rows.length > 0) {
        // Registrar asistencia ausente
        await pool.query(
          `INSERT INTO asistencia_profesor (sesion_id, profesor_id, estado)
           VALUES ($1, $2, 'ausente') ON CONFLICT DO NOTHING`,
          [sesion.rows[0].id, clase.profesor_id]
        );

        // Verificar umbral de alerta
        const umbral = parseInt(process.env.UMBRAL_ALERTA_FALTAS) || 3;
        const faltas = await pool.query(
          `SELECT COUNT(*) FROM asistencia_profesor ap
           JOIN sesion_clase sc ON sc.id = ap.sesion_id
           JOIN corte co ON co.id = sc.corte_id
           WHERE ap.profesor_id = $1 AND ap.estado = 'ausente'
           AND co.fecha_inicio <= NOW() AND co.fecha_fin >= NOW()`,
          [clase.profesor_id]
        );

        if (parseInt(faltas.rows[0].count) >= umbral) {
          await pool.query(
            `INSERT INTO alerta (profesor_id, tipo, descripcion, fecha_generacion)
             VALUES ($1, 'inasistencia', $2, NOW())
             ON CONFLICT DO NOTHING`,
            [clase.profesor_id, `Superó el umbral de ${umbral} faltas en el corte actual`]
          );
        }

        console.log(`✅ Inasistencia generada: profesor ${clase.profesor_id} - ${clase.materia_nombre}`);
      }
    }
  } catch (error) {
    console.error('Error en cron cerrarVentanasTardios:', error);
  }
};

module.exports = { verificarSesionesNoActivadas, cerrarVentanasTardios };
