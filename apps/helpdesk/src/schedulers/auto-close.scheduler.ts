import { Queue } from 'bullmq';
import * as cron from 'node-cron';
import { AppLogger } from '../config/logger';
import { getEnvironment, type Environment } from '../config/environment';
import { autoCloseWorker } from '../workers/auto-close.worker';

interface SchedulerConfig {
  autoCloseIntervalMinutes?: number; // In minutes, default: 60 (1 hour)
}

class SchedulerService {
  private autoCloseQueue: Queue | null = null;
  private autoCloseJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private env: Environment | null = null;

  /**
   * Start the scheduler service
   */
  async initialize(config?: SchedulerConfig): Promise<void> {
    this.env = getEnvironment();
    const intervalMinutes = config?.autoCloseIntervalMinutes ?? 60; // Default: 60 minutes (1 hour)

    // Initialize queue
    this.autoCloseQueue = new Queue('auto-close', {
      connection: {
        host: this.env.REDIS_HOST,
        port: this.env.REDIS_PORT,
        maxRetriesPerRequest: 3,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    AppLogger.info('📅 Initializing scheduler service...');

    // Start the auto-close worker
    await autoCloseWorker.start();

    // Schedule auto-close job (cron pattern: every N minutes)
    const cronPattern = `*/${intervalMinutes} * * * * *`;
    
    this.autoCloseJob = cron.schedule(cronPattern, async () => {
      await this.runAutoCloseCheck();
    });

    this.isRunning = true;
    AppLogger.info(`✅ Scheduler service initialized (auto-close every ${intervalMinutes} min)`);
  }

  /**
   * Run a single auto-close check
   */
  async runAutoCloseCheck(): Promise<void> {
    if (!this.autoCloseQueue) {
      AppLogger.warn('Auto-close queue not initialized');
      return;
    }

    try {
      await this.autoCloseQueue.add('check-auto-close', {
        type: 'check-auto-close',
        timestamp: Date.now(),
      });
      AppLogger.debug('📤 Auto-close job queued');
    } catch (error) {
      AppLogger.error('Failed to queue auto-close job:', error);
    }
  }

  /**
   * Close the scheduler service
   */
  async close(): Promise<void> {
    if (this.autoCloseJob) {
      this.autoCloseJob.stop();
      this.autoCloseJob = null;
    }

    await autoCloseWorker.stop();

    if (this.autoCloseQueue) {
      await this.autoCloseQueue.close();
      this.autoCloseQueue = null;
    }

    this.isRunning = false;
    AppLogger.info('🛑 Scheduler service closed');
  }

}

export const schedulerService = new SchedulerService();
