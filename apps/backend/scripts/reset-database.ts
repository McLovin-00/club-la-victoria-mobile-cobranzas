#!/usr/bin/env ts-node

// Configurar dotenv para cargar variables desde el .env centralizado
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables desde el .env del root del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Client } from 'pg';
import { spawn } from 'child_process';
import { AppLogger } from '../src/config/logger';
import { databaseConfig } from '../src/config/database';
import { setupDatabase } from './setup-database';

interface ResetOptions {
  force: boolean;
  confirm: boolean;
  preserveData: boolean;
  skipBackup: boolean;
  verbose: boolean;
}

interface ResetResult {
  success: boolean;
  duration: number;
  operations: string[];
  warnings: string[];
  errors: string[];
}

class DatabaseResetService {
  private config = databaseConfig.getConfig();
  private operations: string[] = [];
  private warnings: string[] = [];
  private errors: string[] = [];

  /**
   * Ejecuta un reset completo de la base de datos
   */
  public async resetDatabase(options: ResetOptions): Promise<ResetResult> {
    const startTime = Date.now();
    
    AppLogger.warn('🔄 Iniciando reset de base de datos...', {
      database: this.config.database,
      options,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Validaciones de seguridad
      await this.performSafetyChecks(options);

      // 2. Crear backup si es requerido
      if (!options.skipBackup && !options.preserveData) {
        await this.createBackup();
      }

      // 3. Desconectar usuarios activos
      await this.disconnectActiveUsers();

      // 4. Eliminar base de datos
      await this.dropDatabase(options.force);

      // 5. Recrear base de datos desde cero
      await this.recreateDatabase();

      const duration = Date.now() - startTime;
      const result: ResetResult = {
        success: true,
        duration,
        operations: [...this.operations],
        warnings: [...this.warnings],
        errors: [...this.errors]
      };

      AppLogger.info('✅ Reset de base de datos completado exitosamente', result);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.errors.push(errorMessage);

      AppLogger.error('❌ Error durante reset de base de datos:', {
        error: errorMessage,
        duration,
        operations: this.operations
      });

      return {
        success: false,
        duration,
        operations: [...this.operations],
        warnings: [...this.warnings],
        errors: [...this.errors]
      };
    }
  }

  /**
   * Realiza validaciones de seguridad antes del reset
   */
  private async performSafetyChecks(options: ResetOptions): Promise<void> {
    AppLogger.info('🛡️ Ejecutando validaciones de seguridad...');

    // Verificar que no estemos en producción
    if (process.env.NODE_ENV === 'production' && !options.force) {
      throw new Error('❌ Reset no permitido en producción sin --force');
    }

    // Verificar que la base de datos existe
    const exists = await this.checkDatabaseExists();
    if (!exists) {
      this.warnings.push('Base de datos no existe, se procederá a crear una nueva');
      AppLogger.warn('⚠️ Base de datos no existe, se creará una nueva');
      return;
    }

    // Verificar conexiones activas
    const activeConnections = await this.getActiveConnections();
    if (activeConnections > 1 && !options.force) {
      throw new Error(`❌ Hay ${activeConnections} conexiones activas. Use --force para proceder`);
    }

    // Advertencia final si hay datos
    if (!options.preserveData && !options.confirm) {
      throw new Error('❌ Se perderán los datos existentes. Use --confirm para proceder');
    }

    this.operations.push('Validaciones de seguridad completadas');
    AppLogger.info('✅ Validaciones de seguridad completadas');
  }

  /**
   * Verifica si la base de datos existe
   */
  private async checkDatabaseExists(): Promise<boolean> {
    try {
      const client = await this.createAdminClient();
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this.config.database]
      );
      await client.end();
      return result.rows.length > 0;
    } catch (error) {
      AppLogger.warn('⚠️ Error verificando existencia de BD:', error);
      return false;
    }
  }

  /**
   * Obtiene el número de conexiones activas
   */
  private async getActiveConnections(): Promise<number> {
    try {
      const client = await this.createAdminClient();
      const result = await client.query(`
        SELECT COUNT(*) as count 
        FROM pg_stat_activity 
        WHERE datname = $1 AND state = 'active'
      `, [this.config.database]);
      await client.end();
      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      AppLogger.warn('⚠️ Error obteniendo conexiones activas:', error);
      return 0;
    }
  }

  /**
   * Crea un backup de la base de datos
   */
  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup_${this.config.database}_${timestamp}.sql`;
    
    AppLogger.info(`💾 Creando backup: ${backupFile}`);

    try {
      await this.runCommand('pg_dump', [
        '-h', this.config.host,
        '-p', this.config.port.toString(),
        '-U', this.config.username,
        '-d', this.config.database,
        '-f', backupFile,
        '--verbose'
      ], {
        env: { PGPASSWORD: this.config.password }
      });

      this.operations.push(`Backup creado: ${backupFile}`);
      AppLogger.info(`✅ Backup creado exitosamente: ${backupFile}`);
    } catch (error) {
      this.warnings.push(`Error creando backup: ${error}`);
      AppLogger.warn('⚠️ Error creando backup:', error);
    }
  }

  /**
   * Desconecta usuarios activos de la base de datos
   */
  private async disconnectActiveUsers(): Promise<void> {
    AppLogger.info('🔌 Desconectando usuarios activos...');

    try {
      const client = await this.createAdminClient();
      
      // Terminar conexiones activas
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `, [this.config.database]);

      await client.end();
      
      this.operations.push('Usuarios activos desconectados');
      AppLogger.info('✅ Usuarios activos desconectados');
    } catch (error) {
      this.warnings.push(`Error desconectando usuarios: ${error}`);
      AppLogger.warn('⚠️ Error desconectando usuarios:', error);
    }
  }

  /**
   * Elimina la base de datos
   */
  private async dropDatabase(force: boolean): Promise<void> {
    AppLogger.warn(`🗑️ Eliminando base de datos '${this.config.database}'...`);

    try {
      const client = await this.createAdminClient();
      
      // Eliminar la base de datos
      await client.query(`DROP DATABASE IF EXISTS "${this.config.database}"`);
      await client.end();

      this.operations.push(`Base de datos '${this.config.database}' eliminada`);
      AppLogger.info(`✅ Base de datos '${this.config.database}' eliminada exitosamente`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (errorMessage.includes('does not exist')) {
        this.warnings.push('Base de datos no existía');
        AppLogger.warn('⚠️ Base de datos no existía');
        return;
      }

      throw new Error(`Error eliminando base de datos: ${errorMessage}`);
    }
  }

  /**
   * Recrea la base de datos desde cero
   */
  private async recreateDatabase(): Promise<void> {
    AppLogger.info('🏗️ Recreando base de datos desde cero...');

    try {
      // Usar el sistema de setup para recrear la estructura
      const setupResult = await setupDatabase({
        force: true,
        verbose: databaseConfig.isLoggingEnabled()
      });

      if (!setupResult.success) {
        throw new Error(`Error en setup: ${setupResult.errors.join(', ')}`);
      }

      this.operations.push('Base de datos recreada con setup completo');
      AppLogger.info('✅ Base de datos recreada exitosamente');
    } catch (error) {
      throw new Error(`Error recreando base de datos: ${error}`);
    }
  }

  /**
   * Crea un cliente administrativo
   */
  private async createAdminClient(): Promise<Client> {
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.adminDatabase,
      user: this.config.username,
      password: this.config.password,
      connectionTimeoutMillis: this.config.connectionTimeout,
      application_name: 'db-reset-service'
    });

    await client.connect();
    return client;
  }

  /**
   * Ejecuta un comando del sistema
   */
  private async runCommand(
    command: string,
    args: string[],
    options: { env?: Record<string, string> } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        stdio: 'pipe',
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Comando falló: ${stderr || stdout}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  }
}

/**
 * Función principal para usar desde scripts
 */
export async function resetDatabase(options: Partial<ResetOptions> = {}): Promise<ResetResult> {
  const resetService = new DatabaseResetService();
  
  const fullOptions: ResetOptions = {
    force: false,
    confirm: false,
    preserveData: false,
    skipBackup: false,
    verbose: false,
    ...options
  };

  return resetService.resetDatabase(fullOptions);
}

/**
 * Ejecutar si es llamado directamente
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options: ResetOptions = {
    force: args.includes('--force'),
    confirm: args.includes('--confirm') || args.includes('-y'),
    preserveData: args.includes('--preserve-data'),
    skipBackup: args.includes('--skip-backup'),
    verbose: args.includes('--verbose')
  };

  // Mostrar advertencia y solicitar confirmación si no se proporcionó
  if (!options.confirm && !options.force) {
    console.log('\n⚠️  ADVERTENCIA: Esta operación eliminará la totalidad de los datos de la base de datos');
    console.log(`   Base de datos: ${databaseConfig.getConfig().database}`);
    console.log(`   Host: ${databaseConfig.getConfig().host}`);
    console.log('\n   Use --confirm o -y para proceder');
    console.log('   Use --force para saltear todas las validaciones');
    console.log('   Use --skip-backup para no crear backup automático');
    process.exit(1);
  }

  resetDatabase(options)
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Reset completado exitosamente');
        console.log(`   Duración: ${result.duration}ms`);
        console.log(`   Operaciones: ${result.operations.length}`);
        process.exit(0);
      } else {
        console.log('\n❌ Reset falló');
        console.log('Errores:', result.errors);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Error crítico en reset:', error);
      process.exit(1);
    });
} 