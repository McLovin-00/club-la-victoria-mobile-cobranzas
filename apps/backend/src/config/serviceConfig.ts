/**
 * Configuración condicional de servicios para Backend
 * Validador simplificado que garantiza la integridad del sistema
 */

export interface ServiceConfig {
  documentos: {
    enabled: boolean;
  };
}

/**
 * Clase para validar y gestionar configuración de servicios en el backend
 * Implementa validación estricta con logs informativos
 */
export class BackendServiceConfigValidator {
  private static instance: BackendServiceConfigValidator;
  private cachedConfig: ServiceConfig | null = null;

  /**
   * Singleton para garantizar consistencia
   */
  public static getInstance(): BackendServiceConfigValidator {
    if (!BackendServiceConfigValidator.instance) {
      BackendServiceConfigValidator.instance = new BackendServiceConfigValidator();
    }
    return BackendServiceConfigValidator.instance;
  }

  /**
   * Valida y obtiene configuración de servicios
   */
  public getConfig(): ServiceConfig {
    // En desarrollo, no cachear para reflejar cambios de .env sin reiniciar
    const shouldBypassCache = process.env.NODE_ENV === 'development';
    if (this.cachedConfig && !shouldBypassCache) {
      return this.cachedConfig;
    }

    const nextConfig: ServiceConfig = {
      documentos: {
        enabled: process.env.ENABLE_DOCUMENTOS === 'true',
      },
    };
    this.cachedConfig = nextConfig;

    return nextConfig;
  }

  /**
   * Verifica si un servicio específico está habilitado
   */
  public isServiceEnabled(): boolean {
    const config = this.getConfig();
    return config.documentos.enabled;
  }

  /**
   * Obtiene lista de servicios habilitados
   */
  public getEnabledServices(): string[] {
    const config = this.getConfig();
    const enabled: string[] = [];
    if (config.documentos.enabled) enabled.push('Documentos');
    return enabled;
  }

  /**
   * Limpia cache (útil para testing)
   */
  public clearCache(): void {
    this.cachedConfig = null;
  }
}

/**
 * Instancia singleton exportada
 */
export const backendServiceConfig = BackendServiceConfigValidator.getInstance(); 