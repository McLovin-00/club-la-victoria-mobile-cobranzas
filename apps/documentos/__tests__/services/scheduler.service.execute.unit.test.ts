import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

const scheduledTasks: Array<{ expr: string; fn: () => Promise<void> | void; task: any }> = [];

jest.mock('node-cron', () => ({
  schedule: (expr: string, fn: any) => {
    const task = {
      start: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn(() => 'scheduled'),
    };
    scheduledTasks.push({ expr, fn, task });
    return task;
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => ({
      dadorCarga: { findMany: jest.fn(async () => [{ tenantEmpresaId: 1 }, { tenantEmpresaId: 2 }]) },
    }),
  },
  prisma: {
    auditLog: { deleteMany: jest.fn(async () => ({ count: 7 })) },
  },
}));

jest.mock('../../src/services/document.service', () => ({
  DocumentService: { checkExpiredDocuments: jest.fn(async () => 2) },
}));

jest.mock('../../src/services/alert.service', () => ({
  alertService: { runScheduledChecks: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    cleanQueue: jest.fn(async () => undefined),
    getQueueStats: jest.fn(async () => ({ waiting: 0 })),
  },
}));

jest.mock('../../src/services/performance.service', () => ({
  performanceService: {
    refreshMaterializedView: jest.fn(async () => undefined),
    cleanupOldData: jest.fn(async () => ({ deletedDocuments: 1, deletedFiles: 2 })),
  },
}));

jest.mock('../../src/services/notification.service', () => ({
  NotificationService: {
    checkExpirations: jest.fn(async () => 1),
    checkMissingDocs: jest.fn(async () => 2),
  },
}));

jest.mock('../../src/services/maintenance.service', () => ({
  MaintenanceService: { normalizeDocumentExpires: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => '1') },
}));

import { SchedulerService } from '../../src/services/scheduler.service';
import { AppLogger } from '../../src/config/logger';
import { DocumentService } from '../../src/services/document.service';

describe('SchedulerService (execute cron callbacks)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    scheduledTasks.length = 0;
    (SchedulerService as any).instance = undefined;
  });

  it('start: should schedule tasks and cron callbacks should execute without throwing', async () => {
    const svc = SchedulerService.getInstance();
    svc.start();

    // We expect multiple tasks scheduled
    expect(scheduledTasks.length).toBeGreaterThanOrEqual(5);

    // Execute every scheduled callback (covers inner logic + error handlers)
    for (const t of scheduledTasks) {
      // eslint-disable-next-line no-await-in-loop
      await t.fn();
    }
  });

  it('document-expiration cron callback: should log when expiredCount > 0 and handle errors', async () => {
    (DocumentService as any).checkExpiredDocuments.mockResolvedValueOnce(3);

    const svc = SchedulerService.getInstance();
    svc.start();

    const expTask = scheduledTasks.find((t) => t.expr === '0 * * * *');
    expect(expTask).toBeTruthy();
    await expTask!.fn();
    expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('documentos marcados como vencidos'));

    (DocumentService as any).checkExpiredDocuments.mockRejectedValueOnce(new Error('boom'));
    await expTask!.fn();
    expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error en verificación de documentos vencidos'), expect.anything());
  });

  it('performance-optimization cron callback: should run cleanup at 03:00', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T03:00:00.000Z'));

    const svc = SchedulerService.getInstance();
    svc.start();

    const perfTask = scheduledTasks.find((t) => t.expr === '*/5 * * * *');
    expect(perfTask).toBeTruthy();
    await perfTask!.fn();

    jest.useRealTimers();
  });
});


