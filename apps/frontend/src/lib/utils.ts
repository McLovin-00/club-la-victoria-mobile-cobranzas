import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Entorno de ejecución actual
 * En producción, NODE_ENV será 'production'
 */
export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;

/**
 * Utilidad de logging que solo muestra mensajes en el entorno de desarrollo
 * En producción, los mensajes no se mostrarán en la consola
 */
export const Logger = {
  /**
   * Log informativo - solo visible en desarrollo
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      const formattedArgs = args.map(arg =>
        typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : arg
      );
      console.log(...formattedArgs);
    }
  },

  /**
   * Log de advertencia - solo visible en desarrollo
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log de error - visible en todos los entornos
   * pero con menos detalles en producción
   */
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      // En producción, limitamos la información para evitar
      // exposición de datos sensibles
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return 'Error object (detalles omitidos en producción)';
        }
        if (
          typeof arg === 'string' &&
          (arg.includes('token') ||
            arg.includes('password') ||
            arg.includes('JWT') ||
            arg.includes('Bearer'))
        ) {
          return 'Error con información sensible (detalles omitidos en producción)';
        }
        return arg;
      });
      console.error(...sanitizedArgs);
    }
  },

  /**
   * Log de depuración - solo visible en desarrollo
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      const formattedArgs = args.map(arg =>
        typeof arg === 'object' && arg !== null ? JSON.stringify(arg, null, 2) : arg
      );
      console.debug(...formattedArgs);
    }
  },

  /**
   * Log de información sobre API - seguro para producción
   * con limpieza de datos sensibles
   */
  api: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[API] ${message}`, data);
    } else if (data) {
      // En producción, limpiamos tokens y datos sensibles
      const safeData = { ...data };

      // Eliminar tokens y datos sensibles
      if (safeData.headers) {
        if (safeData.headers.authorization) {
          safeData.headers.authorization = 'Bearer [REDACTED]';
        }
      }

      console.log(`[API] ${message}`);
    } else {
      console.log(`[API] ${message}`);
    }
  },

  /**
   * Log de métricas de performance - visible en desarrollo
   * con datos estructurados para análisis
   */
  performance: (message: string, data?: any) => {
    if (isDevelopment) {
      console.group(`⚡ Performance: ${message}`);
      if (data) {
        console.table(data);
      }
      console.groupEnd();
    }
    // En producción, esto se enviaría al servicio de telemetría
  },

  /**
   * Log de auditoría - visible en todos los entornos
   * para tracking de acciones críticas
   */
  audit: (action: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const auditData = {
      action,
      timestamp,
      ...data,
    };

    if (isDevelopment) {
      console.group(`📊 Audit: ${action}`);
      console.log(auditData);
      console.groupEnd();
    }

    // En producción, esto se enviaría al servidor de auditoría
    // Simular envío (en implementación real sería una API call)
    if (isProduction) {
      // PENDIENTE: Implementar envío real al servidor de auditoría
      console.log(`[AUDIT] ${action} at ${timestamp}`);
    }
  },
};
