const { Expo } = require('expo-server-sdk');
const pool = require('../config/database');

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

const enviarNotificacionPush = async (usuarioId, titulo, cuerpo) => {
  try {
    // Obtener token push del usuario
    const result = await pool.query(
      `SELECT push_token FROM usuario WHERE id = $1`,
      [usuarioId]
    );

    const pushToken = result.rows[0]?.push_token;
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

    const mensaje = {
      to: pushToken,
      sound: 'default',
      title: titulo,
      body: cuerpo,
      data: { timestamp: new Date().toISOString() },
    };

    const chunks = expo.chunkPushNotifications([mensaje]);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error('Error enviando notificación:', error);
  }
};

const enviarNotificacion = async (estudianteId, titulo, cuerpo) => {
  try {
    const result = await pool.query(
      `SELECT u.id FROM estudiante e JOIN usuario u ON u.id = e.usuario_id WHERE e.id = $1`,
      [estudianteId]
    );
    if (result.rows[0]) {
      await enviarNotificacionPush(result.rows[0].id, titulo, cuerpo);
    }
  } catch (error) {
    console.error('Error en enviarNotificacion:', error);
  }
};

module.exports = { enviarNotificacionPush, enviarNotificacion };
