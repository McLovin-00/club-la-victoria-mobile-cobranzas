import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { RemitoAnalysisJobData } from '../types';

const env = getEnvironment();

const connection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'remitos-analysis';

class QueueService {
  private queue: Queue<RemitoAnalysisJobData>;
  
  constructor() {
    this.queue = new Queue(QUEUE_NAME, { connection: connection as never });
  }
  
  async addAnalysisJob(data: RemitoAnalysisJobData): Promise<string> {
    const job = await this.queue.add('analyze-remito', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    
    AppLogger.info(`📥 Job de análisis encolado: ${job.id}`, { remitoId: data.remitoId });
    return job.id!;
  }
  
  async close(): Promise<void> {
    await this.queue.close();
    await connection.quit();
  }
  
  getQueue(): Queue<RemitoAnalysisJobData> {
    return this.queue;
  }
}

export const queueService = new QueueService();

