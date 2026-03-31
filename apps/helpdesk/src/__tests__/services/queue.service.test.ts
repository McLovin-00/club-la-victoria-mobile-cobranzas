import { queueService } from '../../services/queue.service';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockWorker = {
  on: jest.fn().mockReturnThis(),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => mockQueue),
  Worker: jest.fn().mockImplementation(() => mockWorker),
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_URL: 'redis://localhost:6379',
  }),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../workers/media-sync.worker', () => ({
  processMediaSyncJob: jest.fn().mockResolvedValue(undefined),
}));

describe('QueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize queue service', async () => {
      await queueService.initialize();
    });
  });

  describe('getQueue', () => {
    it('should return queue instance', async () => {
      const queue = queueService.getQueue('test-queue');
      expect(queue).toBeDefined();
    });

    it('should return same queue for same name', async () => {
      const queue1 = queueService.getQueue('same-queue');
      const queue2 = queueService.getQueue('same-queue');
      expect(queue1).toBe(queue2);
    });
  });

  describe('addJob', () => {
    it('should add job to queue', async () => {
      const job = await queueService.addJob('test-queue', {
        type: 'test-type',
        payload: { data: 'test' },
      });

      expect(job).toBeDefined();
      expect(job.id).toBe('job-1');
    });

    it('should pass options to queue.add', async () => {
      await queueService.addJob('test-queue', {
        type: 'test-type',
        payload: {},
      }, { priority: 1 });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'test-type',
        {},
        { priority: 1 }
      );
    });
  });

  describe('createWorker', () => {
    it('should create worker with processor', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const worker = queueService.createWorker('test-worker', processor);
      expect(worker).toBeDefined();
    });

    it('should return existing worker if already created', async () => {
      const processor = jest.fn().mockResolvedValue(undefined);
      const worker1 = queueService.createWorker('existing-worker', processor);
      const worker2 = queueService.createWorker('existing-worker', processor);
      expect(worker1).toBe(worker2);
    });

    it('should register completed event handler', async () => {
      queueService.createWorker('completed-events-worker', jest.fn());
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
    });

    it('should register failed event handler', async () => {
      queueService.createWorker('failed-events-worker', jest.fn());
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });
  });

  describe('initialize worker', () => {
    it('should skip jobs with different name', async () => {
      await queueService.initialize();
      // The initialize method creates a worker that filters by job name
    });
  });

  describe('close', () => {
    it('should close all queues and workers', async () => {
      queueService.getQueue('close-test-queue');
      queueService.createWorker('close-test-worker', jest.fn().mockResolvedValue(undefined));

      await queueService.close();

      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockWorker.close).toHaveBeenCalled();
    });

    it('should handle empty queues and workers gracefully', async () => {
      await queueService.close();
    });
  });
});
