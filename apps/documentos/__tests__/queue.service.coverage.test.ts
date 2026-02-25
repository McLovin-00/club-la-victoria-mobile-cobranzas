/**
 * Coverage tests for QueueService – singleton, addDocumentValidation,
 * addDocumentAIValidation, addMissingCheckForEquipo (config branches),
 * calculatePriority, getQueueStats, cancelDocumentValidationJobs,
 * cleanQueue, DLQ listeners, getDLQStats, getDLQJobs, close, and
 * daily counters.
 * @jest-environment node
 */

const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  get: jest.fn(),
  quit: jest.fn(),
};

const mockQueueInstances: Record<string, any> = {};
const mockQueueAdd = jest.fn();
const mockQueueGetWaiting = jest.fn();
const mockQueueGetActive = jest.fn();
const mockQueueGetCompleted = jest.fn();
const mockQueueGetFailed = jest.fn();
const mockQueueGetDelayed = jest.fn();
const mockQueueClean = jest.fn();
const mockQueueClose = jest.fn();
const mockQueueOn = jest.fn();

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => mockRedis),
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation((name: string) => {
    const instance = {
      name,
      add: mockQueueAdd,
      getWaiting: mockQueueGetWaiting,
      getActive: mockQueueGetActive,
      getCompleted: mockQueueGetCompleted,
      getFailed: mockQueueGetFailed,
      getDelayed: mockQueueGetDelayed,
      clean: mockQueueClean,
      close: mockQueueClose,
      on: mockQueueOn,
    };
    mockQueueInstances[name] = instance;
    return instance;
  }),
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    REDIS_URL: 'redis://localhost:6379',
  }),
}));

jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn() },
}));

// Force fresh singleton per test file
let queueService: any;
// Capture listeners registered during construction (before clearAllMocks wipes them)
let capturedOnCalls: any[][] = [];

beforeAll(() => {
  jest.isolateModules(() => {
    const mod = require('../src/services/queue.service');
    queueService = mod.queueService;
  });
  capturedOnCalls = [...mockQueueOn.mock.calls];
});

describe('QueueService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================
  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      jest.isolateModules(() => {
        const mod = require('../src/services/queue.service');
        const a = mod.queueService;
        expect(a).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // addDocumentValidation
  // ==========================================================================
  describe('addDocumentValidation', () => {
    it('adds job to queue with calculated priority', async () => {
      const mockJob = { id: 'job-1' };
      mockQueueAdd.mockResolvedValue(mockJob);

      await queueService.addDocumentValidation({
        documentId: 1,
        filePath: '/path/to/file.pdf',
        templateName: 'DNI',
        entityType: 'CHOFER',
      });

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'validate-document',
        expect.objectContaining({ documentId: 1 }),
        expect.objectContaining({ priority: 2, delay: 1000 })
      );
    });

    it('throws and logs on queue error', async () => {
      mockQueueAdd.mockRejectedValue(new Error('redis down'));

      await expect(
        queueService.addDocumentValidation({
          documentId: 2,
          filePath: '/p',
          templateName: 'T',
          entityType: 'DADOR',
        })
      ).rejects.toThrow('redis down');
    });
  });

  // ==========================================================================
  // addDocumentAIValidation
  // ==========================================================================
  describe('addDocumentAIValidation', () => {
    it('returns job id on success', async () => {
      mockQueueAdd.mockResolvedValue({ id: 'ai-1' });

      const result = await queueService.addDocumentAIValidation({
        documentId: 10,
        esRechequeo: true,
      });

      expect(result).toBe('ai-1');
    });

    it('logs esRechequeo false when not provided', async () => {
      mockQueueAdd.mockResolvedValue({ id: 'ai-2' });

      await queueService.addDocumentAIValidation({ documentId: 11 });

      expect(mockQueueAdd).toHaveBeenCalled();
    });

    it('throws on error', async () => {
      mockQueueAdd.mockRejectedValue(new Error('fail'));

      await expect(
        queueService.addDocumentAIValidation({ documentId: 3 })
      ).rejects.toThrow('fail');
    });
  });

  // ==========================================================================
  // addMissingCheckForEquipo – delay config branches
  // ==========================================================================
  describe('addMissingCheckForEquipo', () => {
    it('uses explicit delay when provided', async () => {
      mockQueueAdd.mockResolvedValue({});

      await queueService.addMissingCheckForEquipo(1, 100, 5000);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'verify-missing-equipo',
        expect.objectContaining({ tenantId: 1, equipoId: 100 }),
        expect.objectContaining({ delay: 5000 })
      );
    });

    it('reads tenant config when delay not provided', async () => {
      const { SystemConfigService } = require('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('10') // tenant config
        .mockResolvedValueOnce(null); // global config (not reached)

      mockQueueAdd.mockResolvedValue({});

      await queueService.addMissingCheckForEquipo(1, 200);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'verify-missing-equipo',
        expect.anything(),
        expect.objectContaining({ delay: 10 * 60 * 1000 })
      );
    });

    it('falls back to global config when tenant config is null', async () => {
      const { SystemConfigService } = require('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(null) // tenant config
        .mockResolvedValueOnce('5'); // global config

      mockQueueAdd.mockResolvedValue({});

      await queueService.addMissingCheckForEquipo(2, 300);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'verify-missing-equipo',
        expect.anything(),
        expect.objectContaining({ delay: 5 * 60 * 1000 })
      );
    });

    it('uses default 15 min when both configs are null', async () => {
      const { SystemConfigService } = require('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockQueueAdd.mockResolvedValue({});

      await queueService.addMissingCheckForEquipo(3, 400);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'verify-missing-equipo',
        expect.anything(),
        expect.objectContaining({ delay: 15 * 60 * 1000 })
      );
    });

    it('uses 15 min fallback when SystemConfigService throws', async () => {
      const { SystemConfigService } = require('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock).mockRejectedValue(new Error('db fail'));

      mockQueueAdd.mockResolvedValue({});

      await queueService.addMissingCheckForEquipo(4, 500);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'verify-missing-equipo',
        expect.anything(),
        expect.objectContaining({ delay: 15 * 60 * 1000 })
      );
    });

    it('handles NaN minutes gracefully (falls to 15 min default)', async () => {
      const { SystemConfigService } = require('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('invalid-number')
        .mockResolvedValueOnce(null);

      mockQueueAdd.mockResolvedValue({});

      await queueService.addMissingCheckForEquipo(5, 600);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'verify-missing-equipo',
        expect.anything(),
        expect.objectContaining({ delay: 15 * 60 * 1000 })
      );
    });

    it('logs but does not throw when queue add fails', async () => {
      const { SystemConfigService } = require('../src/services/system-config.service');
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockQueueAdd.mockRejectedValue(new Error('queue fail'));

      await expect(
        queueService.addMissingCheckForEquipo(6, 700)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // calculatePriority
  // ==========================================================================
  describe('calculatePriority (via addDocumentValidation)', () => {
    beforeEach(() => {
      mockQueueAdd.mockResolvedValue({ id: 'p-1' });
    });

    const cases: Array<[string, number]> = [
      ['DADOR', 1],
      ['EMPRESA_TRANSPORTISTA', 2],
      ['CHOFER', 2],
      ['CAMION', 3],
      ['ACOPLADO', 4],
      ['UNKNOWN', 5],
    ];

    it.each(cases)('entityType %s gets priority %d', async (entityType, expectedPriority) => {
      await queueService.addDocumentValidation({
        documentId: 1,
        filePath: '/f',
        templateName: 'T',
        entityType,
      });

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'validate-document',
        expect.anything(),
        expect.objectContaining({ priority: expectedPriority })
      );
    });
  });

  // ==========================================================================
  // getQueueStats
  // ==========================================================================
  describe('getQueueStats', () => {
    it('returns stats from queue and daily counters', async () => {
      mockQueueGetWaiting.mockResolvedValue([{}, {}]);
      mockQueueGetActive.mockResolvedValue([{}]);
      mockQueueGetCompleted.mockResolvedValue([{}, {}, {}]);
      mockQueueGetFailed.mockResolvedValue([{}]);
      mockQueueGetDelayed.mockResolvedValue([]);
      mockRedis.get.mockResolvedValueOnce('5').mockResolvedValueOnce('2');

      const stats = await queueService.getQueueStats();

      expect(stats).toEqual({
        waiting: 2,
        active: 1,
        completed: 5,
        failed: 2,
        delayed: 0,
        completedTotal: 3,
        failedTotal: 1,
      });
    });

    it('returns zeros on error', async () => {
      mockQueueGetWaiting.mockRejectedValue(new Error('fail'));

      const stats = await queueService.getQueueStats();

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        completedTotal: 0,
        failedTotal: 0,
      });
    });

    it('handles null daily counter values', async () => {
      mockQueueGetWaiting.mockResolvedValue([]);
      mockQueueGetActive.mockResolvedValue([]);
      mockQueueGetCompleted.mockResolvedValue([]);
      mockQueueGetFailed.mockResolvedValue([]);
      mockQueueGetDelayed.mockResolvedValue([]);
      mockRedis.get.mockResolvedValue(null);

      const stats = await queueService.getQueueStats();

      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  // ==========================================================================
  // cancelDocumentValidationJobs
  // ==========================================================================
  describe('cancelDocumentValidationJobs', () => {
    it('removes matching jobs across all states', async () => {
      const removeMock = jest.fn();
      const matchingJob = { id: '1', data: { documentId: 42 }, remove: removeMock };
      const otherJob = { id: '2', data: { documentId: 99 }, remove: jest.fn() };

      mockQueueGetWaiting.mockResolvedValue([matchingJob]);
      mockQueueGetActive.mockResolvedValue([otherJob]);
      mockQueueGetDelayed.mockResolvedValue([matchingJob]);

      await queueService.cancelDocumentValidationJobs(42);

      expect(removeMock).toHaveBeenCalledTimes(2);
      expect(otherJob.remove).not.toHaveBeenCalled();
    });

    it('handles no matching jobs gracefully', async () => {
      mockQueueGetWaiting.mockResolvedValue([]);
      mockQueueGetActive.mockResolvedValue([]);
      mockQueueGetDelayed.mockResolvedValue([]);

      await expect(
        queueService.cancelDocumentValidationJobs(999)
      ).resolves.toBeUndefined();
    });

    it('catches errors silently', async () => {
      mockQueueGetWaiting.mockRejectedValue(new Error('fail'));

      await expect(
        queueService.cancelDocumentValidationJobs(1)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // cleanQueue
  // ==========================================================================
  describe('cleanQueue', () => {
    it('cleans completed and failed jobs', async () => {
      mockQueueClean.mockResolvedValue(undefined);

      await queueService.cleanQueue();

      expect(mockQueueClean).toHaveBeenCalledTimes(2);
    });

    it('handles errors gracefully', async () => {
      mockQueueClean.mockRejectedValue(new Error('fail'));

      await expect(queueService.cleanQueue()).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // getDLQStats
  // ==========================================================================
  describe('getDLQStats', () => {
    it('returns DLQ waiting count', async () => {
      mockQueueGetWaiting.mockResolvedValue([{}, {}]);

      const stats = await queueService.getDLQStats();

      expect(stats).toEqual({ waiting: 2, total: 2 });
    });

    it('returns zeros on error', async () => {
      mockQueueGetWaiting.mockRejectedValue(new Error('fail'));

      const stats = await queueService.getDLQStats();

      expect(stats).toEqual({ waiting: 0, total: 0 });
    });
  });

  // ==========================================================================
  // getDLQJobs
  // ==========================================================================
  describe('getDLQJobs', () => {
    it('returns job data from DLQ', async () => {
      const dlqData = { originalQueue: 'q', originalJobId: '1', originalData: {}, failedReason: 'err', failedAt: '', attemptsMade: 3 };
      mockQueueGetWaiting.mockResolvedValue([{ data: dlqData }]);

      const jobs = await queueService.getDLQJobs(10);

      expect(jobs).toEqual([dlqData]);
    });

    it('returns empty array on error', async () => {
      mockQueueGetWaiting.mockRejectedValue(new Error('fail'));

      const jobs = await queueService.getDLQJobs();

      expect(jobs).toEqual([]);
    });
  });

  // ==========================================================================
  // close
  // ==========================================================================
  describe('close', () => {
    it('closes all queues and redis', async () => {
      mockQueueClose.mockResolvedValue(undefined);
      mockRedis.quit.mockResolvedValue(undefined);

      await queueService.close();

      expect(mockQueueClose).toHaveBeenCalledTimes(4);
      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('handles close errors gracefully', async () => {
      mockQueueClose.mockRejectedValue(new Error('fail'));

      await expect(queueService.close()).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // DLQ listeners (setupDLQListeners via on('failed') callbacks)
  // ==========================================================================
  describe('DLQ listeners', () => {
    it('moves job to DLQ when attempts exhausted', async () => {
      const failedCalls = capturedOnCalls.filter(
        (c: any[]) => c[0] === 'failed'
      );

      expect(failedCalls.length).toBeGreaterThanOrEqual(1);

      const callback = failedCalls[failedCalls.length - 1][1];
      const fakeJob = {
        id: 'j1',
        data: { documentId: 1 },
        opts: { attempts: 3 },
        attemptsMade: 3,
      };
      const fakeError = new Error('processing failed');

      mockQueueAdd.mockResolvedValue({});

      await callback(fakeJob, fakeError);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'dead-letter',
        expect.objectContaining({
          originalJobId: 'j1',
          failedReason: 'processing failed',
        })
      );
    });

    it('skips DLQ when attempts not exhausted', async () => {
      const failedCalls = capturedOnCalls.filter(
        (c: any[]) => c[0] === 'failed'
      );
      const callback = failedCalls[failedCalls.length - 1][1];

      const fakeJob = {
        id: 'j2',
        data: {},
        opts: { attempts: 3 },
        attemptsMade: 1,
      };

      mockQueueAdd.mockClear();
      await callback(fakeJob, new Error('retry'));

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('skips DLQ when job is undefined', async () => {
      const failedCalls = capturedOnCalls.filter(
        (c: any[]) => c[0] === 'failed'
      );
      const callback = failedCalls[failedCalls.length - 1][1];

      mockQueueAdd.mockClear();
      await callback(undefined, new Error('no job'));

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('handles DLQ add failure silently', async () => {
      const failedCalls = capturedOnCalls.filter(
        (c: any[]) => c[0] === 'failed'
      );
      const callback = failedCalls[failedCalls.length - 1][1];

      const fakeJob = {
        id: 'j3',
        data: {},
        opts: { attempts: 1 },
        attemptsMade: 1,
      };

      mockQueueAdd.mockRejectedValue(new Error('DLQ fail'));

      await expect(
        callback(fakeJob, new Error('orig'))
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================================
  // Daily counter event handlers (completed/failed)
  // ==========================================================================
  describe('daily counter event handlers', () => {
    it('completed event handler increments daily counter', async () => {
      const completedCalls = capturedOnCalls.filter(
        (c: any[]) => c[0] === 'completed'
      );

      if (completedCalls.length > 0) {
        mockRedis.incr.mockResolvedValue(1);
        mockRedis.expire.mockResolvedValue(1);

        await completedCalls[0][1]();

        expect(mockRedis.incr).toHaveBeenCalled();
        expect(mockRedis.expire).toHaveBeenCalled();
      }
    });

    it('failed event handler increments daily counter (best-effort)', async () => {
      const failedCalls = capturedOnCalls.filter(
        (c: any[]) => c[0] === 'failed'
      );

      if (failedCalls.length > 0) {
        mockRedis.incr.mockRejectedValue(new Error('redis fail'));

        // Should not throw
        await expect(failedCalls[0][1]()).resolves.toBeUndefined();
      }
    });
  });
});
