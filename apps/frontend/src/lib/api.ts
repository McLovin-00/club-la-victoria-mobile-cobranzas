import axios from 'axios';
import { getRuntimeEnv } from './runtimeEnv';

// Configura la URL base para todas las peticiones utilizando la variable de entorno
const API_URL = getRuntimeEnv('VITE_API_URL') || 'http://localhost:4003/api';

// Crear instancia de axios con configuración personalizada
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests - añadir el token de autorización automáticamente
const addAuthInterceptor = (apiInstance: typeof api) => {
  apiInstance.interceptors.request.use(
    config => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );
};

// Interceptor para responses - manejar errores de autorización
const addResponseInterceptor = (apiInstance: typeof api) => {
  apiInstance.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

// Aplicar interceptors
addAuthInterceptor(api);
addResponseInterceptor(api);

export default api;
