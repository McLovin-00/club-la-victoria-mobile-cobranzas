import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './store';
import { Logger as AppLogger } from '../lib/utils';
import { getRuntimeEnv, getRuntimeFlag } from '../lib/runtimeEnv';

// En desarrollo, usar proxy de Vite; en producción, usar variable de entorno
const API_BASE_URL = getRuntimeFlag('DEV')
  ? '/api'  // Proxy de Vite en desarrollo
  : `${getRuntimeEnv('VITE_API_BASE_URL') || getRuntimeEnv('VITE_API_URL') || ''}/api`;

// Configuración mejorada con manejo de errores
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include', // Enviar cookies de autenticación
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
    // Manejo global de errores de red
    fetchFn: async (...args) => {
      try {
        return await fetch(...args);
      } catch (error) {
        AppLogger.error('Network fetch error:', error);
        throw error;
      }
    },
  }),
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
