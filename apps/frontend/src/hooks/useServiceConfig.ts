import { apiSlice } from '../store/apiSlice';
import { Logger } from '../lib/utils';
import { useSelector } from 'react-redux';
import { selectCurrentToken } from '../features/auth/authSlice';

/**
 * Interfaz para configuración de un servicio individual
 */
interface ServiceInfo {
  enabled: boolean;
  name: string;
  description: string;
}

/**
 * Interfaz para la configuración completa de servicios
 */
export interface ServiceConfig {
  documentos: ServiceInfo;
}

/**
 * Interfaz para el resumen de servicios
 */
interface ServicesSummary {
  totalEnabled: number;
  enabledServices: string[];
  coreServicesOnly: boolean;
}

/**
 * Respuesta completa del endpoint de configuración
 */
interface ServiceConfigResponse {
  services: ServiceConfig;
  summary: ServicesSummary;
  timestamp: string;
  version: string;
}

/**
 * API slice para configuración de servicios
 */
const configApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getServiceConfig: builder.query<ServiceConfigResponse, void>({
      query: () => '/config/services',
      keepUnusedDataFor: 300, // Cache por 5 minutos
    }),
  }),
  overrideExisting: false,
});

export const { useGetServiceConfigQuery } = configApiSlice;

/**
 * Hook principal para manejo de configuración de servicios
 * Proporciona información sobre qué servicios están habilitados
 * Con protección contra errores de contexto
 */
export const useServiceConfig = () => {
  // Verificar si hay token antes de hacer la petición
  const token = useSelector(selectCurrentToken);
  const shouldSkip = !token;
  
  try {
    const { 
      data: response, 
      isLoading, 
      error, 
      refetch,
      isSuccess,
      isFetching 
    } = useGetServiceConfigQuery(undefined, {
      // Saltear la petición si no hay token (evita loop en login)
      skip: shouldSkip,
      pollingInterval: 0,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    });

    // Configuración por defecto (todos los servicios deshabilitados)
    const defaultConfig: ServiceConfig = {
      documentos: { 
        enabled: true,
        name: 'Documentos',
        description: 'Gestión documental para transportistas'
      }
    };

    const defaultSummary: ServicesSummary = {
      totalEnabled: 0,
      enabledServices: [],
      coreServicesOnly: true
    };

    return {
      // Configuración de servicios
      config: response?.services || defaultConfig,
      summary: response?.summary || defaultSummary,
      
      // Estados de la petición
      isLoading: isLoading || false,
      isFetching: isFetching || false,
      isSuccess: isSuccess || false,
      error,
      
      // Funciones útiles
      refetch,
      
      // Helpers para verificar servicios específicos (solo Documentos)
      // Helper para obtener lista de servicios habilitados
      getEnabledServices: () => response?.summary.enabledServices || [],
      
      // Helper para verificar si hay algún servicio habilitado
      hasEnabledServices: () => (response?.summary.totalEnabled || 0) > 0,
      
      // Información de la respuesta
      timestamp: response?.timestamp,
      version: response?.version,
    };
  } catch (error) {
    Logger.error('Error in useServiceConfig hook:', error);
    
    // Retorna configuración de fallback en caso de error
    const defaultConfig: ServiceConfig = {
      documentos: { 
        enabled: true,
        name: 'Documentos',
        description: 'Gestión documental para transportistas'
      }
    };

    const defaultSummary: ServicesSummary = {
      totalEnabled: 0,
      enabledServices: [],
      coreServicesOnly: true
    };

    return {
      config: defaultConfig,
      summary: defaultSummary,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      error: error as Error,
      refetch: () => Promise.resolve({} as any),
      isDocumentosEnabled: true,
      getEnabledServices: () => [],
      hasEnabledServices: () => false,
      timestamp: undefined,
      version: undefined,
    };
  }
};

/**
 * Hook simplificado para verificar si un servicio específico está habilitado
 * Con protección contra errores de contexto
 */
export const useIsServiceEnabled = (service: 'documentos'): boolean => {
  try {
    const { config } = useServiceConfig();
    return config[service]?.enabled || true;
  } catch (error) {
    Logger.error(`Error checking if service ${service} is enabled:`, error);
    return false;
  }
};

/**
 * Hook que devuelve un objeto con flags booleanos para uso en condicionales
 * Con protección contra errores de contexto
 */
export const useServiceFlags = () => {
  try {
    const { config } = useServiceConfig();
    
    return {
      documentos: config.documentos?.enabled || true,
    };
  } catch (error) {
    Logger.error('Error getting service flags:', error);
    return {
      documentos: true,
    };
  }
}; 