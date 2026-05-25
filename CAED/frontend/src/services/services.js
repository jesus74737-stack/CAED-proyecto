import api from './api';
import * as Location from 'expo-location';

export const authService = {
  login: (cedula, password) => api.post('/auth/login', { cedula, password }),
  register: (data) => api.post('/auth/register', data),
  savePushToken: (token) => api.put('/auth/push-token', { pushToken: token }),
};

export const profesorService = {
  getCargaAcademica: (id, sem) => api.get(`/profesor/${id}/carga-academica?semestre=${sem}`),
  activarSesion: (data) => api.post('/sesion/activar', data),
  cerrarSesion: (id) => api.put(`/sesion/${id}/cerrar`),
  habilitarEstudiante: (sesId, estId) => api.post(`/sesion/${sesId}/habilitar`, { estudianteId: estId }),
  getEstudiantesClase: (sesId) => api.get(`/profesor/sesion/${sesId}/estudiantes`),
  getHistorial: (id) => api.get(`/profesor/${id}/historial`),
  getEstadisticas: (id) => api.get(`/profesor/${id}/estadisticas`),
  registrarSustitucion: (data) => api.post('/profesor/sustitucion', data),
};

export const estudianteService = {
  getSesionesActivas: () => api.get('/sesion/activas'),
  firmarAsistencia: (id, coords) => api.post(`/sesion/${id}/firmar`, { coordenadas: coords }),
  getHistorial: (id) => api.get(`/estudiante/${id}/historial`),
};

export const adminService = {
  getAlertas: () => api.get('/admin/alertas'),
  getProfesores: () => api.get('/admin/profesores'),
  getProfesoresEnAlerta: () => api.get('/admin/profesores/alertas'),
  getRanking: (sem, corte) => api.get(`/admin/ranking?semestre=${sem}&corte=${corte || ''}`),
  getEstadisticasCarrera: (sem, corte) => api.get(`/admin/estadisticas/carrera?semestre=${sem}&corte=${corte || ''}`),
  justificarInasistencia: (id, just) => api.put(`/admin/asistencia/${id}/justificar`, { justificacion: just }),
  exportarReporte: (tipo, filtros) => api.post('/admin/reporte/exportar', { tipo, ...filtros }),
  registrarAccionDisciplinaria: (profId, data) => api.post(`/admin/profesor/${profId}/disciplinario`, data),
  getHistorialDisciplinario: (profId) => api.get(`/admin/profesor/${profId}/disciplinario`),
  getRegistrosPendientes: (estado = 'pendiente') => api.get(`/admin/registros?estado=${estado}`),
  aprobarRegistro: (id) => api.put(`/admin/registros/${id}/aprobar`),
  rechazarRegistro: (id) => api.put(`/admin/registros/${id}/rechazar`),
};

export const locationService = {
  getCurrentLocation: async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Permiso denegado');
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  },
  isInsideCampus: (coords, campus, radio) => {
    const R = 6371000;
    const dLat = ((campus.latitude - coords.latitude) * Math.PI) / 180;
    const dLon = ((campus.longitude - coords.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(coords.latitude*Math.PI/180) * Math.cos(campus.latitude*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= radio;
  },
};
