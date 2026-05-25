const router = require('express').Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Historial del estudiante
router.get('/:id/historial', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ae.*, sc.fecha, m.nombre as materia_nombre,
        co.numero_corte as corte, u.nombre as profesor_nombre
       FROM asistencia_estudiante ae
       JOIN sesion_clase sc ON sc.id = ae.sesion_id
       JOIN carga_academica ca ON ca.id = sc.carga_academica_id
       JOIN materia m ON m.id = ca.materia_id
       JOIN profesor p ON p.id = ca.profesor_id
       JOIN usuario u ON u.id = p.usuario_id
       JOIN corte co ON co.id = sc.corte_id
       WHERE ae.estudiante_id = $1
       ORDER BY sc.fecha DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

module.exports = router;
