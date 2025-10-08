import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { minioService } from '../services/minio.service';
import { flowiseService } from '../services/flowise.service';
import { queueService } from '../services/queue.service';
import { performanceService } from '../services/performance.service';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';

const router = Router();

// =================================
// HEALTH CHECK - Sistema de Salud
// =================================

/**
 * GET /health - Health check básico
 * Acceso: Público (sin autenticación)
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const env = getEnvironment();
    
    // Health check básico
    const health = {
      service: 'documentos',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
    };

    res.status(200).json(health);
  } catch (error) {
    AppLogger.error('💔 Health check failed:', error);
    res.status(503).json({
      service: 'documentos',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

/**
 * GET /health/detailed - Health check detallado
 * Acceso: Público (sin autenticación)
 */
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  try {
    const env = getEnvironment();
    const startTime = Date.now();

    // Verificar todos los servicios en paralelo
    const [dbStatus, minioStatus, flowiseStatus, queueStats, systemMetrics] = await Promise.all([
      db.healthCheck(),
      minioService.healthCheck(),
      flowiseService.healthCheck(),
      queueService.getQueueStats(),
      performanceService.getSystemMetrics(),
    ]);

    const dependencies = {
      database: dbStatus ? 'healthy' : 'unhealthy',
      minio: minioStatus ? 'healthy' : 'unhealthy',
      flowise: flowiseStatus ? 'healthy' : 'degraded', // No crítico
      redis: (queueStats.waiting >= 0) ? 'healthy' : 'unhealthy',
    };

    // Calcular estado general (solo críticos)
    const criticalHealthy = dependencies.database === 'healthy' && dependencies.redis === 'healthy';
    const status = criticalHealthy ? 'healthy' : 'unhealthy';
    const statusCode = criticalHealthy ? 200 : 503;

    const health = {
      service: 'documentos',
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      dependencies,
      queue: {
        waiting: queueStats.waiting,
        active: queueStats.active,
        completed: queueStats.completed,
        failed: queueStats.failed,
      },
      performance: {
        databaseConnections: systemMetrics.databaseConnections,
        materializedViewAge: `${Math.round(systemMetrics.materializedViewAge)} min`,
        memory: {
          used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        },
      },
    };

    AppLogger.debug('🔍 Health check avanzado completado', {
      status,
      responseTime: Date.now() - startTime,
      dependencies,
    });

    res.status(statusCode).json(health);
  } catch (error) {
    AppLogger.error('💔 Advanced health check failed:', error);
    res.status(503).json({
      service: 'documentos',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// Readiness check para Kubernetes/Docker Swarm
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbStatus = await db.healthCheck();
    
    if (dbStatus) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not-ready',
        reason: 'Database not available',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (_err) {
    res.status(503).json({
      status: 'not-ready',
      reason: 'Internal error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness check para Kubernetes/Docker Swarm
router.get('/live', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;