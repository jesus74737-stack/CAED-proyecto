const router = require('express').Router();
const pool = require('../config/database');
const { auth, soloAdmin } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');

// Registros pendientes de aprobación
router.get('/registros', auth, soloAdmin, async (req, res) => {
  const { estado = 'pendiente' } = req.query;
  try {
    const r = await pool.query(
      `SELECT u.*, 
        CASE WHEN u.rol = 'profesor' THEN p.id END as ref_id,
        CASE WHEN u.rol = 'estudiante' THEN e.id END as est_id
       FROM usuario u
       LEFT JOIN profesor p ON p.usuario_id = u.id
       LEFT JOIN estudiante e ON e.usuario_id = u.id
       WHERE u.estado = $1 AND u.rol != 'admin'
       ORDER BY u.fecha_registro DESC`,
      [estado]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// Aprobar registro
router.put('/registros/:id/aprobar', auth, soloAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE usuario SET estado = 'aprobado' WHERE id = $1`, [req.params.id]);
    await pool.query(`INSERT INTO log_actividad (usuario_id, accion, fecha_hora, detalles) VALUES ($1, 'APROBAR_REGISTRO', NOW(), $2)`,
      [req.user.id, `Usuario ${req.params.id} aprobado`]);
    res.json({ message: 'Usuario aprobado' });
  } catch { res.status(500).json({ message: 'Error al aprobar' }); }
});

// Rechazar registro
router.put('/registros/:id/rechazar', auth, soloAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE usuario SET estado = 'rechazado' WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Solicitud rechazada' });
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Panel principal
router.get('/alertas', auth, soloAdmin, async (req, res) => {
  const umbral = parseInt(process.env.UMBRAL_ALERTA_FALTAS) || 3;
  try {
    const [total, enAlerta, alertasHoy, pendientes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM profesor`),
      pool.query(`SELECT COUNT(DISTINCT ap.profesor_id) FROM asistencia_profesor ap
        JOIN sesion_clase sc ON sc.id = ap.sesion_id
        JOIN corte co ON co.id = sc.corte_id
        WHERE ap.estado = 'ausente' AND co.fecha_inicio <= NOW() AND co.fecha_fin >= NOW()
        GROUP BY ap.profesor_id HAVING COUNT(*) >= $1`, [umbral]),
      pool.query(`SELECT a.*, u.nombre as profesor_nombre FROM alerta a
        JOIN profesor p ON p.id = a.profesor_id JOIN usuario u ON u.id = p.usuario_id
        WHERE DATE(a.fecha_generacion) = CURRENT_DATE ORDER BY a.fecha_generacion DESC LIMIT 5`),
      pool.query(`SELECT COUNT(*) FROM usuario WHERE estado = 'pendiente'`),
    ]);
    res.json({
      total_profesores: parseInt(total.rows[0].count),
      profesores_en_alerta: enAlerta.rows.length,
      alertas_hoy: alertasHoy.rows,
      porcentaje_asistencia: 85,
      registros_pendientes: parseInt(pendientes.rows[0].count),
    });
  } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// Todos los profesores
router.get('/profesores', auth, soloAdmin, async (req, res) => {
  const umbral = parseInt(process.env.UMBRAL_ALERTA_FALTAS) || 3;
  try {
    const r = await pool.query(
      `SELECT p.id, u.nombre, u.cedula, u.email, u.telefono, u.foto,
        d.nombre as departamento_nombre, p.especialidad,
        COUNT(CASE WHEN ap.estado = 'presente' THEN 1 END) as presentes,
        COUNT(CASE WHEN ap.estado = 'tardio' THEN 1 END) as tardios,
        COUNT(CASE WHEN ap.estado = 'ausente' THEN 1 END) as inasistencias,
        COUNT(CASE WHEN ap.estado = 'justificado' THEN 1 END) as justificadas,
        COUNT(CASE WHEN ap.estado = 'ausente' THEN 1 END) >= $1 as en_alerta
       FROM profesor p JOIN usuario u ON u.id = p.usuario_id
       JOIN departamento d ON d.id = p.departamento_id
       LEFT JOIN asistencia_profesor ap ON ap.profesor_id = p.id
       GROUP BY p.id, u.nombre, u.cedula, u.email, u.telefono, u.foto, d.nombre, p.especialidad
       ORDER BY inasistencias DESC`, [umbral]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Profesores en alerta
router.get('/profesores/alertas', auth, soloAdmin, async (req, res) => {
  const umbral = parseInt(process.env.UMBRAL_ALERTA_FALTAS) || 3;
  try {
    const r = await pool.query(
      `SELECT p.id, u.nombre, u.cedula, u.email, u.telefono, u.foto, d.nombre as departamento_nombre,
        COUNT(CASE WHEN ap.estado='ausente' THEN 1 END) as total_inasistencias,
        COUNT(CASE WHEN ap.estado='tardio' THEN 1 END) as total_tardios
       FROM profesor p JOIN usuario u ON u.id = p.usuario_id JOIN departamento d ON d.id = p.departamento_id
       JOIN asistencia_profesor ap ON ap.profesor_id = p.id
       JOIN sesion_clase sc ON sc.id = ap.sesion_id JOIN corte co ON co.id = sc.corte_id
       WHERE co.fecha_inicio <= NOW() AND co.fecha_fin >= NOW()
       GROUP BY p.id, u.nombre, u.cedula, u.email, u.telefono, u.foto, d.nombre
       HAVING COUNT(CASE WHEN ap.estado='ausente' THEN 1 END) >= $1
       ORDER BY total_inasistencias DESC`, [umbral]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Ranking
router.get('/ranking', auth, soloAdmin, async (req, res) => {
  const { semestre, corte } = req.query;
  const filtroCorte = corte ? `AND co.numero_corte = ${parseInt(corte)}` : '';
  try {
    const r = await pool.query(
      `SELECT p.id, u.nombre as profesor_nombre, d.nombre as departamento_nombre,
        COUNT(CASE WHEN ap.estado='ausente' THEN 1 END) as total_inasistencias,
        COUNT(CASE WHEN ap.estado='tardio' THEN 1 END) as total_tardios
       FROM profesor p JOIN usuario u ON u.id = p.usuario_id JOIN departamento d ON d.id = p.departamento_id
       JOIN asistencia_profesor ap ON ap.profesor_id = p.id
       JOIN sesion_clase sc ON sc.id = ap.sesion_id JOIN corte co ON co.id = sc.corte_id
       JOIN carga_academica ca ON ca.id = sc.carga_academica_id
       WHERE ca.semestre_id = $1 ${filtroCorte}
       GROUP BY p.id, u.nombre, d.nombre ORDER BY total_inasistencias DESC`,
      [semestre || 1]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Estadísticas carrera
router.get('/estadisticas/carrera', auth, soloAdmin, async (req, res) => {
  const { semestre, corte } = req.query;
  try {
    const r = await pool.query(
      `SELECT c.id, c.nombre as carrera_nombre, d.nombre as departamento_nombre,
        COUNT(sc.id) as total_clases_programadas,
        COUNT(CASE WHEN ap.estado='ausente' THEN 1 END) as total_inasistencias,
        COUNT(CASE WHEN ap.estado='tardio' THEN 1 END) as total_tardios,
        ROUND((COUNT(sc.id) - COUNT(CASE WHEN ap.estado='ausente' THEN 1 END)) * 100.0 / NULLIF(COUNT(sc.id),0), 1) as porcentaje_cumplimiento
       FROM carrera c JOIN departamento d ON d.id = c.departamento_id
       JOIN materia m ON m.carrera_id = c.id
       JOIN carga_academica ca ON ca.materia_id = m.id AND ca.semestre_id = $1
       LEFT JOIN sesion_clase sc ON sc.carga_academica_id = ca.id
       LEFT JOIN asistencia_profesor ap ON ap.sesion_id = sc.id
       GROUP BY c.id, c.nombre, d.nombre ORDER BY total_inasistencias DESC`,
      [semestre || 1]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Justificar inasistencia
router.put('/asistencia/:id/justificar', auth, soloAdmin, async (req, res) => {
  const { justificacion } = req.body;
  try {
    await pool.query(
      `UPDATE asistencia_profesor SET estado='justificado', justificacion=$1, justificado_por_admin_id=$2, fecha_justificacion=NOW() WHERE id=$3`,
      [justificacion, req.user.admin_id, req.params.id]
    );
    res.json({ message: 'Justificado' });
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Historial disciplinario
router.get('/profesor/:id/disciplinario', auth, soloAdmin, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT hd.*, u.nombre as admin_nombre FROM historial_disciplinario hd
       JOIN administrador a ON a.id = hd.admin_id JOIN usuario u ON u.id = a.usuario_id
       WHERE hd.profesor_id = $1 ORDER BY hd.fecha DESC`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Registrar acción disciplinaria
router.post('/profesor/:id/disciplinario', auth, soloAdmin, async (req, res) => {
  const { descripcion, accion_tomada, seguimiento } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO historial_disciplinario (profesor_id, admin_id, fecha, descripcion, accion_tomada, seguimiento)
       VALUES ($1, $2, NOW(), $3, $4, $5) RETURNING *`,
      [req.params.id, req.user.admin_id, descripcion, accion_tomada, seguimiento]
    );
    res.json(r.rows[0]);
  } catch { res.status(500).json({ message: 'Error' }); }
});

// Exportar reporte
router.post('/reporte/exportar', auth, soloAdmin, async (req, res) => {
  const { tipo } = req.body;
  try {
    const ranking = await pool.query(
      `SELECT u.nombre, d.nombre as departamento,
        COUNT(CASE WHEN ap.estado='ausente' THEN 1 END) as faltas,
        COUNT(CASE WHEN ap.estado='tardio' THEN 1 END) as tardios,
        COUNT(CASE WHEN ap.estado='presente' THEN 1 END) as presentes
       FROM profesor p JOIN usuario u ON u.id=p.usuario_id JOIN departamento d ON d.id=p.departamento_id
       LEFT JOIN asistencia_profesor ap ON ap.profesor_id=p.id
       GROUP BY u.nombre, d.nombre ORDER BY faltas DESC`
    );
    if (tipo === 'PDF') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=reporte-${moment().format('YYYYMMDD')}.pdf`);
      doc.pipe(res);
      doc.fontSize(22).fillColor('#0A2463').text('CAED — Reporte de Asistencia Docente', { align: 'center' });
      doc.fontSize(11).fillColor('#666').text(`Generado: ${moment().format('DD/MM/YYYY HH:mm')}`, { align: 'center' });
      doc.moveDown(2);
      ranking.rows.forEach((p, i) => {
        doc.fontSize(11).fillColor('#333').text(`${i + 1}. ${p.nombre} (${p.departamento}) | ✅ ${p.presentes} | ⏰ ${p.tardios} | ❌ ${p.faltas}`);
      });
      doc.end();
    } else {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Asistencia');
      ws.columns = [
        { header: '#', key: 'pos', width: 5 },
        { header: 'Profesor', key: 'nombre', width: 30 },
        { header: 'Departamento', key: 'departamento', width: 22 },
        { header: 'Presentes', key: 'presentes', width: 12 },
        { header: 'Tardíos', key: 'tardios', width: 12 },
        { header: 'Faltas', key: 'faltas', width: 12 },
      ];
      ranking.rows.forEach((p, i) => ws.addRow({ pos: i + 1, ...p }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2463' } };
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reporte-${moment().format('YYYYMMDD')}.xlsx`);
      await wb.xlsx.write(res);
      res.end();
    }
    await pool.query(`INSERT INTO reporte_exportable (admin_id, tipo, fecha_generacion) VALUES ($1, $2, NOW())`, [req.user.admin_id, tipo]);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Error' }); }
});

module.exports = router;
