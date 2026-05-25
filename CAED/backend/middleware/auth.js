const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Acceso denegado' });
  next();
};

const soloProfesor = (req, res, next) => {
  if (req.user.rol !== 'profesor') return res.status(403).json({ message: 'Acceso denegado' });
  next();
};

module.exports = { auth, soloAdmin, soloProfesor };
