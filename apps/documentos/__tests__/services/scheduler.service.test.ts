/**
 * Tests unitarios para SchedulerService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mock cron before importing service
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn(() => 'scheduled'),
  })),
}));

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/alert.service', () => ({
  alertService: {
    runScheduledChecks: jest.fn(),
  },
}));

jest.mock('../../src/services/document.service', () => ({
  DocumentService: {
    checkExpiredDocuments: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    cleanQueue: jest.fn(),
    getQueueStats: jest.fn().mockResolvedValue({ pending: 0, completed: 0 }),
  },
}));

jest.mock('../../src/services/performance.service', () => ({
  performanceService: {
    refreshMaterializedView: jest.fn(),
    cleanupOldData: jest.fn().mockResolvedValue({ deleted: 0 }),
  },
}));

jest.mock('../../src/services/notification.service', () => ({
  NotificationService: {
    checkExpirations: jest.fn().mockResolvedValue(0),
    checkMissingDocs: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: {
    getConfig: jest.fn().mockResolvedValue('180'),
  },
}));

jest.mock('../../src/services/maintenance.service', () => ({
  MaintenanceService: {
    normalizeDocumentExpires: jest.fn(),
  },
}));

import * as cron from 'node-cron';
import { SchedulerService, schedulerService } from '../../src/services/scheduler.service';
import { DocumentService } from '../../src/services/document.service';
import { alertService } from '../../src/services/alert.service';
import { queueService } from '../../src/services/queue.service';
import { performanceService } from '../../src/services/performance.service';

describe('SchedulerService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SchedulerService.getInstance();
      const instance2 = SchedulerService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export singleton as schedulerService', () => {
      expect(schedulerService).toBe(SchedulerService.getInstance());
    });
  });

  describe('start', () => {
    it('should schedule all tasks', () => {
      const service = SchedulerService.getInstance();
      service.start();

      // Should schedule multiple cron jobs
      expect(cron.schedule).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop all tasks', () => {
      const service = SchedulerService.getInstance();
      service.start();
      service.stop();

      // Tasks should be cleared
      const status = service.getTaskStatus();
      expect(status).toEqual([]);
    });
  });

  describe('getTaskStatus', () => {
    it('should return status of all tasks', () => {
      const service = SchedulerService.getInstance();
      service.start();

      const status = service.getTaskStatus();

      expect(Array.isArray(status)).toBe(true);
      status.forEach((task) => {
        expect(task).toHaveProperty('name');
        expect(task).toHaveProperty('running');
      });
    });
  });

  describe('runTaskManually', () => {
    it('should run document-expiration-check', async () => {
      const service = SchedulerService.getInstance();
      await service.runTaskManually('document-expiration-check');

      expect(DocumentService.checkExpiredDocuments).toHaveBeenCalled();
    });

    it('should run alert-checks', async () => {
      const service = SchedulerService.getInstance();
      await service.runTaskManually('alert-checks');

      expect(alertService.runScheduledChecks).toHaveBeenCalled();
    });

    it('should run queue-cleanup', async () => {
      const service = SchedulerService.getInstance();
      await service.runTaskManually('queue-cleanup');

      expect(queueService.cleanQueue).toHaveBeenCalled();
    });

    it('should run performance-optimization', async () => {
      const service = SchedulerService.getInstance();
      await service.runTaskManually('performance-optimization');

      expect(performanceService.refreshMaterializedView).toHaveBeenCalled();
    });

    it('should run audit-retention', async () => {
      prismaMock.auditLog.deleteMany.mockResolvedValue({ count: 5 });

      const service = SchedulerService.getInstance();
      await service.runTaskManually('audit-retention');

      expect(prismaMock.auditLog.deleteMany).toHaveBeenCalled();
    });

    it('should throw error for unknown task', async () => {
      const service = SchedulerService.getInstance();

      await expect(service.runTaskManually('unknown-task')).rejects.toThrow(
        'Tarea desconocida: unknown-task'
      );
    });
  });
});




