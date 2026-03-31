import { Worker, Job } from 'bullmq';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import ticketService from '../services/ticket.service';

interface AutoCloseJobData {
  type: 'check-auto-close';
  timestamp: number;
}

class AutoCloseWorker {
  private worker: Worker | null = null;
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
   * Processor function for auto-close jobs
   */
  private processJob = async (job: Job<AutoCloseJobData>): Promise<void> => {
    const { type, timestamp } = job.data;

    if (type !== 'check-auto-close') {
      AppLogger.warn(`Unknown job type: ${type}`);
      return;
    }

    AppLogger.info(`🔄 Processing auto-close check at ${new Date(timestamp).toISOString()}`);

    // Get hours threshold from environment (default 72)
    const env = getEnvironment();
    const hoursThreshold = env.AUTO_CLOSE_HOURS || 72;

    try {
      // Get tickets ready for auto-close
      const tickets = await ticketService.getForAutoClose(hoursThreshold);

      if (tickets.length === 0) {
        AppLogger.debug('No tickets ready for auto-close');
        return;
      }

      AppLogger.info(`📋 Found ${tickets.length} tickets ready for auto-close`);

      // Process each ticket
      let successCount = 0;
      let errorCount = 0;

      for (const ticket of tickets) {
        try {
          await ticketService.autoClose(ticket.id);
          successCount++;
          AppLogger.info(`✅ Auto-closed ticket #${ticket.number}`);
        } catch (error) {
          errorCount++;
          AppLogger.error(`❌ Failed to auto-close ticket #${ticket.number}:`, error);
        }
      }

      AppLogger.info(
        `🎯 Auto-close batch completed: ${successCount} success, ${errorCount} errors`
      );
    } catch (error) {
      AppLogger.error('Error in auto-close job:', error);
      throw error; // Re-throw to mark job as failed
    }
  };

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      AppLogger.warn('Auto-close worker already running');
      return;
    }

    this.worker = new Worker<AutoCloseJobData>(
      'auto-close',
      this.processJob,
      {
        connection: this.getConnection(),
        concurrency: 1, // Only one job at a time
        limiter: {
          max: 1,
          duration: 60000, // Max 1 job per minute
        },
      }
    );

    this.worker.on('completed', (job: Job) => {
      AppLogger.debug(`Auto-close job ${job.id} completed`);
    });

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      AppLogger.error(`Auto-close job ${job?.id} failed:`, error);
    });

    this.worker.on('error', (error: Error) => {
      AppLogger.error('Auto-close worker error:', error);
    });

    this.isRunning = true;
    AppLogger.info('🔄 Auto-close worker started');
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.worker || !this.isRunning) {
      return;
    }

    await this.worker.close();
    this.worker = null;
    this.isRunning = false;
    AppLogger.info('🛑 Auto-close worker stopped');
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

export const autoCloseWorker = new AutoCloseWorker();
export default autoCloseWorker;
