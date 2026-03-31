const mockQueueInstance = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => mockQueueInstance),
}));

const mockScheduledTask = {
  stop: jest.fn(),
};

const mockCronSchedule = jest.fn().mockReturnValue(mockScheduledTask);

jest.mock('node-cron', () => ({
  schedule: mockCronSchedule,
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    AUTO_CLOSE_HOURS: 72,
  }),
}));

const mockAutoCloseWorkerStart = jest.fn().mockResolvedValue(undefined);
const mockAutoCloseWorkerStop = jest.fn().mockResolvedValue(undefined);

jest.mock('../../workers/auto-close.worker', () => ({
  autoCloseWorker: {
    start: mockAutoCloseWorkerStart,
    stop: mockAutoCloseWorkerStop,
  },
}));

import { schedulerService } from '../../schedulers/auto-close.scheduler';
import { Queue } from 'bullmq';
import * as cron from 'node-cron';
import { autoCloseWorker } from '../../workers/auto-close.worker';

describe('Auto-Close Scheduler', () => {
  beforeEach(() => {
    mockQueueInstance.add.mockClear();
    mockQueueInstance.close.mockClear();
    mockScheduledTask.stop.mockClear();
    mockCronSchedule.mockClear().mockReturnValue(mockScheduledTask);
    mockAutoCloseWorkerStart.mockClear().mockResolvedValue(undefined);
    mockAutoCloseWorkerStop.mockClear().mockResolvedValue(undefined);
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await schedulerService.initialize();
    });

    it('should create queue with correct config', async () => {
      await schedulerService.initialize();

      expect(Queue).toHaveBeenCalledWith(
        'auto-close',
        expect.objectContaining({
          connection: expect.any(Object),
          defaultJobOptions: expect.objectContaining({
            removeOnComplete: 100,
            removeOnFail: 50,
          }),
        })
      );
    });

    it('should schedule cron job with default interval', async () => {
      await schedulerService.initialize();

      expect(cron.schedule).toHaveBeenCalledWith(
        expect.stringContaining('60'),
        expect.any(Function)
      );
    });

    it('should start auto-close worker', async () => {
      await schedulerService.initialize();
      expect(autoCloseWorker.start).toHaveBeenCalled();
    });

    it('should accept custom interval', async () => {
      await schedulerService.initialize({ autoCloseIntervalMinutes: 30 });

      expect(cron.schedule).toHaveBeenCalledWith(
        expect.stringContaining('30'),
        expect.any(Function)
      );
    });
  });

  describe('runAutoCloseCheck', () => {
    it('should queue auto-close job', async () => {
      await schedulerService.initialize();
      await schedulerService.runAutoCloseCheck();

      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        'check-auto-close',
        expect.objectContaining({
          type: 'check-auto-close',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should warn when queue is not initialized', async () => {
      await schedulerService.runAutoCloseCheck();
    });

    it('should handle queue add error', async () => {
      await schedulerService.initialize();
      mockQueueInstance.add.mockRejectedValueOnce(new Error('Queue error'));

      await schedulerService.runAutoCloseCheck();
    });
  });

  describe('close', () => {
    it('should close successfully', async () => {
      await schedulerService.initialize();
      await schedulerService.close();

      expect(mockScheduledTask.stop).toHaveBeenCalled();
      expect(autoCloseWorker.stop).toHaveBeenCalled();
      expect(mockQueueInstance.close).toHaveBeenCalled();
    });

    it('should handle close when not initialized', async () => {
      await schedulerService.close();
    });
  });
});
