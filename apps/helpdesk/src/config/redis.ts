import Redis from 'ioredis';
import { AppLogger } from './logger';
import { getEnvironment } from './environment';

let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redis) {
    const env = getEnvironment();
    
    // Prefer REDIS_URL if available, otherwise construct from host/port
    const redisUrl = env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          AppLogger.error('❌ Redis: máximo de reintentos alcanzado');
          return null;
        }
        return Math.min(times * 100, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      AppLogger.info('✅ Conectado a Redis');
    });

    redis.on('error', (err: Error) => {
      AppLogger.error('❌ Error de conexión Redis:', err);
    });

    redis.on('close', () => {
      AppLogger.warn('🔌 Conexión Redis cerrada');
    });
  }

  return redis;
};

export const closeRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
    AppLogger.info('🔌 Redis client cerrado');
  }
};
