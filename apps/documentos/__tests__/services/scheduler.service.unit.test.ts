jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const scheduled: Record<string, any> = {};

jest.mock('node-cron', () => ({
  schedule: (expr: string, fn: any) => {
    const task = {
      expr,
      fn,
      started: false,
      start: jest.fn(() => { task.started = true; }),
      stop: jest.fn(() => { task.started = false; }),
      getStatus: jest.fn(() => task.started ? 'scheduled' : 'stopped'),
    };
    scheduled[expr] = task;
    return task;
  },
}));

jest.mock('../../src/services/alert.service', () => ({
  alertService: { runScheduledChecks: jest.fn(async () => undefined) },
}));
jest.mock('../../src/services/document.service', () => ({
  DocumentService: { checkExpiredDocuments: jest.fn(async () => 0) },
}));
jest.mock('../../src/services/queue.service', () => ({
  queueService: { cleanQueue: jest.fn(async () => undefined), getQueueStats: jest.fn(async () => ({})) },
}));
jest.mock('../../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn(async () => undefined), cleanupOldData: jest.fn(async () => ({ deletedDocuments: 0, deletedFiles: 0 })) },
}));
jest.mock('../../src/services/notification.service', () => ({
  NotificationService: { checkExpirations: jest.fn(async () => 0), checkMissingDocs: jest.fn(async () => 0) },
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => ({ dadorCarga: { findMany: jest.fn(async () => [{ tenantEmpresaId: 1 }]) } }) },
  prisma: { auditLog: { deleteMany: jest.fn(async () => ({ count: 1 })) } },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => '1') },
}));

import { SchedulerService } from '../../src/services/scheduler.service';
import { DocumentService } from '../../src/services/document.service';
import { alertService } from '../../src/services/alert.service';
import { queueService } from '../../src/services/queue.service';
import { performanceService } from '../../src/services/performance.service';

describe('SchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SchedulerService as any).instance = undefined;
  });

  it('start schedules tasks and stop clears them', () => {
    const svc = SchedulerService.getInstance();
    svc.start();
    expect(svc.getTaskStatus().length).toBeGreaterThan(0);
    svc.stop();
    expect(svc.getTaskStatus()).toEqual([]);
  });

  it('runTaskManually routes to the right service and throws on unknown', async () => {
    const svc = SchedulerService.getInstance();

    await svc.runTaskManually('document-expiration-check');
    expect(DocumentService.checkExpiredDocuments).toHaveBeenCalled();

    await svc.runTaskManually('alert-checks');
    expect(alertService.runScheduledChecks).toHaveBeenCalled();

    await svc.runTaskManually('queue-cleanup');
    expect(queueService.cleanQueue).toHaveBeenCalled();

    await svc.runTaskManually('performance-optimization');
    expect(performanceService.refreshMaterializedView).toHaveBeenCalled();

    await expect(svc.runTaskManually('nope')).rejects.toThrow('Tarea desconocida');
  });
});


