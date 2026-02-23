import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';

/**
 * Queue Service - Gestión de Colas Asíncronas
 */

interface DocumentValidationJobData {
  documentId: number;
  filePath: string;
  templateName: string;
  entityType: string;
}

interface DocumentAIValidationJobData {
  documentId: number;
  solicitadoPor?: number;
  esRechequeo?: boolean;
}

interface DLQJobData {
  originalQueue: string;
  originalJobId: string | undefined;
  originalData: unknown;
  failedReason: string;
  failedAt: string;
  attemptsMade: number;
}

class QueueService {
  private static instance: QueueService;
  private redis: Redis;
  private documentValidationQueue: Queue<DocumentValidationJobData>;
  private documentAIValidationQueue: Queue<DocumentAIValidationJobData>;
  private complianceQueue: Queue<{ type: 'verify-missing-equipo'; tenantId: number; equipoId: number }>;
  private dlqQueue: Queue<DLQJobData>;
  private dlqWorkers: Worker[] = [];

  private constructor() {
    // Configurar Redis (URL, TLS y password desde env)
    const env = getEnvironment();
    const url = env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url, { maxRetriesPerRequest: null });

    // Crear cola de validación de documentos
    this.documentValidationQueue = new Queue<DocumentValidationJobData>(
      'document-validation',
      {
        connection: this.redis as never,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }
    );

    // Contadores diarios: incrementar al completar / fallar
    (this.documentValidationQueue as any).on('completed', async () => {
      try { await this.incrementDailyCounter('completed'); } catch { /* Métrica no crítica */ }
    });
    (this.documentValidationQueue as any).on('failed', async () => {
      try { await this.incrementDailyCounter('failed'); } catch { /* Métrica no crítica */ }
    });

    // Crear cola de validación IA (control de documentos)
    this.documentAIValidationQueue = new Queue<DocumentAIValidationJobData>(
      'document-ai-validation',
      {
        connection: this.redis as never,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }
    );

    // Crear cola de verificación de cumplimiento
    this.complianceQueue = new Queue<{ type: 'verify-missing-equipo'; tenantId: number; equipoId: number }>(
      'compliance-checks',
      {
        connection: this.redis as never,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }
    );

    // Dead Letter Queue para jobs que agotan reintentos
    this.dlqQueue = new Queue<DLQJobData>('dead-letter-queue', {
      connection: this.redis as never,
      defaultJobOptions: { removeOnComplete: 500, removeOnFail: false },
    });

    this.setupDLQListeners();
    AppLogger.info('📬 Queue Service inicializado (con DLQ)');
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Agregar documento a cola de validación
   */
  public async addDocumentValidation(data: DocumentValidationJobData): Promise<void> {
    try {
      const job = await this.documentValidationQueue.add(
        'validate-document',
        data,
        {
          priority: this.calculatePriority(data.entityType),
          delay: 1000, // Delay de 1 segundo para evitar sobrecarga
        }
      );

      AppLogger.info(`📋 Documento ${data.documentId} agregado a cola de validación`, {
        jobId: job.id,
        templateName: data.templateName,
        entityType: data.entityType,
      });
    } catch (error) {
      AppLogger.error('💥 Error agregando documento a cola:', error);
      throw error;
    }
  }

  /**
   * Agregar documento a cola de validación IA
   */
  public async addDocumentAIValidation(data: DocumentAIValidationJobData): Promise<string | undefined> {
    try {
      const job = await this.documentAIValidationQueue.add(
        'validate-document-ai',
        data,
        {
          delay: 500,
        }
      );

      AppLogger.info(`🤖 Documento ${data.documentId} agregado a cola de validación IA`, {
        jobId: job.id,
        esRechequeo: data.esRechequeo || false,
      });

      return job.id;
    } catch (error) {
      AppLogger.error('💥 Error agregando documento a cola de validación IA:', error);
      throw error;
    }
  }

  /**
   * Agregar chequeo de faltantes para un equipo con delay
   */
  public async addMissingCheckForEquipo(tenantId: number, equipoId: number, delayMs?: number): Promise<void> {
    try {
      // Si no se indicó delay explícito, leer configuración del tenant
      let effectiveDelayMs = delayMs;
      if (effectiveDelayMs === undefined || effectiveDelayMs === null) {
        try {
          const { SystemConfigService } = await import('./system-config.service');
          const val = await SystemConfigService.getConfig(`tenant:${tenantId}:defaults.missingCheckDelayMinutes`);
          const globalVal = await SystemConfigService.getConfig('defaults.missingCheckDelayMinutes');

          // Determinar minutos: primero tenant, luego global, luego default 15
          let minutes = 15;
          if (val !== null) {
            minutes = Number(val);
          } else if (globalVal !== null) {
            minutes = Number(globalVal);
          }

          effectiveDelayMs = Number.isFinite(minutes) && minutes >= 0 ? minutes * 60 * 1000 : 15 * 60 * 1000;
        } catch {
          effectiveDelayMs = 15 * 60 * 1000;
        }
      }
      // Posponer verificación
      await this.complianceQueue.add('verify-missing-equipo', { type: 'verify-missing-equipo', tenantId, equipoId }, { delay: effectiveDelayMs });
      AppLogger.info(`⏳ Verificación de faltantes para equipo ${equipoId} pospuesta ${Math.round((effectiveDelayMs||0)/60000)} min`);
    } catch (error) {
      AppLogger.error('💥 Error encolando verificación de faltantes:', error);
    }
  }

  /**
   * Calcular prioridad del job basado en tipo de entidad
   */
  private calculatePriority(entityType: string): number {
    const priorities = {
      DADOR: 1,    // Máxima prioridad
      EMPRESA_TRANSPORTISTA: 2,
      CHOFER: 2,     // Alta prioridad  
      CAMION: 3,     // Media prioridad
      ACOPLADO: 4,   // Baja prioridad
    };

    return priorities[entityType as keyof typeof priorities] || 5;
  }

  /**
   * Obtener estadísticas de la cola
   */
  public async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    completedTotal: number;
    failedTotal: number;
  }> {
    try {
      const waiting = await this.documentValidationQueue.getWaiting();
      const active = await this.documentValidationQueue.getActive();
      const completed = await this.documentValidationQueue.getCompleted();
      const failed = await this.documentValidationQueue.getFailed();
      const delayed = await this.documentValidationQueue.getDelayed();
      // Contadores diarios desde Redis (resetean por fecha)
      const [completedDaily, failedDaily] = await Promise.all([
        this.getDailyCounter('completed'),
        this.getDailyCounter('failed'),
      ]);
      return {
        waiting: waiting.length,
        active: active.length,
        completed: completedDaily,
        failed: failedDaily,
        delayed: delayed.length,
        completedTotal: completed.length,
        failedTotal: failed.length,
      };
    } catch (error) {
      AppLogger.error('💥 Error obteniendo estadísticas de cola:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        completedTotal: 0,
        failedTotal: 0,
      };
    }
  }

  /**
   * Cancelar jobs de validación para un documento específico
   */
  public async cancelDocumentValidationJobs(documentId: number): Promise<void> {
    try {
      // Obtener jobs pendientes y activos
      const waitingJobs = await this.documentValidationQueue.getWaiting();
      const activeJobs = await this.documentValidationQueue.getActive();
      const delayedJobs = await this.documentValidationQueue.getDelayed();
      
      const allJobs = [...waitingJobs, ...activeJobs, ...delayedJobs];
      
      let canceledCount = 0;
      
      for (const job of allJobs) {
        if (job.data && job.data.documentId === documentId) {
          await job.remove();
          canceledCount++;
          AppLogger.info(`🚫 Job ${job.id} cancelado para documento ${documentId}`);
        }
      }
      
      if (canceledCount > 0) {
        AppLogger.info(`🧹 ${canceledCount} jobs cancelados para documento ${documentId}`);
      }
    } catch (error) {
      AppLogger.error(`💥 Error cancelando jobs para documento ${documentId}:`, error);
    }
  }

  /**
   * Limpiar jobs completados y fallidos
   */
  public async cleanQueue(): Promise<void> {
    try {
      await this.documentValidationQueue.clean(24 * 60 * 60 * 1000, 10, 'completed');
      await this.documentValidationQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');
      
      AppLogger.info('🧹 Cola limpiada exitosamente');
    } catch (error) {
      AppLogger.error('💥 Error limpiando cola:', error);
    }
  }

  // ==============================
  // Contadores diarios (Redis)
  // ==============================
  private getDailyKey(type: 'completed' | 'failed'): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `queue:document-validation:${type}:${yyyy}-${mm}-${dd}`;
  }

  private async incrementDailyCounter(type: 'completed' | 'failed'): Promise<void> {
    const key = this.getDailyKey(type);
    await this.redis.incr(key);
    // Expira en 14 días para no acumular
    await this.redis.expire(key, 14 * 24 * 60 * 60);
  }

  private async getDailyCounter(type: 'completed' | 'failed'): Promise<number> {
    const val = await this.redis.get(this.getDailyKey(type));
    return Number(val || 0) || 0;
  }

  /**
   * Configura listeners para mover jobs fallidos a la DLQ
   */
  private setupDLQListeners(): void {
    const moveToDLQ = async (job: Job | undefined, err: Error, queueName: string) => {
      if (!job) return;
      const maxAttempts = job.opts?.attempts ?? 3;
      if (job.attemptsMade < maxAttempts) return;

      try {
        await this.dlqQueue.add('dead-letter', {
          originalQueue: queueName,
          originalJobId: job.id,
          originalData: job.data,
          failedReason: err.message.slice(0, 500),
          failedAt: new Date().toISOString(),
          attemptsMade: job.attemptsMade,
        });
        AppLogger.warn(`Job ${job.id} movido a DLQ desde ${queueName}`, {
          reason: err.message.slice(0, 200),
        });
      } catch { /* DLQ insertion is best-effort */ }
    };

    const createDLQWorker = (queueName: string): Worker => {
      const w = new Worker(queueName, undefined as any, {
        connection: this.redis as never,
        autorun: false,
      });
      w.on('failed', (job, err) => moveToDLQ(job, err, queueName));
      return w;
    };

    (this.documentValidationQueue as any).on('failed', (job: Job, err: Error) =>
      moveToDLQ(job, err, 'document-validation')
    );
    (this.documentAIValidationQueue as any).on('failed', (job: Job, err: Error) =>
      moveToDLQ(job, err, 'document-ai-validation')
    );
    (this.complianceQueue as any).on('failed', (job: Job, err: Error) =>
      moveToDLQ(job, err, 'compliance-checks')
    );
  }

  /**
   * Estadísticas de la Dead Letter Queue
   */
  public async getDLQStats(): Promise<{ waiting: number; total: number }> {
    try {
      const waiting = await this.dlqQueue.getWaiting();
      return { waiting: waiting.length, total: waiting.length };
    } catch {
      return { waiting: 0, total: 0 };
    }
  }

  /**
   * Obtener jobs de la DLQ para inspección
   */
  public async getDLQJobs(limit = 20): Promise<DLQJobData[]> {
    try {
      const jobs = await this.dlqQueue.getWaiting(0, limit - 1);
      return jobs.map(j => j.data);
    } catch {
      return [];
    }
  }

  /**
   * Cerrar conexiones
   */
  public async close(): Promise<void> {
    try {
      await this.documentValidationQueue.close();
      await this.documentAIValidationQueue.close();
      await this.complianceQueue.close();
      await this.dlqQueue.close();
      for (const w of this.dlqWorkers) await w.close();
      await this.redis.quit();
      AppLogger.info('📬 Queue Service cerrado');
    } catch (error) {
      AppLogger.error('💥 Error cerrando Queue Service:', error);
    }
  }
}

// Exportar instancia singleton
export const queueService = QueueService.getInstance();