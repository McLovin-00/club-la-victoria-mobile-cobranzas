/**
 * Unit Tests for Auto-Close Worker
 * 
 * Note: autoCloseWorker is a singleton, so state persists between tests.
 * We access the private processJob method directly to test it.
 */

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
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

const mockGetForAutoClose = jest.fn().mockResolvedValue([]);
const mockAutoClose = jest.fn().mockResolvedValue(undefined);

jest.mock('../../services/ticket.service', () => ({
  __esModule: true,
  default: {
    getForAutoClose: mockGetForAutoClose,
    autoClose: mockAutoClose,
  },
}));

import autoCloseWorker from '../../workers/auto-close.worker';
import { AppLogger } from '../../config/logger';

describe('Auto-Close Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetForAutoClose.mockResolvedValue([]);
    mockAutoClose.mockResolvedValue(undefined);
  });

  describe('lifecycle', () => {
    test('should start successfully', async () => {
      await autoCloseWorker.start();
      expect(autoCloseWorker.isActive()).toBe(true);
    });

    test('should warn if already running', async () => {
      await autoCloseWorker.start();
      expect(AppLogger.warn).toHaveBeenCalledWith('Auto-close worker already running');
    });

    test('should stop successfully', async () => {
      await autoCloseWorker.stop();
      expect(autoCloseWorker.isActive()).toBe(false);
    });

    test('should be able to restart after stop', async () => {
      await autoCloseWorker.start();
      expect(autoCloseWorker.isActive()).toBe(true);
    });
  });

  describe('processJob', () => {
    // Access private method via bracket notation
    const getProcessJob = () => (autoCloseWorker as any).processJob;

    test('should warn on unknown job type', async () => {
      const processJob = getProcessJob();
      const job = { data: { type: 'unknown-type', timestamp: Date.now() } };
      
      await processJob(job);
      
      expect(AppLogger.warn).toHaveBeenCalledWith('Unknown job type: unknown-type');
    });

    test('should log and return early when no tickets to close', async () => {
      mockGetForAutoClose.mockResolvedValueOnce([]);
      
      const processJob = getProcessJob();
      const timestamp = Date.now();
      const job = { data: { type: 'check-auto-close', timestamp } };
      
      await processJob(job);
      
      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Processing auto-close check')
      );
      expect(AppLogger.debug).toHaveBeenCalledWith('No tickets ready for auto-close');
    });

    test('should auto-close tickets successfully', async () => {
      const mockTickets = [
        { id: 'ticket-1', number: 1 },
        { id: 'ticket-2', number: 2 },
      ];
      mockGetForAutoClose.mockResolvedValueOnce(mockTickets);
      
      const processJob = getProcessJob();
      const job = { data: { type: 'check-auto-close', timestamp: Date.now() } };
      
      await processJob(job);
      
      expect(mockGetForAutoClose).toHaveBeenCalledWith(72);
      expect(mockAutoClose).toHaveBeenCalledTimes(2);
      expect(AppLogger.info).toHaveBeenCalledWith('📋 Found 2 tickets ready for auto-close');
      expect(AppLogger.info).toHaveBeenCalledWith(
        '🎯 Auto-close batch completed: 2 success, 0 errors'
      );
    });

    test('should handle errors during auto-close', async () => {
      const mockTickets = [
        { id: 'ticket-1', number: 1 },
        { id: 'ticket-2', number: 2 },
      ];
      mockGetForAutoClose.mockResolvedValueOnce(mockTickets);
      mockAutoClose
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('DB error'));
      
      const processJob = getProcessJob();
      const job = { data: { type: 'check-auto-close', timestamp: Date.now() } };
      
      await processJob(job);
      
      expect(AppLogger.error).toHaveBeenCalledWith(
        '❌ Failed to auto-close ticket #2:',
        expect.any(Error)
      );
      expect(AppLogger.info).toHaveBeenCalledWith(
        '🎯 Auto-close batch completed: 1 success, 1 errors'
      );
    });

    test('should throw error when getForAutoClose fails', async () => {
      mockGetForAutoClose.mockRejectedValueOnce(new Error('DB connection failed'));
      
      const processJob = getProcessJob();
      const job = { data: { type: 'check-auto-close', timestamp: Date.now() } };
      
      await expect(processJob(job)).rejects.toThrow('DB connection failed');
      expect(AppLogger.error).toHaveBeenCalledWith('Error in auto-close job:', expect.any(Error));
    });

    test('should log success for each ticket', async () => {
      const mockTickets = [{ id: 'ticket-1', number: 42 }];
      mockGetForAutoClose.mockResolvedValueOnce(mockTickets);
      
      const processJob = getProcessJob();
      const job = { data: { type: 'check-auto-close', timestamp: Date.now() } };
      
      await processJob(job);
      
      expect(AppLogger.info).toHaveBeenCalledWith('✅ Auto-closed ticket #42');
    });
  });
});
