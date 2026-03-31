/**
 * Unit Tests for Worker Scheduler Service
 * 
 * Note: schedulerService is a singleton, so state persists between tests.
 */

// Mock dependencies
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    stop: jest.fn(),
  }),
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
    REDIS_URL: 'redis://localhost:6379',
    AUTO_CLOSE_HOURS: 72,
  }),
}));

jest.mock('../../workers/auto-close.worker', () => ({
  __esModule: true,
  default: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  },
}));

import schedulerService from '../../workers/scheduler.service';

describe('Worker Scheduler Service', () => {
  describe('lifecycle', () => {
    test('should start successfully', async () => {
      await schedulerService.start();
      expect(schedulerService.isActive()).toBe(true);
    });

    test('should trigger auto-close check without error', async () => {
      await schedulerService.start();
      await schedulerService.triggerAutoCloseCheck();
      // Should complete without throwing
      expect(true).toBe(true);
    });

    test('should stop successfully', async () => {
      await schedulerService.stop();
      expect(schedulerService.isActive()).toBe(false);
    });

    test('should be able to restart after stop', async () => {
      await schedulerService.start();
      expect(schedulerService.isActive()).toBe(true);
    });
  });
});
