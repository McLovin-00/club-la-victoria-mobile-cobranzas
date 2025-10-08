import { PrismaClient } from '@prisma/client';
import { AppLogger } from './logger';
import { databaseConfig } from './database';

/**
 * Servicio de Prisma simplificado con configuración dinámica
 */
class PrismaService {
  private client: PrismaClient;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxRetries = 3;
  private isInitialized = false;

  constructor() {
    this.client = new PrismaClient({
      datasources: {
        db: {
          url: databaseConfig.getApplicationUrl(),
        },
      },
      errorFormat: 'pretty',
    });
  }

  /**
   * Configura logging básico
   */
  private setupLogging(): void {
    if (this.isInitialized) return;

    const config = databaseConfig.getConfig();

    if (config.enableLogging) {
      AppLogger.info('🔧 Prisma configurado exitosamente', {
        database: config.database,
        host: config.host,
        enableQueryLogging: config.enableQueryLogging,
      });
    }

    this.isInitialized = true;
  }

  /**
   * Conecta a la base de datos con retry automático
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    // Configurar logging solo al conectar
    this.setupLogging();

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        AppLogger.info(`🔌 Conectando a base de datos (intento ${attempt}/${this.maxRetries})...`);

        await this.client.$connect();

        // Verificar conexión con una query simple
        await this.client.$queryRaw`SELECT 1`;

        this.isConnected = true;
        this.connectionAttempts = attempt;

        AppLogger.info('✅ Conexión a base de datos establecida exitosamente', {
          attempt,
          database: databaseConfig.getConfig().database,
          host: databaseConfig.getConfig().host,
        });

        return;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

        if (isLastAttempt) {
          AppLogger.error('❌ Error conectando a base de datos después de todos los intentos:', {
            attempts: this.maxRetries,
            error: errorMessage,
            database: databaseConfig.getConfig().database,
            host: databaseConfig.getConfig().host,
          });
          throw new Error(`No se pudo conectar a la base de datos: ${errorMessage}`);
        } else {
          AppLogger.warn(`⚠️ Intento ${attempt} de conexión falló, reintentando...`, {
            error: errorMessage,
            nextAttemptIn: 2000,
          });
          await this.sleep(2000);
        }
      }
    }
  }

  /**
   * Desconecta de la base de datos
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.$disconnect();
      this.isConnected = false;
      AppLogger.info('🔌 Desconectado de base de datos exitosamente');
    } catch (error) {
      AppLogger.error('❌ Error desconectando de base de datos:', error);
      throw error;
    }
  }

  /**
   * Obtiene el cliente Prisma
   */
  public getClient(): PrismaClient {
    if (!this.isConnected) {
      AppLogger.debug('⚠️ Accediendo a cliente Prisma durante inicialización (conexión en progreso)');
    }
    return this.client;
  }

  /**
   * Verifica el estado de la conexión
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      AppLogger.error('❌ Error verificando conexión:', error);
      return false;
    }
  }

  /**
   * Obtiene información de la base de datos
   */
  public async getDatabaseInfo(): Promise<any> {
    try {
      const result = await this.client.$queryRaw`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as postgres_version,
          current_setting('server_version') as server_version
      `;
      return result;
    } catch (error) {
      AppLogger.error('❌ Error obteniendo información de base de datos:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de conexión
   */
  public getConnectionStats(): object {
    return {
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
      maxRetries: this.maxRetries,
      database: databaseConfig.getConfig().database,
      host: databaseConfig.getConfig().host,
      enableQueryLogging: databaseConfig.getConfig().enableQueryLogging,
    };
  }

  /**
   * Ejecuta una transacción con retry automático
   */
  public async executeTransaction<T>(
    operation: (prisma: any) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.client.$transaction(operation);
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

        if (isLastAttempt) {
          AppLogger.error('❌ Transacción falló después de todos los intentos:', {
            attempts: maxRetries,
            error: errorMessage,
          });
          throw error;
        } else {
          AppLogger.warn(`⚠️ Transacción intento ${attempt} falló, reintentando...`, {
            error: errorMessage,
            nextAttemptIn: 1000,
          });
          await this.sleep(1000);
        }
      }
    }

    throw new Error('Este punto no debería alcanzarse');
  }

  /**
   * Utilidad para pausar ejecución
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup al terminar la aplicación
   */
  public async cleanup(): Promise<void> {
    AppLogger.info('🧹 Limpiando conexiones de Prisma...');
    await this.disconnect();
  }
}

// Instancia singleton del servicio Prisma (lazy-loaded)
let prismaServiceInstance: PrismaService | null = null;

const getPrismaService = (): PrismaService => {
  if (!prismaServiceInstance) {
    prismaServiceInstance = new PrismaService();
  }
  return prismaServiceInstance;
};

// Configurar cleanup automático
process.on('beforeExit', async () => {
  if (prismaServiceInstance) {
    await prismaServiceInstance.cleanup();
  }
});

process.on('SIGINT', async () => {
  if (prismaServiceInstance) {
    await prismaServiceInstance.cleanup();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (prismaServiceInstance) {
    await prismaServiceInstance.cleanup();
  }
  process.exit(0);
});

// Exportar el cliente para retrocompatibilidad
export const prisma = getPrismaService().getClient();

// Exportar el servicio completo
export const prismaService = getPrismaService();

// Exportar función de inicialización
export const initializePrisma = async (): Promise<void> => {
  await getPrismaService().connect();
};
