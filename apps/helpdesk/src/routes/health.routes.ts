import { Router, Response, RequestHandler } from 'express';
import { db } from '../config/database';
import { getRedisClient } from '../config/redis';
import { AppLogger } from '../config/logger';

const router: Router = Router();

/**
 * GET /health
 * Health check básico
 */
router.get('/', (_req, res: Response) => {
  res.json({
    status: 'ok',
    service: 'helpdesk',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/ready
 * Verifica que todas las dependencias estén disponibles
 */
router.get('/ready', async (_req, res: Response) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // Check database
  try {
    const start = Date.now();
    const prisma = db.getClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    checks.database = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    AppLogger.error('Health check - Database error:', error);
  }

  // Check Redis
  try {
    const start = Date.now();
    const redis = getRedisClient();
    await redis.ping();
    checks.redis = { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    checks.redis = { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    AppLogger.error('Health check - Redis error:', error);
  }

  // Determine overall status
  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const hasError = Object.values(checks).some((c) => c.status === 'error');

  res.status(hasError ? 503 : 200).json({
    status: allOk ? 'ok' : 'degraded',
    service: 'helpdesk',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
