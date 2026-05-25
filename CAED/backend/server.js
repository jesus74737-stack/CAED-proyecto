require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/profesor', require('./routes/profesor'));
app.use('/api/estudiante', require('./routes/estudiante'));
app.use('/api/sesion', require('./routes/sesion'));
app.use('/api/admin', require('./routes/admin'));

// Notificar profesor si no ha activado sesión en 15 min
cron.schedule('* * * * *', async () => {
  const { verificarSesionesNoActivadas } = require('./controllers/cronController');
  await verificarSesionesNoActivadas();
});

// Cerrar ventanas de tardíos y generar inasistencias automáticas
cron.schedule('* * * * *', async () => {
  const { cerrarVentanasTardios } = require('./controllers/cronController');
  await cerrarVentanasTardios();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ CAED Backend corriendo en puerto ${PORT}`));
