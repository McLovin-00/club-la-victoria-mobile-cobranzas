import * as cron from 'node-cron';
import { alertService } from './alert.service';
import { DocumentService } from './document.service';
import { queueService } from './queue.service';
import { performanceService } from './performance.service';
import { AppLogger } from '../config/logger';
import { NotificationService } from './notification.service';

/**
 * Scheduler Service - Tareas Automáticas Programadas
 */

export class SchedulerService {
  private static instance: SchedulerService;
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {
    AppLogger.info('⏰ Scheduler Service inicializado');
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Inicializar todas las tareas programadas
   */
  public start(): void {
    try {
      this.scheduleDocumentExpirationCheck();
      this.scheduleAlertChecks();
      this.scheduleQueueCleanup();
      this.schedulePerformanceOptimization();
      this.scheduleNotifications();
      
      AppLogger.info('✅ Todas las tareas programadas iniciadas');
    } catch (error) {
      AppLogger.error('💥 Error iniciando scheduler:', error);
    }
  }

  /**
   * Programar verificación de documentos vencidos (cada hora)
   */
  private scheduleDocumentExpirationCheck(): void {
    const task = cron.schedule('0 * * * *', async () => {
      try {
        AppLogger.info('🔍 Ejecutando verificación de documentos vencidos');
        const expiredCount = await DocumentService.checkExpiredDocuments();
        
        if (expiredCount > 0) {
          AppLogger.info(`⏰ ${expiredCount} documentos marcados como vencidos`);
        }
      } catch (error) {
        AppLogger.error('💥 Error en verificación de documentos vencidos:', error);
      }
    });

    this.tasks.set('document-expiration-check', task);
    task.start();
    
    AppLogger.info('⏰ Tarea programada: Verificación de vencimientos (cada hora)');
  }

  /**
   * Programar verificaciones de alertas (cada 30 minutos)
   */
  private scheduleAlertChecks(): void {
    const task = cron.schedule('*/30 * * * *', async () => {
      try {
        AppLogger.info('🚨 Ejecutando verificaciones de alertas');
        await alertService.runScheduledChecks();
      } catch (error) {
        AppLogger.error('💥 Error en verificaciones de alertas:', error);
      }
    });

    this.tasks.set('alert-checks', task);
    task.start();
    
    AppLogger.info('⏰ Tarea programada: Verificaciones de alertas (cada 30 min)');
  }

  /**
   * Programar limpieza de colas (diariamente a las 2 AM)
   */
  private scheduleQueueCleanup(): void {
    const task = cron.schedule('0 2 * * *', async () => {
      try {
        AppLogger.info('🧹 Ejecutando limpieza de colas');
        await queueService.cleanQueue();
        
        const stats = await queueService.getQueueStats();
        AppLogger.info('📊 Estadísticas de cola después de limpieza:', stats);
      } catch (error) {
        AppLogger.error('💥 Error en limpieza de colas:', error);
      }
    });

    this.tasks.set('queue-cleanup', task);
    task.start();
    
    AppLogger.info('⏰ Tarea programada: Limpieza de colas (diariamente 2 AM)');
  }

  /**
   * Programar optimización de performance (cada 5 minutos)
   */
  private schedulePerformanceOptimization(): void {
    const task = cron.schedule('*/5 * * * *', async () => {
      try {
        AppLogger.debug('⚡ Ejecutando optimización de performance');
        
        // Refrescar vista materializada
        await performanceService.refreshMaterializedView();
        
        // Limpieza de datos antiguos (solo una vez al día)
        const now = new Date();
        if (now.getHours() === 3 && now.getMinutes() < 5) {
          const cleanupResult = await performanceService.cleanupOldData();
          AppLogger.info('🧹 Limpieza de datos completada', cleanupResult);
        }
        
      } catch (error) {
        AppLogger.error('💥 Error en optimización de performance:', error);
      }
    });

    this.tasks.set('performance-optimization', task);
    task.start();
    
    AppLogger.info('⏰ Tarea programada: Optimización performance (cada 5 min)');
  }

  /**
   * Programar notificaciones (vencimientos y faltantes)
   */
  private scheduleNotifications(): void {
    // Vencimientos: cada hora (offset a minuto 10 para no solaparse con otras tareas)
    const expireTask = cron.schedule('10 * * * *', async () => {
      try {
        const tenants = await (await import('../config/database')).db.getClient().dadorCarga.findMany({ distinct: ['tenantEmpresaId'], select: { tenantEmpresaId: true } });
        for (const t of tenants) {
          const tenantId = t.tenantEmpresaId as number;
          const count = await NotificationService.checkExpirations(tenantId);
          if (count > 0) AppLogger.info(`📨 Notificaciones por vencimiento enviadas (tenant ${tenantId}): ${count}`);
        }
      } catch (e) {
        AppLogger.error('💥 Error en notificaciones de vencimientos:', e);
      }
    });
    this.tasks.set('notifications-expirations', expireTask); expireTask.start();

    // Faltantes: diariamente 07:00
    const missingTask = cron.schedule('0 7 * * *', async () => {
      try {
        const tenants = await (await import('../config/database')).db.getClient().dadorCarga.findMany({ distinct: ['tenantEmpresaId'], select: { tenantEmpresaId: true } });
        for (const t of tenants) {
          const tenantId = t.tenantEmpresaId as number;
          const count = await NotificationService.checkMissingDocs(tenantId);
          if (count > 0) AppLogger.info(`📨 Notificaciones por faltantes enviadas (tenant ${tenantId}): ${count}`);
        }
      } catch (e) {
        AppLogger.error('💥 Error en notificaciones de faltantes:', e);
      }
    });
    this.tasks.set('notifications-missing', missingTask); missingTask.start();

    // Normalización de documentos sin fecha de vencimiento -> +100 años (diario 03:00)
    const normTask = cron.schedule('0 3 * * *', async () => {
      try {
        const { MaintenanceService } = await import('./maintenance.service');
        await MaintenanceService.normalizeDocumentExpires();
      } catch (e) {
        AppLogger.error('💥 Error normalizando vencimientos:', e);
      }
    });
    this.tasks.set('documents-expiry-normalization', normTask); normTask.start();

    AppLogger.info('⏰ Tareas programadas: Notificaciones (vencimientos cada hora, faltantes diario 07:00)');
  }

  /**
   * Detener todas las tareas programadas
   */
  public stop(): void {
    try {
      this.tasks.forEach((task, name) => {
        task.stop();
        AppLogger.info(`⏸️ Tarea detenida: ${name}`);
      });
      
      this.tasks.clear();
      AppLogger.info('✅ Todas las tareas programadas detenidas');
    } catch (error) {
      AppLogger.error('💥 Error deteniendo scheduler:', error);
    }
  }

  /**
   * Obtener estado de las tareas
   */
  public getTaskStatus(): Array<{
    name: string;
    running: boolean;
  }> {
    const status: Array<{ name: string; running: boolean }> = [];
    
    this.tasks.forEach((task, name) => {
      status.push({
        name,
        running: task.getStatus() === 'scheduled',
      });
    });
    
    return status;
  }

  /**
   * Ejecutar tarea específica manualmente
   */
  public async runTaskManually(taskName: string): Promise<void> {
    try {
      switch (taskName) {
        case 'document-expiration-check':
          await DocumentService.checkExpiredDocuments();
          break;
        case 'alert-checks':
          await alertService.runScheduledChecks();
          break;
        case 'queue-cleanup':
          await queueService.cleanQueue();
          break;
        case 'performance-optimization':
          await performanceService.refreshMaterializedView();
          break;
        default:
          throw new Error(`Tarea desconocida: ${taskName}`);
      }
      
      AppLogger.info(`✅ Tarea ejecutada manualmente: ${taskName}`);
    } catch (error) {
      AppLogger.error(`💥 Error ejecutando tarea ${taskName}:`, error);
      throw error;
    }
  }
}

// Exportar instancia singleton
export const schedulerService = SchedulerService.getInstance();