import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { RootState } from './store';
import { Logger as AppLogger } from '../lib/utils';
import { getRuntimeEnv, getRuntimeFlag } from '../lib/runtimeEnv';

// En desarrollo, usar proxy de Vite; en producción, usar variable de entorno
const API_BASE_URL = getRuntimeFlag('DEV')
  ? '/api'  // Proxy de Vite en desarrollo
  : `${getRuntimeEnv('VITE_API_BASE_URL') || getRuntimeEnv('VITE_API_URL') || ''}/api`;

// Base query con configuración estándar
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    try {
      const state = getState() as RootState;
      const token = state?.auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
    } catch (error) {
      AppLogger.error('Error accessing auth state in prepareHeaders:', error);
    }
    return headers;
  },
  fetchFn: async (...args) => {
    try {
      return await fetch(...args);
    } catch (error) {
      AppLogger.error('Network fetch error:', error);
      throw error;
    }
  },
});

// Variable para evitar múltiples redirecciones simultáneas
let isRedirecting = false;

// Base query con manejo automático de token expirado
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await baseQuery(args, api, extraOptions);
  
  // Si recibimos 401 (Unauthorized), el token expiró o es inválido
  if (result.error && result.error.status === 401) {
    // Evitar múltiples redirecciones
    if (!isRedirecting) {
      isRedirecting = true;
      
      AppLogger.warn('Sesión expirada - redirigiendo al login');
      
      // Limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirigir al login después de un pequeño delay para mostrar mensaje
      setTimeout(() => {
        window.location.href = '/login?expired=true';
        // Reset después de la redirección
        setTimeout(() => { isRedirecting = false; }, 2000);
      }, 100);
    }
  }
  
  return result;
};

// Configuración mejorada con manejo de errores
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Dashboard',
    'Empresa',
    'Service',
    'Instance',
    'GatewayClient',
    'CanalDePaso', // Para gestión de canales
    'Permiso', // Para gestión de permisos
    'AuditLog', // Para auditoría
    'Driver',
    'Truck',
    'Trailer',
    'Schedule',
    'DocumentRequest',
    'ChatProcessor', // Para Chat Processor
    'ChatAgent', // Para Agentes de Chat
    // QMS / Calidad
    'QmsDocument',
    'QmsVersion',
    'QmsNcr',
    'QmsCapa',
    'QmsAudit',
    'QmsRisk',
    'QmsIncident',
    'QmsLegal',
    'QmsKpi',
  ],
  // Optimizaciones de cache para mejor rendimiento y estabilidad
  keepUnusedDataFor: 300, // 5 minutos en cache (por defecto es 60s)
  refetchOnMountOrArgChange: 30, // Solo refetch si data tiene más de 30s
  refetchOnFocus: false, // No refetch al enfocar ventana
  refetchOnReconnect: true, // Sí refetch al reconectar
  endpoints: builder => ({}),
});

export default apiSlice;
