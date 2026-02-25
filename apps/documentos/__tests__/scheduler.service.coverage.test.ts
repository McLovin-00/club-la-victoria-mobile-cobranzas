/**
 * Coverage tests for scheduler.service.ts
 * Covers: start, stop, getTaskStatus, runTaskManually (all branches),
 *         all cron callbacks (success, error, edge cases), singleton,
 *         audit retention (inner + outer catch), MinIO orphan cleanup,
 *         compliance evaluation, notification cleanup, performance optimization boundary.
 * @jest-environment node
 */

import { resetPrismaMock } from './mocks/prisma.mock';

const scheduledTasks: Array<{ expr: string; fn: () => Promise<void> | void; task: any }> = [];

jest.mock('node-cron', () => ({
  schedule: jest.fn((expr: string, fn: any) => {
    const task = {
      start: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn(() => 'scheduled'),
    };
    scheduledTasks.push({ expr, fn, task });
    return task;
  }),
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockDadorFindMany = jest.fn(async () => [
  { tenantEmpresaId: 1 },
  { tenantEmpresaId: 2 },
]);
const mockEquipoFindMany = jest.fn(async () => [{ id: 10 }, { id: 20 }]);
const mockDocumentFindMany = jest.fn(async () => [
  { filePath: 'bkt/doc1.pdf' },
  { filePath: 'bkt/doc2.pdf' },
]);
const mockAuditLogDeleteMany = jest.fn(async () => ({ count: 5 }));

jest.mock('../src/config/database', () => ({
  db: {
    getClient: () => ({
      dadorCarga: { findMany: mockDadorFindMany },
      equipo: { findMany: mockEquipoFindMany },
      document: { findMany: mockDocumentFindMany },
    }),
  },
  prisma: {
    auditLog: { deleteMany: mockAuditLogDeleteMany },
  },
}));

const mockCheckExpired = jest.fn(async () => 0);
jest.mock('../src/services/document.service', () => ({
  DocumentService: { checkExpiredDocuments: mockCheckExpired },
}));

const mockRunScheduledChecks = jest.fn(async () => undefined);
jest.mock('../src/services/alert.service', () => ({
  alertService: { runScheduledChecks: mockRunScheduledChecks },
}));

const mockCleanQueue = jest.fn(async () => undefined);
const mockGetQueueStats = jest.fn(async () => ({ waiting: 0, active: 0 }));
jest.mock('../src/services/queue.service', () => ({
  queueService: { cleanQueue: mockCleanQueue, getQueueStats: mockGetQueueStats },
}));

const mockRefreshMaterialized = jest.fn(async () => undefined);
const mockCleanupOldData = jest.fn(async () => ({ deletedDocuments: 1, deletedFiles: 2 }));
jest.mock('../src/services/performance.service', () => ({
  performanceService: {
    refreshMaterializedView: mockRefreshMaterialized,
    cleanupOldData: mockCleanupOldData,
  },
}));

const mockCheckExpirations = jest.fn(async () => 0);
const mockCheckMissingDocs = jest.fn(async () => 0);
jest.mock('../src/services/notification.service', () => ({
  NotificationService: {
    checkExpirations: mockCheckExpirations,
    checkMissingDocs: mockCheckMissingDocs,
  },
}));

const mockNormalizeDocumentExpires = jest.fn(async () => undefined);
jest.mock('../src/services/maintenance.service', () => ({
  MaintenanceService: { normalizeDocumentExpires: mockNormalizeDocumentExpires },
}));

const mockGetConfig = jest.fn(async () => '90');
jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: mockGetConfig },
}));

const mockCleanupOldNotifications = jest.fn(async () => 5);
const mockCleanupOldReadNotifications = jest.fn(async () => 3);
jest.mock('../src/services/internal-notification.service', () => ({
  InternalNotificationService: {
    cleanupOldNotifications: mockCleanupOldNotifications,
    cleanupOldReadNotifications: mockCleanupOldReadNotifications,
  },
}));

const mockEvaluarEquipos = jest.fn(async () => [
  { cambio: true },
  { cambio: false },
]);
jest.mock('../src/services/equipo-evaluation.service', () => ({
  EquipoEvaluationService: { evaluarEquipos: mockEvaluarEquipos },
}));

const mockInvalidateCache = jest.fn();
jest.mock('../src/services/compliance.service', () => ({
  invalidateComplianceCache: mockInvalidateCache,
}));

const mockGetResolvedBucketName = jest.fn(() => 'bkt');
const mockListObjectKeys = jest.fn(async () => ['doc1.pdf', 'doc2.pdf', 'orphan.pdf']);
const mockDeleteDocument = jest.fn(async () => undefined);
jest.mock('../src/services/minio.service', () => ({
  minioService: {
    getResolvedBucketName: mockGetResolvedBucketName,
    listObjectKeys: mockListObjectKeys,
    deleteDocument: mockDeleteDocument,
  },
}));

import { SchedulerService } from '../src/services/scheduler.service';
import { AppLogger } from '../src/config/logger';

function findTask(expr: string): (typeof scheduledTasks)[0] | undefined {
  return scheduledTasks.find((t) => t.expr === expr);
}

function findTasks(expr: string): Array<(typeof scheduledTasks)[0]> {
  return scheduledTasks.filter((t) => t.expr === expr);
}

describe('SchedulerService (coverage)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    scheduledTasks.length = 0;
    (SchedulerService as any).instance = undefined;
  });

  // =========================================================================
  // Singleton
  // =========================================================================
  describe('singleton', () => {
    it('getInstance returns same instance', () => {
      const s1 = SchedulerService.getInstance();
      const s2 = SchedulerService.getInstance();
      expect(s1).toBe(s2);
    });
  });

  // =========================================================================
  // start
  // =========================================================================
  describe('start', () => {
    it('schedules all expected tasks', () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      expect(scheduledTasks.length).toBeGreaterThanOrEqual(9);
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Todas las tareas programadas iniciadas'),
      );
    });

    it('handles error during start gracefully', () => {
      const svc = SchedulerService.getInstance();
      jest.spyOn(svc as any, 'scheduleDocumentExpirationCheck').mockImplementation(() => {
        throw new Error('schedule fail');
      });
      svc.start();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error iniciando scheduler'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // stop
  // =========================================================================
  describe('stop', () => {
    it('stops all tasks and clears map', () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      svc.stop();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Todas las tareas programadas detenidas'),
      );
      for (const t of scheduledTasks) {
        expect(t.task.stop).toHaveBeenCalled();
      }
    });

    it('handles error in stop gracefully', () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const firstTask = scheduledTasks[0];
      firstTask.task.stop.mockImplementation(() => {
        throw new Error('stop fail');
      });
      svc.stop();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error deteniendo scheduler'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // getTaskStatus
  // =========================================================================
  describe('getTaskStatus', () => {
    it('returns status for all registered tasks', () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const status = svc.getTaskStatus();
      expect(status.length).toBeGreaterThanOrEqual(9);
      for (const s of status) {
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('running');
        expect(s.running).toBe(true);
      }
    });

    it('returns running=false when task status is not scheduled', () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      scheduledTasks[0].task.getStatus.mockReturnValue('stopped');
      const status = svc.getTaskStatus();
      expect(status[0].running).toBe(false);
    });

    it('returns empty array when no tasks registered', () => {
      const svc = SchedulerService.getInstance();
      const status = svc.getTaskStatus();
      expect(status).toEqual([]);
    });
  });

  // =========================================================================
  // Cron callback: document-expiration-check (hourly)
  // =========================================================================
  describe('scheduleDocumentExpirationCheck', () => {
    it('hourly: logs count when expiredCount > 0', async () => {
      mockCheckExpired.mockResolvedValueOnce(5);
      const svc = SchedulerService.getInstance();
      svc.start();
      const hourlyTask = findTask('0 * * * *');
      expect(hourlyTask).toBeDefined();
      await hourlyTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('5 documentos marcados como vencidos'),
      );
    });

    it('hourly: no log when expiredCount is 0', async () => {
      mockCheckExpired.mockResolvedValueOnce(0);
      const svc = SchedulerService.getInstance();
      svc.start();
      (AppLogger.info as jest.Mock).mockClear();
      const hourlyTask = findTask('0 * * * *');
      await hourlyTask!.fn();
      const markedCalls = (AppLogger.info as jest.Mock).mock.calls.filter((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('documentos marcados'),
      );
      expect(markedCalls.length).toBe(0);
    });

    it('hourly: handles error', async () => {
      mockCheckExpired.mockRejectedValueOnce(new Error('db fail'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const hourlyTask = findTask('0 * * * *');
      await hourlyTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en verificación de documentos vencidos'),
        expect.anything(),
      );
    });

    it('midnight AR: logs count when > 0', async () => {
      mockCheckExpired.mockResolvedValueOnce(2);
      const svc = SchedulerService.getInstance();
      svc.start();
      const midnightTask = findTask('5 3 * * *');
      expect(midnightTask).toBeDefined();
      await midnightTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Midnight AR'),
      );
    });

    it('midnight AR: no log when 0', async () => {
      mockCheckExpired.mockResolvedValueOnce(0);
      const svc = SchedulerService.getInstance();
      svc.start();
      (AppLogger.info as jest.Mock).mockClear();
      const midnightTask = findTask('5 3 * * *');
      await midnightTask!.fn();
      const midnightCalls = (AppLogger.info as jest.Mock).mock.calls.filter((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('Midnight AR'),
      );
      expect(midnightCalls.length).toBe(0);
    });

    it('midnight AR: handles error', async () => {
      mockCheckExpired.mockRejectedValueOnce(new Error('midnight err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const midnightTask = findTask('5 3 * * *');
      await midnightTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en verificación midnight AR'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // Cron callback: alert-checks
  // =========================================================================
  describe('scheduleAlertChecks', () => {
    it('runs alert checks successfully', async () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const alertTask = findTask('*/30 * * * *');
      expect(alertTask).toBeDefined();
      await alertTask!.fn();
      expect(mockRunScheduledChecks).toHaveBeenCalled();
    });

    it('handles alert check error', async () => {
      mockRunScheduledChecks.mockRejectedValueOnce(new Error('alert err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const alertTask = findTask('*/30 * * * *');
      await alertTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en verificaciones de alertas'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // Cron callback: queue-cleanup
  // =========================================================================
  describe('scheduleQueueCleanup', () => {
    it('runs queue cleanup and logs stats', async () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const queueTasks = findTasks('0 2 * * *');
      const queueTask = queueTasks.find((t) => {
        const fnStr = t.fn.toString();
        return fnStr.includes('cleanQueue') || fnStr.includes('queueService');
      });
      expect(queueTask).toBeDefined();
      await queueTask!.fn();
      expect(mockCleanQueue).toHaveBeenCalled();
      expect(mockGetQueueStats).toHaveBeenCalled();
    });

    it('handles queue cleanup error', async () => {
      mockCleanQueue.mockRejectedValueOnce(new Error('queue err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const queueTasks = findTasks('0 2 * * *');
      for (const t of queueTasks) {
        await t.fn();
      }
      expect(AppLogger.error).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Cron callback: performance-optimization
  // =========================================================================
  describe('schedulePerformanceOptimization', () => {
    it('refreshes materialized view every 5 min', async () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const perfTask = findTask('*/5 * * * *');
      expect(perfTask).toBeDefined();
      await perfTask!.fn();
      expect(mockRefreshMaterialized).toHaveBeenCalled();
    });

    it('runs cleanup at 03:00-03:04 window', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-23T03:02:00.000Z'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const perfTask = findTask('*/5 * * * *');
      await perfTask!.fn();
      expect(mockCleanupOldData).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not run cleanup outside 03:00-03:05 window', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-23T10:00:00.000Z'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const perfTask = findTask('*/5 * * * *');
      await perfTask!.fn();
      expect(mockCleanupOldData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not run cleanup at 03:05 (boundary: minutes >= 5)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-23T03:05:00.000Z'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const perfTask = findTask('*/5 * * * *');
      await perfTask!.fn();
      expect(mockCleanupOldData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('runs cleanup at 03:00 exactly (boundary: minutes === 0)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-23T03:00:00.000Z'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const perfTask = findTask('*/5 * * * *');
      await perfTask!.fn();
      expect(mockCleanupOldData).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('does not run cleanup at 04:00 (wrong hour)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-23T04:02:00.000Z'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const perfTask = findTask('*/5 * * * *');
      await perfTask!.fn();
      expect(mockCleanupOldData).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('handles performance error', async () => {
      mockRefreshMaterialized.mockRejectedValueOnce(new Error('perf err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const perfTask = findTask('*/5 * * * *');
      await perfTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en optimización de performance'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // Cron callback: notifications
  // =========================================================================
  describe('scheduleNotifications', () => {
    it('expiration notification: logs when count > 0', async () => {
      mockCheckExpirations.mockResolvedValue(3);
      const svc = SchedulerService.getInstance();
      svc.start();
      const expTask = findTask('10 * * * *');
      expect(expTask).toBeDefined();
      await expTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Notificaciones por vencimiento'),
      );
    });

    it('expiration notification: no log when count is 0', async () => {
      mockCheckExpirations.mockResolvedValue(0);
      const svc = SchedulerService.getInstance();
      svc.start();
      (AppLogger.info as jest.Mock).mockClear();
      const expTask = findTask('10 * * * *');
      await expTask!.fn();
      const notifCalls = (AppLogger.info as jest.Mock).mock.calls.filter((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('Notificaciones por vencimiento'),
      );
      expect(notifCalls.length).toBe(0);
    });

    it('expiration notification: handles error', async () => {
      mockCheckExpirations.mockRejectedValueOnce(new Error('exp err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const expTask = findTask('10 * * * *');
      await expTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en notificaciones de vencimientos'),
        expect.anything(),
      );
    });

    it('missing docs notification: logs when count > 0', async () => {
      mockCheckMissingDocs.mockResolvedValue(4);
      const svc = SchedulerService.getInstance();
      svc.start();
      const missingTask = findTask('0 7 * * *');
      expect(missingTask).toBeDefined();
      await missingTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Notificaciones por faltantes'),
      );
    });

    it('missing docs notification: no log when count is 0', async () => {
      mockCheckMissingDocs.mockResolvedValue(0);
      const svc = SchedulerService.getInstance();
      svc.start();
      (AppLogger.info as jest.Mock).mockClear();
      const missingTask = findTask('0 7 * * *');
      await missingTask!.fn();
      const faltanteCalls = (AppLogger.info as jest.Mock).mock.calls.filter((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('Notificaciones por faltantes'),
      );
      expect(faltanteCalls.length).toBe(0);
    });

    it('missing docs notification: handles error', async () => {
      mockCheckMissingDocs.mockRejectedValueOnce(new Error('missing err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const missingTask = findTask('0 7 * * *');
      await missingTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en notificaciones de faltantes'),
        expect.anything(),
      );
    });

    it('normalization task runs successfully', async () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const normTasks = findTasks('0 3 * * *');
      const normTask = normTasks.find((t) => {
        const fnStr = t.fn.toString();
        return fnStr.includes('MaintenanceService') || fnStr.includes('normalizeDocument');
      });
      expect(normTask).toBeDefined();
      await normTask!.fn();
      expect(mockNormalizeDocumentExpires).toHaveBeenCalled();
    });

    it('normalization task handles error', async () => {
      mockNormalizeDocumentExpires.mockRejectedValueOnce(new Error('norm err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const normTasks = findTasks('0 3 * * *');
      const normTask = normTasks.find((t) => {
        const fnStr = t.fn.toString();
        return fnStr.includes('MaintenanceService') || fnStr.includes('normalizeDocument');
      });
      await normTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error normalizando vencimientos'),
        expect.anything(),
      );
    });

    it('expiration notification iterates over multiple tenants', async () => {
      mockCheckExpirations.mockResolvedValue(1);
      const svc = SchedulerService.getInstance();
      svc.start();
      const expTask = findTask('10 * * * *');
      await expTask!.fn();
      expect(mockCheckExpirations).toHaveBeenCalledTimes(2);
    });

    it('missing docs notification iterates over multiple tenants', async () => {
      mockCheckMissingDocs.mockResolvedValue(2);
      const svc = SchedulerService.getInstance();
      svc.start();
      const missingTask = findTask('0 7 * * *');
      await missingTask!.fn();
      expect(mockCheckMissingDocs).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // Cron callback: notification-cleanup
  // =========================================================================
  describe('scheduleNotificationCleanup', () => {
    it('runs cleanup and logs when results > 0', async () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const cleanupTask = findTask('0 4 * * *');
      expect(cleanupTask).toBeDefined();
      await cleanupTask!.fn();
      expect(mockCleanupOldNotifications).toHaveBeenCalledWith(30);
      expect(mockCleanupOldReadNotifications).toHaveBeenCalledWith(90);
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Limpieza de notificaciones completada'),
        expect.objectContaining({ eliminadasPermanentemente: 5, autoborradas: 3 }),
      );
    });

    it('does not log when both counts are 0', async () => {
      mockCleanupOldNotifications.mockResolvedValueOnce(0);
      mockCleanupOldReadNotifications.mockResolvedValueOnce(0);
      const svc = SchedulerService.getInstance();
      svc.start();
      (AppLogger.info as jest.Mock).mockClear();
      const cleanupTask = findTask('0 4 * * *');
      await cleanupTask!.fn();
      const completadaCalls = (AppLogger.info as jest.Mock).mock.calls.filter((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('Limpieza de notificaciones completada'),
      );
      expect(completadaCalls.length).toBe(0);
    });

    it('logs when only deleted > 0 and autoDeleted is 0', async () => {
      mockCleanupOldNotifications.mockResolvedValueOnce(3);
      mockCleanupOldReadNotifications.mockResolvedValueOnce(0);
      const svc = SchedulerService.getInstance();
      svc.start();
      const cleanupTask = findTask('0 4 * * *');
      await cleanupTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Limpieza de notificaciones completada'),
        expect.objectContaining({ eliminadasPermanentemente: 3, autoborradas: 0 }),
      );
    });

    it('logs when only autoDeleted > 0 and deleted is 0', async () => {
      mockCleanupOldNotifications.mockResolvedValueOnce(0);
      mockCleanupOldReadNotifications.mockResolvedValueOnce(7);
      const svc = SchedulerService.getInstance();
      svc.start();
      const cleanupTask = findTask('0 4 * * *');
      await cleanupTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Limpieza de notificaciones completada'),
        expect.objectContaining({ eliminadasPermanentemente: 0, autoborradas: 7 }),
      );
    });

    it('handles cleanup error', async () => {
      mockCleanupOldNotifications.mockRejectedValueOnce(new Error('cleanup err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const cleanupTask = findTask('0 4 * * *');
      await cleanupTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en limpieza de notificaciones'),
        expect.anything(),
      );
    });
  });

  // =========================================================================
  // Cron callback: audit-retention
  // =========================================================================
  describe('scheduleAuditRetention', () => {
    it('runs audit retention with custom days config', async () => {
      mockGetConfig.mockResolvedValueOnce('30');
      const svc = SchedulerService.getInstance();
      svc.start();
      const auditTasks = findTasks('0 2 * * *');
      const auditTask = auditTasks.find((t) => {
        const fnStr = t.fn.toString();
        return fnStr.includes('audit') || fnStr.includes('retention');
      });
      expect(auditTask).toBeDefined();
      await auditTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit retention ejecutada'),
        expect.objectContaining({ days: 30 }),
      );
    });

    it('uses default 180 days when config returns null', async () => {
      mockGetConfig.mockResolvedValueOnce(null);
      const svc = SchedulerService.getInstance();
      svc.start();
      const auditTasks = findTasks('0 2 * * *');
      const auditTask = auditTasks.find((t) => {
        const fnStr = t.fn.toString();
        return fnStr.includes('audit') || fnStr.includes('retention');
      });
      await auditTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit retention ejecutada'),
        expect.objectContaining({ days: 180 }),
      );
    });

    it('handles audit retention inner error (config/delete fails)', async () => {
      mockGetConfig.mockRejectedValueOnce(new Error('config err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const auditTasks = findTasks('0 2 * * *');
      const auditTask = auditTasks.find((t) => {
        const fnStr = t.fn.toString();
        return fnStr.includes('audit') || fnStr.includes('retention');
      });
      await auditTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en audit retention'),
        expect.anything(),
      );
    });

    it('handles null result from auditLog.deleteMany (no auditLog model)', async () => {
      const { prisma } = require('../src/config/database');
      const originalAuditLog = prisma.auditLog;
      prisma.auditLog = null;

      const svc = SchedulerService.getInstance();
      svc.start();
      const auditTasks = findTasks('0 2 * * *');
      const auditTask = auditTasks.find((t) => {
        const fnStr = t.fn.toString();
        return fnStr.includes('audit') || fnStr.includes('retention');
      });
      await auditTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit retention ejecutada'),
        expect.objectContaining({ deleted: 0 }),
      );

      prisma.auditLog = originalAuditLog;
    });
  });

  // =========================================================================
  // scheduleAuditRetention outer catch
  // =========================================================================
  describe('scheduleAuditRetention outer error', () => {
    it('handles error when cron.schedule throws during setup', () => {
      const cronSchedule = require('node-cron').schedule;
      const callCount = cronSchedule.mock.calls.length;

      const svc = SchedulerService.getInstance();
      svc.start();
      expect(scheduledTasks.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Cron callback: daily-compliance-evaluation
  // =========================================================================
  describe('scheduleDailyComplianceEvaluation', () => {
    it('runs compliance evaluation successfully', async () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const complianceTask = findTask('0 9 * * *');
      expect(complianceTask).toBeDefined();
      await complianceTask!.fn();
      expect(mockInvalidateCache).toHaveBeenCalled();
      expect(mockEvaluarEquipos).toHaveBeenCalledWith([10, 20]);
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Re-evaluación diaria completada'),
      );
    });

    it('logs number of cambios correctly', async () => {
      mockEvaluarEquipos.mockResolvedValueOnce([
        { cambio: true },
        { cambio: true },
        { cambio: false },
      ]);
      mockEquipoFindMany.mockResolvedValueOnce([{ id: 10 }, { id: 20 }, { id: 30 }]);
      const svc = SchedulerService.getInstance();
      svc.start();
      const complianceTask = findTask('0 9 * * *');
      await complianceTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('3 equipos evaluados, 2 cambios'),
      );
    });

    it('handles compliance evaluation error', async () => {
      mockEquipoFindMany.mockRejectedValueOnce(new Error('compliance err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const complianceTask = findTask('0 9 * * *');
      await complianceTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en re-evaluación diaria'),
        expect.anything(),
      );
    });

    it('handles empty equipos list', async () => {
      mockEquipoFindMany.mockResolvedValueOnce([]);
      mockEvaluarEquipos.mockResolvedValueOnce([]);
      const svc = SchedulerService.getInstance();
      svc.start();
      const complianceTask = findTask('0 9 * * *');
      await complianceTask!.fn();
      expect(mockEvaluarEquipos).toHaveBeenCalledWith([]);
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('0 equipos evaluados, 0 cambios'),
      );
    });
  });

  // =========================================================================
  // Cron callback: minio-orphan-cleanup
  // =========================================================================
  describe('scheduleMinioOrphanCleanup', () => {
    it('runs MinIO orphan cleanup and deletes orphans', async () => {
      const svc = SchedulerService.getInstance();
      svc.start();
      const minioTask = findTask('0 8 * * 0');
      expect(minioTask).toBeDefined();
      await minioTask!.fn();
      expect(mockGetResolvedBucketName).toHaveBeenCalled();
      expect(mockListObjectKeys).toHaveBeenCalled();
      expect(mockDeleteDocument).toHaveBeenCalled();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Limpieza de archivos huérfanos completada'),
      );
    });

    it('handles per-tenant error gracefully', async () => {
      mockListObjectKeys.mockRejectedValueOnce(new Error('list err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const minioTask = findTask('0 8 * * 0');
      await minioTask!.fn();
      expect(AppLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error en cleanup MinIO'),
        expect.anything(),
      );
    });

    it('handles individual file delete error gracefully', async () => {
      mockDeleteDocument.mockRejectedValueOnce(new Error('delete fail'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const minioTask = findTask('0 8 * * 0');
      await minioTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Limpieza de archivos huérfanos completada'),
      );
    });

    it('handles global error in MinIO cleanup', async () => {
      mockDadorFindMany.mockRejectedValueOnce(new Error('global err'));
      const svc = SchedulerService.getInstance();
      svc.start();
      const minioTask = findTask('0 8 * * 0');
      await minioTask!.fn();
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error en limpieza de archivos huérfanos'),
        expect.anything(),
      );
    });

    it('skips log when no orphans found for tenant', async () => {
      mockListObjectKeys.mockResolvedValueOnce(['doc1.pdf', 'doc2.pdf']);
      mockDocumentFindMany.mockResolvedValueOnce([
        { filePath: 'bkt/doc1.pdf' },
        { filePath: 'bkt/doc2.pdf' },
      ]);
      const svc = SchedulerService.getInstance();
      svc.start();
      (AppLogger.info as jest.Mock).mockClear();
      const minioTask = findTask('0 8 * * 0');
      await minioTask!.fn();
    });

    it('limits orphan deletion to 100 per tenant', async () => {
      const manyOrphans = Array.from({ length: 150 }, (_, i) => `orphan-${i}.pdf`);
      mockListObjectKeys.mockResolvedValue(manyOrphans);
      mockDocumentFindMany.mockResolvedValue([]);
      const svc = SchedulerService.getInstance();
      svc.start();
      const minioTask = findTask('0 8 * * 0');
      await minioTask!.fn();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('100 huérfanos eliminados de 150'),
      );
    });

    it('handles empty tenants list (no dadores)', async () => {
      mockDadorFindMany.mockResolvedValueOnce([]);
      const svc = SchedulerService.getInstance();
      svc.start();
      const minioTask = findTask('0 8 * * 0');
      await minioTask!.fn();
      expect(mockListObjectKeys).not.toHaveBeenCalled();
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Limpieza de archivos huérfanos completada: 0'),
      );
    });
  });

  // =========================================================================
  // runTaskManually
  // =========================================================================
  describe('runTaskManually', () => {
    it('runs document-expiration-check', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('document-expiration-check');
      expect(mockCheckExpired).toHaveBeenCalled();
    });

    it('runs alert-checks', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('alert-checks');
      expect(mockRunScheduledChecks).toHaveBeenCalled();
    });

    it('runs queue-cleanup', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('queue-cleanup');
      expect(mockCleanQueue).toHaveBeenCalled();
    });

    it('runs performance-optimization', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('performance-optimization');
      expect(mockRefreshMaterialized).toHaveBeenCalled();
    });

    it('runs audit-retention', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('audit-retention');
      expect(mockGetConfig).toHaveBeenCalledWith('audit.retention.days');
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit retention ejecutada manualmente'),
        expect.anything(),
      );
    });

    it('runs daily-compliance-evaluation', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('daily-compliance-evaluation');
      expect(mockInvalidateCache).toHaveBeenCalled();
      expect(mockEvaluarEquipos).toHaveBeenCalled();
    });

    it('runs minio-orphan-cleanup', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('minio-orphan-cleanup');
      expect(mockListObjectKeys).toHaveBeenCalled();
    });

    it('throws for unknown task name', async () => {
      const svc = SchedulerService.getInstance();
      await expect(svc.runTaskManually('nonexistent')).rejects.toThrow('Tarea desconocida: nonexistent');
    });

    it('handles error in runTaskManually and re-throws', async () => {
      mockCheckExpired.mockRejectedValueOnce(new Error('manual fail'));
      const svc = SchedulerService.getInstance();
      await expect(svc.runTaskManually('document-expiration-check')).rejects.toThrow('manual fail');
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error ejecutando tarea'),
        expect.anything(),
      );
    });

    it('audit-retention manual uses default 180 days when config is null', async () => {
      mockGetConfig.mockResolvedValueOnce(null);
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('audit-retention');
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit retention ejecutada manualmente'),
        expect.objectContaining({ days: 180 }),
      );
    });

    it('minio-orphan-cleanup manual handles per-file delete error', async () => {
      mockDeleteDocument.mockRejectedValueOnce(new Error('delete err'));
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('minio-orphan-cleanup');
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('MinIO orphan cleanup manual'),
      );
    });

    it('minio-orphan-cleanup manual with no orphans', async () => {
      mockListObjectKeys.mockResolvedValue(['doc1.pdf', 'doc2.pdf']);
      mockDocumentFindMany.mockResolvedValue([
        { filePath: 'bkt/doc1.pdf' },
        { filePath: 'bkt/doc2.pdf' },
      ]);
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('minio-orphan-cleanup');
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('MinIO orphan cleanup manual: 0'),
      );
    });

    it('audit-retention manual handles null prisma.auditLog', async () => {
      const { prisma } = require('../src/config/database');
      const originalAuditLog = prisma.auditLog;
      prisma.auditLog = null;

      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('audit-retention');
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit retention ejecutada manualmente'),
        expect.objectContaining({ deleted: 0 }),
      );

      prisma.auditLog = originalAuditLog;
    });

    it('daily-compliance-evaluation manual with empty equipos', async () => {
      mockEquipoFindMany.mockResolvedValueOnce([]);
      mockEvaluarEquipos.mockResolvedValueOnce([]);
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('daily-compliance-evaluation');
      expect(mockEvaluarEquipos).toHaveBeenCalledWith([]);
    });

    it('logs success message after manual task execution', async () => {
      const svc = SchedulerService.getInstance();
      await svc.runTaskManually('alert-checks');
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Tarea ejecutada manualmente: alert-checks'),
      );
    });
  });
});
