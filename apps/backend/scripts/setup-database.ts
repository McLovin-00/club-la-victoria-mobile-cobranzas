#!/usr/bin/env ts-node

// Configurar dotenv para cargar variables desde el .env centralizado
import dotenv from 'dotenv';
import path, { join } from 'path';

// Cargar variables desde el .env del root del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { spawn, SpawnOptions } from 'child_process';
import { existsSync } from 'fs';
import { AppLogger } from '../src/config/logger';
import { databaseConfig } from '../src/config/database';
import { DatabaseInitializationService } from '../src/services/database-initialization.service';

interface SetupStep {
  name: string;
  description: string;
  critical: boolean;
  completed: boolean;
  duration?: number;
  error?: string;
}

interface SetupResult {
  success: boolean;
  totalDuration: number;
  steps: SetupStep[];
  databaseInfo?: object;
  errors: string[];
  warnings: string[];
}

class DatabaseSetupOrchestrator {
  private steps: SetupStep[] = [
    { name: 'config', description: 'Validar configuración', critical: true, completed: false },
    { name: 'database', description: 'Inicializar base de datos', critical: true, completed: false },
    { name: 'generate', description: 'Generar cliente Prisma', critical: true, completed: false },
    { name: 'migrate', description: 'Ejecutar migraciones', critical: true, completed: false },
    { name: 'seed', description: 'Ejecutar seeds', critical: false, completed: false },
    { name: 'validate', description: 'Validar configuración final', critical: true, completed: false }
  ];

  private dbInitService = new DatabaseInitializationService();
  private startTime = Date.now();
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Ejecuta el setup completo de la base de datos
   */
  public async setupDatabase(options: { 
    force?: boolean; 
    skipSeeds?: boolean; 
    verbose?: boolean;
    dryRun?: boolean;
  } = {}): Promise<SetupResult> {
    
    AppLogger.info('🚀 Iniciando setup completo de base de datos...', {
      options,
      timestamp: new Date().toISOString()
    });

    try {
      // Paso 1: Validar configuración
      await this.executeStep('config', () => this.validateConfiguration());

      // Paso 2: Inicializar base de datos
      await this.executeStep('database', () => this.initializeDatabase(options.force));

      // Paso 3: Generar cliente Prisma
      await this.executeStep('generate', () => this.generatePrismaClient());

      // Paso 4: Ejecutar migraciones
      await this.executeStep('migrate', () => this.runMigrations(options.force));

      // Paso 5: Ejecutar seeds (opcional)
      if (!options.skipSeeds) {
        await this.executeStep('seed', () => this.runSeeds());
      } else {
        this.markStepSkipped('seed', 'Seeds omitidos por opción del usuario');
      }

      // Paso 6: Validar configuración final
      await this.executeStep('validate', () => this.validateFinalSetup());

      const result = this.buildSuccessResult();
      AppLogger.info('✅ Setup de base de datos completado exitosamente', result);
      return result;

    } catch (error) {
      const result = await this.handleSetupFailure(error);
      AppLogger.error('❌ Setup de base de datos falló', result);
      return result;
    }
  }

  /**
   * Ejecuta un paso individual del setup
   */
  private async executeStep(stepName: string, stepFunction: () => Promise<void>): Promise<void> {
    const step = this.steps.find(s => s.name === stepName);
    if (!step) {
      throw new Error(`Paso desconocido: ${stepName}`);
    }

    const stepStartTime = Date.now();
    AppLogger.info(`📋 Ejecutando: ${step.description}...`);

    try {
      await stepFunction();
      step.completed = true;
      step.duration = Date.now() - stepStartTime;
      
      AppLogger.info(`✅ Completado: ${step.description} (${step.duration}ms)`);
    } catch (error) {
      step.duration = Date.now() - stepStartTime;
      step.error = error instanceof Error ? error.message : 'Error desconocido';
      
      if (step.critical) {
        AppLogger.error(`❌ Paso crítico falló: ${step.description}`, {
          error: step.error,
          duration: step.duration
        });
        throw error;
      } else {
        this.warnings.push(`Paso no crítico falló: ${step.description} - ${step.error}`);
        AppLogger.warn(`⚠️ Paso no crítico falló: ${step.description}`, {
          error: step.error,
          duration: step.duration
        });
      }
    }
  }

  /**
   * Marca un paso como omitido
   */
  private markStepSkipped(stepName: string, reason: string): void {
    const step = this.steps.find(s => s.name === stepName);
    if (step) {
      step.completed = true;
      step.duration = 0;
      this.warnings.push(`${step.description} omitido: ${reason}`);
      AppLogger.info(`⏭️ Omitido: ${step.description} - ${reason}`);
    }
  }

  /**
   * Valida la configuración antes de proceder
   */
  private async validateConfiguration(): Promise<void> {
    // Verificar que estemos en el directorio correcto
    const packageJsonPath = join(process.cwd(), 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error('No se encontró package.json. Ejecute desde el directorio del backend.');
    }

    // Verificar que Prisma esté configurado
    const prismaSchemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    if (!existsSync(prismaSchemaPath)) {
      throw new Error('No se encontró prisma/schema.prisma');
    }

    // Validar configuración de base de datos
    databaseConfig.validateConfiguration();

    AppLogger.info('✅ Configuración validada correctamente');
  }

  /**
   * Inicializa la base de datos
   */
  private async initializeDatabase(force: boolean = false): Promise<void> {
    const result = await this.dbInitService.initializeDatabase();
    
    if (!result.success) {
      throw new Error(`Error inicializando base de datos: ${result.message}`);
    }

    if (result.created) {
      AppLogger.info('🆕 Nueva base de datos creada');
    } else {
      AppLogger.info('🔄 Base de datos existente validada');
    }
  }

  /**
   * Genera el cliente Prisma
   */
  private async generatePrismaClient(): Promise<void> {
    await this.runCommand('npx', ['prisma', 'generate'], {
      description: 'Generando cliente Prisma'
    });
  }

  /**
   * Ejecuta las migraciones de Prisma
   */
  private async runMigrations(force: boolean = false): Promise<void> {
    const args = ['prisma', 'migrate', 'deploy'];
    
    // En desarrollo, usar migrate dev para crear migraciones si no existen
    if (databaseConfig.isDevelopment()) {
      args[2] = 'dev';
      args.push('--name', 'init');
    }

    await this.runCommand('npx', args, {
      description: 'Ejecutando migraciones de base de datos'
    });
  }

  /**
   * Ejecuta los seeds
   */
  private async runSeeds(): Promise<void> {
    await this.runCommand('npm', ['run', 'seed'], {
      description: 'Ejecutando seeds de datos iniciales'
    });
  }

  /**
   * Valida el setup final
   */
  private async validateFinalSetup(): Promise<void> {
    // Obtener información de la base de datos
    const dbInfo = await this.dbInitService.getDatabaseInfo();
    
    if ('error' in dbInfo) {
      throw new Error(`Error validando setup final: ${dbInfo.error}`);
    }

    AppLogger.info('📊 Información final de la base de datos:', dbInfo);
  }

  /**
   * Ejecuta un comando y maneja errores
   */
  private async runCommand(
    command: string, 
    args: string[], 
    options: { description?: string } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      AppLogger.info(`🔧 ${options.description || 'Ejecutando comando'}: ${command} ${args.join(' ')}`);
      
      const spawnOptions: SpawnOptions = {
        stdio: databaseConfig.isLoggingEnabled() ? 'inherit' : 'pipe',
        shell: true,
        cwd: process.cwd()
      };

      const childProcess = spawn(command, args, spawnOptions);
      
      let stdout = '';
      let stderr = '';

      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          const error = `Comando falló con código ${code}: ${stderr || stdout}`;
          reject(new Error(error));
        }
      });

      childProcess.on('error', (error) => {
        reject(new Error(`Error ejecutando comando: ${error.message}`));
      });

      // Timeout para comandos que se cuelguen
      setTimeout(() => {
        childProcess.kill();
        reject(new Error(`Comando timeout después de 5 minutos: ${command} ${args.join(' ')}`));
      }, 300000); // 5 minutos
    });
  }

  /**
   * Construye el resultado exitoso
   */
  private buildSuccessResult(): SetupResult {
    const totalDuration = Date.now() - this.startTime;
    
    return {
      success: true,
      totalDuration,
      steps: [...this.steps],
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  /**
   * Maneja fallos en el setup con rollback si es necesario
   */
  private async handleSetupFailure(error: unknown): Promise<SetupResult> {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    this.errors.push(errorMessage);

    const totalDuration = Date.now() - this.startTime;
    
    // Intentar rollback si es necesario y posible
    await this.attemptRollback();

    return {
      success: false,
      totalDuration,
      steps: [...this.steps],
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  /**
   * Intenta hacer rollback en caso de fallo
   */
  private async attemptRollback(): Promise<void> {
    try {
      const databaseStep = this.steps.find(s => s.name === 'database');
      
      if (databaseStep?.completed && databaseConfig.isDevelopment()) {
        AppLogger.warn('⚠️ Considerando rollback de base de datos...');
        // En desarrollo, podríamos eliminar la BD creada
        // En producción, NUNCA hacer rollback automático
        AppLogger.info('🛡️ Rollback automático deshabilitado por seguridad');
      }
    } catch (rollbackError) {
      AppLogger.error('❌ Error durante rollback:', rollbackError);
      this.errors.push(`Error en rollback: ${rollbackError}`);
    }
  }
}

/**
 * Función principal para usar desde scripts
 */
export async function setupDatabase(options: {
  force?: boolean;
  skipSeeds?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
} = {}): Promise<SetupResult> {
  const orchestrator = new DatabaseSetupOrchestrator();
  return orchestrator.setupDatabase(options);
}

/**
 * Ejecutar si es llamado directamente
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    force: args.includes('--force'),
    skipSeeds: args.includes('--skip-seeds'),
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run')
  };

  setupDatabase(options)
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Setup completado exitosamente');
        process.exit(0);
      } else {
        console.log('\n❌ Setup falló');
        console.log('Errores:', result.errors);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Error crítico en setup:', error);
      process.exit(1);
    });
} 