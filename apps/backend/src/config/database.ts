import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { AppLogger } from './logger';
import { getEnvironment } from './environment';

// Cargar variables de entorno desde la raíz del monorepo (solo si no estamos en un entorno de tests)
// Evitamos side-effects automáticos en Jest para que los tests tengan control total sobre process.env
const isJest = process.env.JEST_WORKER_ID !== undefined;

if (!isJest) {
  const rootEnvPath = path.resolve(__dirname, '../../../../.env');
  const backendEnvPath = path.resolve(__dirname, '../../../.env');

  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  } else if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
  }
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  adminDatabase: string;
  schema: string;
  connectionTimeout: number;
  commandTimeout: number;
  enableLogging: boolean;
  enableQueryLogging: boolean;
}

interface DatabaseUrls {
  application: string;
  admin: string;
  applicationWithoutDb: string;
}

class DatabaseConfigurationService {
  private config: DatabaseConfig;
  private urls: DatabaseUrls;

  constructor() {
    this.validateEnvironmentVariables();
    this.config = this.buildConfig();
    this.urls = this.buildUrls();
    this.setEnvironmentUrls();
  }

  /**
   * Valida que todas las variables de entorno requeridas estén presentes
   */
  private validateEnvironmentVariables(): void {
    // Permitir saltar validación estricta en test o cuando se indica explícitamente
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'test' || process.env.SKIP_DB_INIT === 'true') {
      AppLogger.warn('⚠️ Saltando validación estricta de DB (NODE_ENV=test o SKIP_DB_INIT=true)');
      return;
    }

    // Asegurar carga de env normalizado
    try { getEnvironment(); } catch { }

    const requiredVars = [
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD',
      'DB_ADMIN_DATABASE',
      'DB_SCHEMA',
    ];

    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      const error = `❌ Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`;
      AppLogger.error(error);
      throw new Error(error);
    }

    // Validar tipos específicos
    const port = parseInt(process.env.DB_PORT!);
    if (isNaN(port) || port <= 0 || port > 65535) {
      const error = `❌ DB_PORT debe ser un número válido entre 1 y 65535, recibido: ${process.env.DB_PORT}`;
      AppLogger.error(error);
      throw new Error(error);
    }

    AppLogger.info('✅ Validación de variables de entorno completada exitosamente');
  }

  /**
   * Construye la configuración desde las variables de entorno
   */
  private buildConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'monorepo-bca',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      adminDatabase: process.env.DB_ADMIN_DATABASE || 'postgres',
      schema: process.env.DB_SCHEMA || 'platform',
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      commandTimeout: parseInt(process.env.DB_COMMAND_TIMEOUT || '30000'),
      enableLogging: process.env.ENABLE_DATABASE_LOGGING === 'true',
      enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
    };
  }

  /**
   * Construye las URLs de conexión
   */
  private buildUrls(): DatabaseUrls {
    const user = encodeURIComponent(this.config.username);
    const pass = encodeURIComponent(this.config.password);
    const baseUrl = `postgresql://${user}:${pass}@${this.config.host}:${this.config.port}`;

    return {
      application: `${baseUrl}/${this.config.database}?schema=${this.config.schema}&connect_timeout=${this.config.connectionTimeout}&command_timeout=${this.config.commandTimeout}`,
      admin: `${baseUrl}/${this.config.adminDatabase}?connect_timeout=${this.config.connectionTimeout}&command_timeout=${this.config.commandTimeout}`,
      applicationWithoutDb: `${baseUrl}?connect_timeout=${this.config.connectionTimeout}&command_timeout=${this.config.commandTimeout}`,
    };
  }

  /**
   * Establece las URLs en las variables de entorno para uso de Prisma
   */
  private setEnvironmentUrls(): void {
    process.env.DATABASE_URL = this.urls.application;
    process.env.DATABASE_ADMIN_URL = this.urls.admin;
    process.env.DATABASE_BASE_URL = this.urls.applicationWithoutDb;

    if (this.config.enableLogging) {
      AppLogger.info('📊 URLs de base de datos configuradas:', {
        application: this.maskPassword(this.urls.application),
        admin: this.maskPassword(this.urls.admin),
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        schema: this.config.schema,
      });
    }
  }

  /**
   * Enmascara la contraseña en las URLs para logging seguro
   */
  private maskPassword(url: string): string {
    return url.replace(/:([^:@]+)@/, ':***@');
  }

  /**
   * Obtiene la configuración de base de datos
   */
  public getConfig(): Readonly<DatabaseConfig> {
    return { ...this.config };
  }

  /**
   * Obtiene las URLs de conexión
   */
  public getUrls(): Readonly<DatabaseUrls> {
    return { ...this.urls };
  }

  /**
   * Obtiene la URL de aplicación para Prisma
   */
  public getApplicationUrl(): string {
    return this.urls.application;
  }

  /**
   * Obtiene la URL administrativa para operaciones de BD
   */
  public getAdminUrl(): string {
    return this.urls.admin;
  }

  /**
   * Obtiene la URL base sin especificar base de datos
   */
  public getBaseUrl(): string {
    return this.urls.applicationWithoutDb;
  }

  /**
   * Verifica si la configuración está en modo de desarrollo
   */
  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Verifica si el logging está habilitado
   */
  public isLoggingEnabled(): boolean {
    return this.config.enableLogging;
  }

  /**
   * Verifica si el query logging está habilitado
   */
  public isQueryLoggingEnabled(): boolean {
    return this.config.enableQueryLogging;
  }

  /**
   * Obtiene información de conexión para logging
   */
  public getConnectionInfo(): object {
    return {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      username: this.config.username,
      schema: this.config.schema,
      connectionTimeout: this.config.connectionTimeout,
      commandTimeout: this.config.commandTimeout,
    };
  }

  /**
   * Valida la configuración actual
   */
  public validateConfiguration(): void {
    try {
      // Validar que las URLs sean válidas
      new URL(this.urls.application.replace('postgresql://', 'http://'));
      new URL(this.urls.admin.replace('postgresql://', 'http://'));

      AppLogger.info('✅ Configuración de base de datos validada exitosamente');
    } catch (error) {
      const errorMsg = `❌ Configuración de base de datos inválida: ${error}`;
      AppLogger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
}

// Instancia singleton del servicio de configuración
export const databaseConfig = new DatabaseConfigurationService();

// Exportar tipos para uso en otros módulos
export type { DatabaseConfig, DatabaseUrls };

// Configuración para desarrollo sin base de datos
export const isDevelopmentWithoutDB = () => {
  return process.env.NODE_ENV === 'development' && process.env.SKIP_DB_INIT === 'true';
};
