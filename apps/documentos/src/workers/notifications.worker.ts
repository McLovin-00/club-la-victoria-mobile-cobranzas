import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AppLogger } from '../config/logger';
import { NotificationService } from '../services/notification.service';
import { getEnvironment } from '../config/environment';

type NotificationsJob = { type: 'verify-missing-equipo'; tenantId: number; equipoId: number };

let workerInstance: Worker<NotificationsJob> | null = null;

export function getNotificationsWorker(): Worker<NotificationsJob> {
  if (workerInstance) return workerInstance;
  const env = getEnvironment();
  const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
  // Worker de verificación de cumplimiento (no envía notificación hasta pasar por service)
  workerInstance = new Worker<NotificationsJob>('compliance-checks', async (job: Job<NotificationsJob>) => {
    try {
      if (job.data.type === 'verify-missing-equipo') {
        const count = await NotificationService.checkMissingForEquipo(job.data.tenantId, job.data.equipoId);
        AppLogger.info(`📋 Verificación de faltantes ejecutada para equipo ${job.data.equipoId}. Envíos: ${count}`);
      }
    } catch (e) {
      AppLogger.error('💥 Error procesando job de verificación de cumplimiento:', e);
      throw e;
    }
  }, { connection: connection as never });

  AppLogger.info('🔔 Compliance Checks Worker inicializado');
  return workerInstance;
}


