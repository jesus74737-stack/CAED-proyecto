import axios from 'axios';

const API_URL = 'https://caed-proyecto-production.up.railway.app/api'; // Cambia esto por tu URL del backend

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado, manejar logout
    }
    return Promise.reject(error);
  }
);

export default api;
