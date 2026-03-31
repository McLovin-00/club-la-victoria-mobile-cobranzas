import { Queue, Worker, Job } from 'bullmq';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';

interface JobData {
  type: string;
  payload: unknown;
}

class QueueService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  private getConnection() {
    const env = getEnvironment();
    const redisUrl = env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;
    return {
      connection: {
        url: redisUrl,
        maxRetriesPerRequest: 3,
      },
    };
  }

  async initialize(): Promise<void> {
    const { processMediaSyncJob } = await import('../workers/media-sync.worker');
    this.createWorker('media-sync', async (job) => {
      if (job.name !== 'sync-telegram-attachment') {
        return;
      }

      await processMediaSyncJob(job as any);
    });

    AppLogger.info('✅ Queue Service inicializado');
  }

  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
    const queue = new Queue(name, {
      ...this.getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  async addJob(name: string, data: JobData, options?: Job['opts']): Promise<Job> {
    const queue = this.getQueue(name);
    const job = await queue.add(data.type, data.payload, options);
    AppLogger.debug(`Job ${job.id} agregado a cola ${name}`);
    return job;
  }

  createWorker(
    name: string,
    processor: (job: Job) => Promise<void>
  ): Worker {
    if (this.workers.has(name)) {
      return this.workers.get(name)!;
    }

    const worker = new Worker(name, processor, {
      ...this.getConnection(),
      concurrency: 5,
    });

    worker.on('completed', (job) => {
      AppLogger.debug(`Job ${job.id} completado en worker ${name}`);
    });

    worker.on('failed', (job, err) => {
      AppLogger.error(`Job ${job?.id} falló en worker ${name}:`, err);
    });

    this.workers.set(name, worker);
    return worker;
  }

  async close(): Promise<void> {
    // Cerrar workers
    for (const [name, worker] of this.workers) {
    await worker.close();
    AppLogger.debug(`Worker ${name} cerrado`);
    }
    this.workers.clear();

    // Cerrar queues
    for (const [name, queue] of this.queues) {
    await queue.close();
    AppLogger.debug(`Queue ${name} cerrada`);
    }
    this.queues.clear();

    AppLogger.info('🔌 Queue Service cerrado');
  }
}

export const queueService = new QueueService();
