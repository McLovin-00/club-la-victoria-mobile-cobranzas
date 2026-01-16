import { resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ REDIS_URL: 'redis://localhost:6379' }),
}));

describe('queue.service', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('addDocumentValidation/addDocumentAIValidation add jobs with priority and returns jobId', async () => {
    jest.resetModules();
    const { queueService } = await import('../../src/services/queue.service');
    await queueService.addDocumentValidation({ documentId: 1, filePath: 'b/x', templateName: 'T', entityType: 'DADOR' });
    const id = await queueService.addDocumentAIValidation({ documentId: 2, esRechequeo: true });
    expect(id).toBeDefined();
  });

  it('getQueueStats uses queue arrays and daily counters; returns zeros on error', async () => {
    jest.resetModules();
    const { queueService } = await import('../../src/services/queue.service');
    const stats = await queueService.getQueueStats();
    expect(stats).toEqual(expect.objectContaining({ waiting: expect.any(Number), completedTotal: expect.any(Number) }));

    // force internal error by monkeypatching a method
    (queueService as any).documentValidationQueue.getWaiting = jest.fn(async () => { throw new Error('x'); });
    const out = await queueService.getQueueStats();
    expect(out).toEqual(expect.objectContaining({ waiting: 0, completed: 0 }));
  });

  it('cancelDocumentValidationJobs removes matching jobs', async () => {
    jest.resetModules();
    const { queueService } = await import('../../src/services/queue.service');
    // create a fake job list with remove()
    const job = { id: 'j1', data: { documentId: 9 }, remove: jest.fn(async () => undefined) };
    (queueService as any).documentValidationQueue.getWaiting = jest.fn(async () => [job]);
    (queueService as any).documentValidationQueue.getActive = jest.fn(async () => []);
    (queueService as any).documentValidationQueue.getDelayed = jest.fn(async () => []);
    await queueService.cancelDocumentValidationJobs(9);
    expect(job.remove).toHaveBeenCalled();
  });

  it('cleanQueue and close do not throw (errors are swallowed)', async () => {
    jest.resetModules();
    const { queueService } = await import('../../src/services/queue.service');
    await queueService.cleanQueue();
    await queueService.close();
  });
});


