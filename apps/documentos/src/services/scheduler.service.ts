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
      this.scheduleAuditRetention();
      this.scheduleNotificationCleanup();
      this.scheduleDailyComplianceEvaluation();
      this.scheduleMinioOrphanCleanup();
      
      AppLogger.info('✅ Todas las tareas programadas iniciadas');
    } catch (error) {
      AppLogger.error('💥 Error iniciando scheduler:', error);
    }
  }

  /**
   * Programar verificación de documentos vencidos (cada hora + midnight Argentina)
   */
  private scheduleDocumentExpirationCheck(): void {
    // Verificación cada hora en punto
    const hourlyTask = cron.schedule('0 * * * *', async () => {
      try {
        AppLogger.info('🔍 Ejecutando verificación de documentos vencidos (horaria)');
        const expiredCount = await DocumentService.checkExpiredDocuments();
        
        if (expiredCount > 0) {
          AppLogger.info(`⏰ ${expiredCount} documentos marcados como vencidos`);
        }
      } catch (error) {
        AppLogger.error('💥 Error en verificación de documentos vencidos:', error);
      }
    });

    this.tasks.set('document-expiration-check', hourlyTask);
    hourlyTask.start();

    // Verificación especial 5 minutos después de medianoche Argentina (03:05 UTC)
    // Captura documentos que vencieron al fin del día anterior (02:59:59 UTC)
    const midnightTask = cron.schedule('5 3 * * *', async () => {
      try {
        AppLogger.info('🔍 Ejecutando verificación de documentos vencidos (midnight AR)');
        const expiredCount = await DocumentService.checkExpiredDocuments();
        
        if (expiredCount > 0) {
          AppLogger.info(`⏰ Midnight AR: ${expiredCount} documentos marcados como vencidos`);
        }
      } catch (error) {
        AppLogger.error('💥 Error en verificación midnight AR:', error);
      }
    });

    this.tasks.set('document-expiration-check-midnight-ar', midnightTask);
    midnightTask.start();
    
    AppLogger.info('⏰ Tarea programada: Verificación de vencimientos (cada hora + 00:05 AR)');
  }

  /**
   * Retención de logs de auditoría - limpieza diaria a las 02:00
   * Default: 180 días (configurable vía SystemConfig: 'audit.retention.days')
   */
  private scheduleAuditRetention(): void {
    try {
      const task = cron.schedule('0 2 * * *', async () => {
        try {
          const { SystemConfigService } = await import('./system-config.service');
          const daysStr = await SystemConfigService.getConfig('audit.retention.days');
          const days = daysStr ? parseInt(daysStr, 10) : 180;
          const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          const { prisma } = await import('../config/database');
          const res = await (prisma as any).auditLog?.deleteMany
            ? (prisma as any).auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
            : null;
          AppLogger.info('🧹 Audit retention ejecutada', { deleted: (res?.count ?? 0), days });
        } catch (err) {
          AppLogger.error('💥 Error en audit retention task:', err);
        }
      });
      this.tasks.set('audit-retention', task);
    } catch (error) {
      AppLogger.error('💥 Error programando audit retention:', error);
    }
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
          const tenantId = t.tenantEmpresaId;
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
          const tenantId = t.tenantEmpresaId;
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
   * Programar limpieza automática de notificaciones (diario 04:00)
   */
  private scheduleNotificationCleanup(): void {
    const task = cron.schedule('0 4 * * *', async () => {
      try {
        AppLogger.info('🧹 Ejecutando limpieza de notificaciones');
        const { InternalNotificationService } = await import('./internal-notification.service');
        
        // 1. Eliminar notificaciones soft-deleted después de 30 días
        const deleted = await InternalNotificationService.cleanupOldNotifications(30);
        
        // 2. Auto-borrar notificaciones leídas después de 90 días
        const autoDeleted = await InternalNotificationService.cleanupOldReadNotifications(90);
        
        if (deleted > 0 || autoDeleted > 0) {
          AppLogger.info(`🧹 Limpieza de notificaciones completada`, { 
            eliminadasPermanentemente: deleted, 
            autoborradas: autoDeleted 
          });
        }
      } catch (error) {
        AppLogger.error('💥 Error en limpieza de notificaciones:', error);
      }
    });

    this.tasks.set('notification-cleanup', task);
    task.start();
    
    AppLogger.info('⏰ Tarea programada: Limpieza de notificaciones (diario 04:00)');
  }

  /**
   * Re-evaluación diaria de compliance de todos los equipos activos (06:00 AR / 09:00 UTC)
   */
  private scheduleDailyComplianceEvaluation(): void {
    const task = cron.schedule('0 9 * * *', async () => {
      try {
        AppLogger.info('Ejecutando re-evaluación diaria de compliance');
        const { db } = await import('../config/database');
        const { EquipoEvaluationService } = await import('./equipo-evaluation.service');
        const { invalidateComplianceCache } = await import('./compliance.service');

        invalidateComplianceCache();

        const equipos = await db.getClient().equipo.findMany({
          where: { activo: true },
          select: { id: true },
          orderBy: { id: 'asc' },
        });

        const ids = equipos.map(e => e.id);
        const results = await EquipoEvaluationService.evaluarEquipos(ids);
        const cambios = results.filter(r => r.cambio).length;

        AppLogger.info(`Re-evaluación diaria completada: ${results.length} equipos evaluados, ${cambios} cambios de estado`);
      } catch (error) {
        AppLogger.error('Error en re-evaluación diaria de compliance:', error);
      }
    });

    this.tasks.set('daily-compliance-evaluation', task);
    task.start();
    AppLogger.info('Tarea programada: Re-evaluación diaria de compliance (06:00 AR)');
  }

  /**
   * Limpieza semanal de archivos huérfanos en MinIO (domingos 05:00 AR / 08:00 UTC)
   */
  private scheduleMinioOrphanCleanup(): void {
    const task = cron.schedule('0 8 * * 0', async () => {
      try {
        AppLogger.info('Iniciando limpieza de archivos huérfanos en MinIO');
        const { db } = await import('../config/database');
        const { minioService } = await import('./minio.service');
        const prisma = db.getClient();

        const tenants = await prisma.dadorCarga.findMany({
          distinct: ['tenantEmpresaId'],
          select: { tenantEmpresaId: true },
        });

        let totalOrphans = 0;

        for (const t of tenants) {
          try {
            const bucketName = minioService.getResolvedBucketName(t.tenantEmpresaId);
            const docs = await prisma.document.findMany({
              where: { tenantEmpresaId: t.tenantEmpresaId },
              select: { filePath: true },
            });
            const validPaths = new Set(docs.map(d => d.filePath));

            const allKeys = await minioService.listObjectKeys(t.tenantEmpresaId);
            const orphans = allKeys.filter(key => {
              const fullPath = `${bucketName}/${key}`;
              return !validPaths.has(fullPath);
            });

            for (const orphanKey of orphans.slice(0, 100)) {
              try {
                await minioService.deleteDocument(bucketName, orphanKey);
                totalOrphans++;
              } catch { /* fallo individual no crítico */ }
            }

            if (orphans.length > 0) {
              AppLogger.info(`MinIO cleanup tenant ${t.tenantEmpresaId}: ${Math.min(orphans.length, 100)} huérfanos eliminados de ${orphans.length} encontrados`);
            }
          } catch (tenantErr) {
            AppLogger.warn(`Error en cleanup MinIO para tenant ${t.tenantEmpresaId}`, { error: (tenantErr as Error).message });
          }
        }

        AppLogger.info(`Limpieza de archivos huérfanos completada: ${totalOrphans} eliminados`);
      } catch (error) {
        AppLogger.error('Error en limpieza de archivos huérfanos:', error);
      }
    });

    this.tasks.set('minio-orphan-cleanup', task);
    task.start();
    AppLogger.info('Tarea programada: Limpieza de archivos huérfanos MinIO (domingos 05:00 AR)');
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
        case 'audit-retention':
          // Ejecutar la lógica una vez
          try {
            const { SystemConfigService } = await import('./system-config.service');
            const daysStr = await SystemConfigService.getConfig('audit.retention.days');
            const days = daysStr ? parseInt(daysStr, 10) : 180;
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const { prisma } = await import('../config/database');
            const res = await (prisma as any).auditLog?.deleteMany
              ? (prisma as any).auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
              : null;
            AppLogger.info('🧹 Audit retention ejecutada manualmente', { deleted: (res?.count ?? 0), days });
          } catch (err) {
            AppLogger.error('💥 Error ejecutando audit retention manual:', err);
            throw err;
          }
          break;
        case 'daily-compliance-evaluation':
          try {
            const { db: dbClient } = await import('../config/database');
            const { EquipoEvaluationService } = await import('./equipo-evaluation.service');
            const { invalidateComplianceCache } = await import('./compliance.service');
            invalidateComplianceCache();
            const allEquipos = await dbClient.getClient().equipo.findMany({ where: { activo: true }, select: { id: true } });
            await EquipoEvaluationService.evaluarEquipos(allEquipos.map(e => e.id));
          } catch (err) {
            AppLogger.error('Error ejecutando compliance evaluation manual:', err);
            throw err;
          }
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