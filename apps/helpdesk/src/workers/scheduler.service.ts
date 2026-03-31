import { Queue } from 'bullmq';
import cron, { type ScheduledTask } from 'node-cron';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import autoCloseWorker from './auto-close.worker';

interface ScheduledJob {
  name: string;
  schedule: string;
  task: ScheduledTask | null;
}

class SchedulerService {
  private autoCloseQueue: Queue | null = null;
  private scheduledJobs: ScheduledJob[] = [];
  private isRunning = false;

  private getConnection() {
    const env = getEnvironment();
    const redisUrl = env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;
    return {
      url: redisUrl,
      maxRetriesPerRequest: 3,
    };
  }

  /**
   * Initialize the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      AppLogger.warn('Scheduler already running');
      return;
    }

    // Start the auto-close worker first
    await autoCloseWorker.start();

    // Create the queue
    this.autoCloseQueue = new Queue('auto-close', {
      connection: this.getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    });

    // Schedule auto-close check every hour
    const autoCloseJob = cron.schedule('0 * * * *', async () => {
      await this.triggerAutoCloseCheck();
    }, {
      timezone: 'America/Argentina/Buenos_Aires',
    });

    this.scheduledJobs.push({
      name: 'auto-close-check',
      schedule: '0 * * * *',
      task: autoCloseJob,
    });

    this.isRunning = true;
    AppLogger.info('⏰ Scheduler started');
    AppLogger.info('   📋 Auto-close check: every hour (0 * * * *)');
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    // Stop all scheduled jobs
    for (const job of this.scheduledJobs) {
      if (job.task) {
        job.task.stop();
        AppLogger.debug(`Scheduled job ${job.name} stopped`);
      }
    }
    this.scheduledJobs = [];

    // Close the queue
    if (this.autoCloseQueue) {
      await this.autoCloseQueue.close();
      this.autoCloseQueue = null;
    }

    // Stop the worker
    await autoCloseWorker.stop();

    this.isRunning = false;
    AppLogger.info('⏰ Scheduler stopped');
  }

  /**
   * Manually trigger an auto-close check (useful for testing)
   */
  async triggerAutoCloseCheck(): Promise<void> {
    if (!this.autoCloseQueue) {
      AppLogger.error('Auto-close queue not initialized');
      return;
    }

    try {
      await this.autoCloseQueue.add('check-auto-close', {
        type: 'check-auto-close',
        timestamp: Date.now(),
      });
      AppLogger.info('📤 Auto-close check job queued');
    } catch (error) {
      AppLogger.error('Failed to queue auto-close job:', error);
    }
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;
