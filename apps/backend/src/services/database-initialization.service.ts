import { Client } from 'pg';
import { AppLogger } from '../config/logger';
import { databaseConfig } from '../config/database';
import { exec } from 'child_process';
import { promisify } from 'util';
import { runSeeds } from '../seed/index';

interface DatabaseStatus {
  exists: boolean;
  accessible: boolean;
  hasRequiredPermissions: boolean;
  version?: string;
  encoding?: string;
  collation?: string;
}

interface InitializationResult {
  success: boolean;
  created: boolean;
  message: string;
  databaseStatus: DatabaseStatus;
  errors?: string[];
  warnings?: string[];
}

export class DatabaseInitializationService {
  private config = databaseConfig.getConfig();
  private connectionRetries = 3;
  private connectionRetryDelay = 2000;
  private execAsync = promisify(exec);

  /**
   * Inicializa la base de datos completa: verifica/crea BD, valida permisos, prepara estructura
   */
  public async initializeDatabase(): Promise<InitializationResult> {
    const startTime = Date.now();
    AppLogger.info('🚀 Iniciando proceso de inicialización de base de datos...');

    try {
      // 1. Validar configuración
      await this.validateConfiguration();

      // 2. Verificar conectividad administrativa
      await this.verifyAdministrativeConnection();

      // 3. Verificar estado actual de la base de datos
      const status = await this.checkDatabaseStatus();

      // 4. Crear base de datos si no existe
      let created = false;
      if (!status.exists) {
        created = await this.createDatabase();
      }

      // 5. Verificar permisos del usuario
      await this.verifyUserPermissions();

      // 6. Ejecutar migraciones solo si las tablas no existen
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist) {
        await this.runPrismaMigrations();
      } else {
        AppLogger.info('⏭️ Migraciones omitidas - las tablas ya existen');
      }

      // 7. Ejecutar seeds solo si no hay datos en las tablas
      const hasData = await this.checkDatabaseHasData();
      if (!hasData || process.env.FORCE_SEED === 'true') {
        await this.executeSeedsProcess();
      } else {
        AppLogger.info(
          '⏭️ Seeds omitidos - la base de datos ya tiene datos (usar FORCE_SEED=true para forzar)'
        );
      }

      // 8. Validar estado final
      const finalStatus = await this.checkDatabaseStatus();

      const duration = Date.now() - startTime;

      // Construir mensaje detallado basado en lo que realmente se ejecutó
      let message = `✅ Base de datos '${this.config.database}' `;
      const actions = [];

      if (created) {
        actions.push('creada');
      }

      if (!tablesExist) {
        actions.push('migraciones ejecutadas');
      }

      if (!hasData || process.env.FORCE_SEED === 'true') {
        actions.push('seeds ejecutados');
      }

      if (actions.length > 0) {
        message += `inicializada (${actions.join(', ')}) en ${duration}ms`;
      } else {
        message += `ya está lista y accesible (${duration}ms)`;
      }

      const result: InitializationResult = {
        success: true,
        created,
        message,
        databaseStatus: finalStatus,
      };

      AppLogger.info(result.message, {
        database: this.config.database,
        created,
        duration,
        status: finalStatus,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      AppLogger.error('❌ Error durante la inicialización de base de datos:', {
        error: errorMessage,
        database: this.config.database,
        duration,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        success: false,
        created: false,
        message: `❌ Falló la inicialización: ${errorMessage}`,
        databaseStatus: { exists: false, accessible: false, hasRequiredPermissions: false },
        errors: [errorMessage],
      };
    }
  }

  /**
   * Valida la configuración antes de proceder
   */
  private async validateConfiguration(): Promise<void> {
    AppLogger.info('🔍 Validando configuración de base de datos...');

    if (!this.config.database || this.config.database.trim() === '') {
      throw new Error('Nombre de base de datos no puede estar vacío');
    }

    if (!this.config.username || this.config.username.trim() === '') {
      throw new Error('Usuario de base de datos no puede estar vacío');
    }

    if (!this.config.password) {
      throw new Error('Contraseña de base de datos no puede estar vacía');
    }

    // Validar caracteres especiales en nombre de BD
    const validDbName = /^[a-zA-Z0-9_-]+$/;
    if (!validDbName.test(this.config.database)) {
      throw new Error(
        `Nombre de base de datos '${this.config.database}' contiene caracteres inválidos. Solo se permiten letras, números, guiones y guiones bajos.`
      );
    }

    AppLogger.info('✅ Configuración validada correctamente');
  }

  /**
   * Verifica que se pueda conectar administrativamente a PostgreSQL
   */
  private async verifyAdministrativeConnection(): Promise<void> {
    AppLogger.info('🔌 Verificando conexión administrativa a PostgreSQL...');

    for (let attempt = 1; attempt <= this.connectionRetries; attempt++) {
      try {
        const client = await this.createAdminClient();

        // Verificar versión de PostgreSQL
        const versionResult = await client.query('SELECT version()');
        const version = versionResult.rows[0]?.version || 'Desconocida';

        await client.end();

        AppLogger.info('✅ Conexión administrativa exitosa', {
          attempt,
          version: version.split(' ').slice(0, 3).join(' '),
          host: this.config.host,
          port: this.config.port,
        });

        return;
      } catch (error) {
        const isLastAttempt = attempt === this.connectionRetries;
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

        if (isLastAttempt) {
          AppLogger.error('❌ Falló la conexión administrativa después de todos los intentos', {
            attempts: this.connectionRetries,
            error: errorMessage,
          });
          throw new Error(
            `No se pudo conectar a PostgreSQL después de ${this.connectionRetries} intentos: ${errorMessage}`
          );
        } else {
          AppLogger.warn(
            `⚠️ Intento ${attempt} de conexión administrativa falló, reintentando...`,
            {
              error: errorMessage,
              nextAttemptIn: this.connectionRetryDelay,
            }
          );
          await this.sleep(this.connectionRetryDelay);
        }
      }
    }
  }

  /**
   * Verifica el estado actual de la base de datos
   */
  private async checkDatabaseStatus(): Promise<DatabaseStatus> {
    AppLogger.info(`🔍 Verificando estado de la base de datos '${this.config.database}'...`);

    try {
      const client = await this.createAdminClient();

      // Verificar si la base de datos existe
      const result = await client.query(
        'SELECT datname, encoding, datcollate FROM pg_database WHERE datname = $1',
        [this.config.database]
      );

      const exists = result.rows.length > 0;

      if (!exists) {
        await client.end();
        AppLogger.info(`📋 Base de datos '${this.config.database}' no existe`);
        return {
          exists: false,
          accessible: false,
          hasRequiredPermissions: false,
        };
      }

      const dbInfo = result.rows[0];
      await client.end();

      // Verificar accesibilidad y permisos conectándose a la BD específica
      let accessible = false;
      let hasRequiredPermissions = false;

      try {
        const appClient = await this.createApplicationClient();

        // Verificar permisos básicos
        await appClient.query('SELECT 1');
        accessible = true;

        // Verificar permisos de creación de tablas
        await appClient.query('SELECT has_schema_privilege($1, $2, $3)', [
          this.config.username,
          this.config.schema,
          'CREATE',
        ]);
        hasRequiredPermissions = true;

        await appClient.end();
      } catch (error) {
        AppLogger.warn(`⚠️ Problemas de acceso a base de datos existente: ${error}`);
      }

      const status: DatabaseStatus = {
        exists: true,
        accessible,
        hasRequiredPermissions,
        encoding: dbInfo.encoding,
        collation: dbInfo.datcollate,
      };

      AppLogger.info(`📋 Estado de base de datos '${this.config.database}':`, status);
      return status;
    } catch (error) {
      AppLogger.error('❌ Error verificando estado de base de datos:', error);
      throw new Error(`Error verificando estado de BD: ${error}`);
    }
  }

  /**
   * Crea la base de datos si no existe
   */
  private async createDatabase(): Promise<boolean> {
    AppLogger.info(`🏗️ Creando base de datos '${this.config.database}'...`);

    try {
      const client = await this.createAdminClient();

      // Obtener locales disponibles en el sistema
      const localeConfig = await this.getOptimalLocaleConfig(client);

      // Crear base de datos con configuración optimizada
      const createQuery = `
        CREATE DATABASE "${this.config.database}"
        WITH 
          ENCODING = 'UTF8'
          LC_COLLATE = '${localeConfig.collate}'
          LC_CTYPE = '${localeConfig.ctype}'
          TEMPLATE = template0
          CONNECTION LIMIT = -1
      `;

      await client.query(createQuery);
      await client.end();

      // Verificar que la creación fue exitosa
      const status = await this.checkDatabaseStatus();
      if (!status.exists) {
        throw new Error('La base de datos no se creó correctamente');
      }

      AppLogger.info(`✅ Base de datos '${this.config.database}' creada exitosamente`, {
        encoding: status.encoding,
        collation: status.collation,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      // Verificar si el error es porque la BD ya existe
      if (errorMessage.includes('already exists')) {
        AppLogger.info(`📋 Base de datos '${this.config.database}' ya existe`);
        return false;
      }

      // Verificar si es un problema de permisos
      if (errorMessage.includes('permission denied')) {
        throw new Error(
          `Sin permisos para crear base de datos. Verifique que el usuario '${this.config.username}' tenga permisos CREATEDB`
        );
      }

      AppLogger.error('❌ Error creando base de datos:', {
        database: this.config.database,
        error: errorMessage,
      });

      throw new Error(`Error creando base de datos: ${errorMessage}`);
    }
  }

  /**
   * Verifica que el usuario tenga los permisos necesarios
   */
  private async verifyUserPermissions(): Promise<void> {
    AppLogger.info(`🔐 Verificando permisos del usuario '${this.config.username}'...`);

    try {
      const client = await this.createApplicationClient();

      // Verificar permisos de conexión a la base de datos
      const connectResult = await client.query('SELECT current_database(), current_user');
      const currentDb = connectResult.rows[0]?.current_database;
      const currentUser = connectResult.rows[0]?.current_user;

      if (currentDb !== this.config.database) {
        throw new Error(
          `Conectado a BD incorrecta: esperada '${this.config.database}', actual '${currentDb}'`
        );
      }

      // Verificar permisos en el schema
      const schemaPermsResult = await client.query(
        `
        SELECT 
          has_schema_privilege($1, $2, 'USAGE') as can_use,
          has_schema_privilege($1, $2, 'CREATE') as can_create
      `,
        [this.config.username, this.config.schema]
      );

      const perms = schemaPermsResult.rows[0];

      if (!perms.can_use) {
        throw new Error(
          `Usuario '${this.config.username}' no tiene permisos USAGE en schema '${this.config.schema}'`
        );
      }

      if (!perms.can_create) {
        throw new Error(
          `Usuario '${this.config.username}' no tiene permisos CREATE en schema '${this.config.schema}'`
        );
      }

      await client.end();

      AppLogger.info('✅ Permisos de usuario verificados correctamente', {
        user: currentUser,
        database: currentDb,
        schema: this.config.schema,
        canUse: perms.can_use,
        canCreate: perms.can_create,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      AppLogger.error('❌ Error verificando permisos de usuario:', errorMessage);
      throw new Error(`Error de permisos: ${errorMessage}`);
    }
  }

  /**
   * Crea un cliente administrativo para operaciones de base de datos
   */
  private async createAdminClient(): Promise<Client> {
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.adminDatabase,
      user: this.config.username,
      password: this.config.password,
      connectionTimeoutMillis: this.config.connectionTimeout,
      statement_timeout: this.config.commandTimeout,
      application_name: 'db-initializer-admin',
    });

    await client.connect();
    return client;
  }

  /**
   * Crea un cliente de aplicación para la base de datos específica
   */
  private async createApplicationClient(): Promise<Client> {
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      connectionTimeoutMillis: this.config.connectionTimeout,
      statement_timeout: this.config.commandTimeout,
      application_name: 'db-initializer-app',
    });

    await client.connect();
    return client;
  }

  /**
   * Utilidad para pausar ejecución
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene la configuración óptima de locale para el sistema
   */
  private async getOptimalLocaleConfig(
    client: Client
  ): Promise<{ collate: string; ctype: string }> {
    try {
      // Intentar obtener locales disponibles en el sistema
      const localesResult = await client.query(`
        SELECT 
          collname as collate,
          collctype as ctype
        FROM pg_collation 
        WHERE collname IN ('C', 'POSIX', 'en_US.UTF-8', 'English_United States.1252', 'en-US')
        ORDER BY 
          CASE collname
            WHEN 'C' THEN 1
            WHEN 'POSIX' THEN 2
            WHEN 'en_US.UTF-8' THEN 3
            WHEN 'English_United States.1252' THEN 4
            ELSE 5
          END
        LIMIT 1
      `);

      if (localesResult.rows.length > 0) {
        const locale = localesResult.rows[0];
        AppLogger.info(`🌍 Usando locale detectado: ${locale.collate}`, {
          collate: locale.collate,
          ctype: locale.ctype,
        });
        return {
          collate: locale.collate,
          ctype: locale.ctype,
        };
      }

      // Si no se encuentra ningún locale específico, usar C que es universal
      AppLogger.info('🌍 Usando locale por defecto: C (compatible con todos los sistemas)');
      return {
        collate: 'C',
        ctype: 'C',
      };
    } catch (error) {
      AppLogger.warn('⚠️ Error detectando locales, usando configuración por defecto', error);
      return {
        collate: 'C',
        ctype: 'C',
      };
    }
  }

  /**
   * Verifica si las tablas principales existen en la base de datos
   */
  private async checkTablesExist(): Promise<boolean> {
    AppLogger.info('🔍 Verificando si las tablas existen...');

    try {
      const client = await this.createApplicationClient();

      // Verificar si las tablas principales del schema existen
      const result = await client.query(
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_type = 'BASE TABLE'
        AND table_name IN ('users', 'empresas_textos')
      `,
        [this.config.schema]
      );

      await client.end();

      const tablesFound = result.rows.length;
      const tablesExist = tablesFound >= 2; // Al menos users y empresas_textos deben existir

      AppLogger.info(`📊 Tablas encontradas: ${tablesFound}/2 requeridas`, {
        tablesFound: result.rows.map(row => row.table_name),
        tablesExist,
      });

      return tablesExist;
    } catch (error) {
      AppLogger.warn('⚠️ Error verificando tablas, asumiendo que no existen:', error);
      return false;
    }
  }

  /**
   * Verifica si la base de datos tiene datos (no está vacía)
   */
  private async checkDatabaseHasData(): Promise<boolean> {
    AppLogger.info('🔍 Verificando si la base de datos tiene datos...');

    try {
      const client = await this.createApplicationClient();

      // Verificar si hay datos en las tablas principales
      const userCountResult = await client.query(
        `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'users'
      `,
        [this.config.schema]
      );

      if (userCountResult.rows[0].count === '0') {
        AppLogger.info('📊 Tabla users no existe, asumiendo BD vacía');
        await client.end();
        return false;
      }

      const dataResult = await client.query('SELECT COUNT(*) as count FROM users');
      const userCount = parseInt(dataResult.rows[0].count);

      const empresaCountResult = await client.query(
        `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'empresas_textos'
      `,
        [this.config.schema]
      );

      let empresaCount = 0;
      if (empresaCountResult.rows[0].count !== '0') {
        const empresaDataResult = await client.query(
          'SELECT COUNT(*) as count FROM empresas_textos'
        );
        empresaCount = parseInt(empresaDataResult.rows[0].count);
      }

      await client.end();

      const hasData = userCount > 0 || empresaCount > 0;

      AppLogger.info(`📊 Datos encontrados: ${userCount} usuarios, ${empresaCount} empresas`, {
        userCount,
        empresaCount,
        hasData,
      });

      return hasData;
    } catch (error) {
      AppLogger.warn('⚠️ Error verificando datos, asumiendo BD vacía:', error);
      return false;
    }
  }

  /**
   * Ejecuta las migraciones de Prisma
   */
  private async runPrismaMigrations(): Promise<void> {
    AppLogger.info('🚀 Ejecutando migraciones de Prisma...');

    try {
      const { stdout, stderr } = await this.execAsync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseConfig.getApplicationUrl() },
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer para manejar mucha salida
      });

      if (stderr && !stderr.includes('warn')) {
        AppLogger.warn('⚠️ Advertencias durante las migraciones:', stderr);
      }

      AppLogger.info('✅ Migraciones de Prisma completadas exitosamente');

      // Solo mostrar las primeras líneas del stdout si es muy largo
      if (stdout) {
        const lines = stdout.split('\n');
        if (lines.length > 15) {
          AppLogger.debug(
            'Salida de migraciones (primeras 15 líneas):',
            lines.slice(0, 15).join('\n')
          );
          AppLogger.debug(`... y ${lines.length - 15} líneas más`);
        } else {
          AppLogger.debug('Salida de migraciones:', stdout);
        }
      }
    } catch (error) {
      AppLogger.error('❌ Error ejecutando migraciones de Prisma:', error);
      throw new Error(
        `Error en migraciones: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  /**
   * Ejecuta los seeds de datos iniciales
   */
  private async executeSeedsProcess(): Promise<void> {
    AppLogger.info('🌱 Ejecutando seeds de datos iniciales...');

    try {
      // Ejecutar seeds directamente en lugar de usar comando npm
      await runSeeds();
      AppLogger.info('✅ Seeds ejecutados exitosamente');
    } catch (error) {
      AppLogger.error('❌ Error ejecutando seeds:', error);
      throw new Error(
        `Error en seeds: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  /**
   * Obtiene información detallada de la base de datos
   */
  public async getDatabaseInfo(): Promise<object> {
    try {
      const client = await this.createApplicationClient();

      const result = await client.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as postgres_version,
          current_setting('server_encoding') as encoding,
          current_setting('lc_collate') as collation,
          pg_size_pretty(pg_database_size(current_database())) as size
      `);

      await client.end();
      return result.rows[0];
    } catch (error) {
      AppLogger.error('Error obteniendo información de BD:', error);
      return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
