jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ REDIS_URL: 'redis://mock' }),
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async (key: string) => key.includes('tenant:') ? '1' : null) },
}));

// Capture constructed queues
const queues: any[] = [];
const mkQueue = () => {
  const q: any = {
    add: jest.fn(async () => ({ id: 'job1' })),
    on: jest.fn(),
    close: jest.fn(async () => undefined),
    getWaiting: jest.fn(async () => ([])),
    getActive: jest.fn(async () => ([])),
    getCompleted: jest.fn(async () => ([])),
    getFailed: jest.fn(async () => ([])),
    getDelayed: jest.fn(async () => ([])),
    clean: jest.fn(async () => undefined),
  };
  queues.push(q);
  return q;
};

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mkQueue()),
}));

const redisMock: any = {
  incr: jest.fn(async () => 1),
  expire: jest.fn(async () => 1),
  get: jest.fn(async () => '3'),
  quit: jest.fn(async () => 'OK'),
};
jest.mock('ioredis', () => ({
  Redis: jest.fn(() => redisMock),
}));

describe('queueService (more coverage)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    queues.length = 0;
  });

  it('addDocumentValidation and addDocumentAIValidation add jobs', async () => {
    const { queueService } = await import('../../src/services/queue.service');
    await queueService.addDocumentValidation({ documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'CHOFER' });
    await expect(queueService.addDocumentAIValidation({ documentId: 2, esRechequeo: true })).resolves.toBe('job1');
  });

  it('addMissingCheckForEquipo reads config and enqueues with delay', async () => {
    const { queueService } = await import('../../src/services/queue.service');
    await queueService.addMissingCheckForEquipo(1, 99);
    // complianceQueue is the 3rd constructed queue
    expect(queues[2].add).toHaveBeenCalledWith('verify-missing-equipo', expect.any(Object), expect.objectContaining({ delay: 60 * 1000 }));
  });

  it('getQueueStats uses daily counters and returns counts', async () => {
    const { queueService } = await import('../../src/services/queue.service');
    const out = await queueService.getQueueStats();
    expect(out.completed).toBe(3);
    expect(out.failed).toBe(3);
  });

  it('cancelDocumentValidationJobs removes matching jobs', async () => {
    const { queueService } = await import('../../src/services/queue.service');
    const jobMatch = { id: '1', data: { documentId: 7 }, remove: jest.fn(async () => undefined) };
    const jobOther = { id: '2', data: { documentId: 8 }, remove: jest.fn(async () => undefined) };
    queues[0].getWaiting.mockResolvedValueOnce([jobMatch]);
    queues[0].getActive.mockResolvedValueOnce([jobOther]);
    queues[0].getDelayed.mockResolvedValueOnce([]);
    await queueService.cancelDocumentValidationJobs(7);
    expect(jobMatch.remove).toHaveBeenCalled();
    expect(jobOther.remove).not.toHaveBeenCalled();
  });

  it('cleanQueue and close handle underlying calls', async () => {
    const { queueService } = await import('../../src/services/queue.service');
    await queueService.cleanQueue();
    await queueService.close();
    expect(redisMock.quit).toHaveBeenCalled();
  });
});


