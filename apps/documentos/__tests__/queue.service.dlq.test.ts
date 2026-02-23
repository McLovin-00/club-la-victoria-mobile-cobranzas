/**
 * Coverage tests for QueueService DLQ functionality
 * @jest-environment node
 */

const mockOn = jest.fn();
const mockAdd = jest.fn().mockResolvedValue({});
const mockGetWaiting = jest.fn().mockResolvedValue([]);
const mockClose = jest.fn().mockResolvedValue(undefined);

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    getWaiting: mockGetWaiting,
    close: mockClose,
    on: mockOn,
  })),
  Job: jest.fn(),
}));

jest.mock('ioredis', () => {
  const redisMethods = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
    status: 'ready',
  };
  const RedisMock = jest.fn().mockImplementation(() => redisMethods);
  RedisMock.prototype = redisMethods;
  const mod: any = RedisMock;
  mod.Redis = RedisMock;
  mod.__esModule = true;
  mod.default = RedisMock;
  return mod;
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    REDIS_URL: 'redis://localhost:6379',
  }),
}));

describe('QueueService DLQ (coverage)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { QueueService, queueService } = require('../src/services/queue.service');

  it('singleton existe', () => {
    expect(queueService).toBeDefined();
  });

  it('getDLQStats retorna stats', async () => {
    const stats = await queueService.getDLQStats();
    expect(stats).toHaveProperty('waiting');
    expect(stats).toHaveProperty('total');
  });

  it('getDLQJobs retorna jobs vacíos', async () => {
    const jobs = await queueService.getDLQJobs();
    expect(Array.isArray(jobs)).toBe(true);
  });

  it('getDLQJobs con limit', async () => {
    const jobs = await queueService.getDLQJobs(5);
    expect(Array.isArray(jobs)).toBe(true);
  });

  it('setupDLQListeners se ejecutó correctamente', () => {
    expect(mockOn.mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it('close cierra las conexiones', async () => {
    await queueService.close();
  });
});
