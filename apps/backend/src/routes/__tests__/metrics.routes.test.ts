/**
 * Tests for metrics.routes.ts
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';

const checkConnection = jest.fn() as jest.Mock;

jest.mock('../../config/prisma', () => ({
  prismaService: {
    checkConnection,
  },
}));

async function runMiddlewares(handlers: Function[], req: any, res: any) {
  let idx = 0;
  const next = async () => {
    const fn = handlers[idx++];
    if (!fn) return;
    if (fn.length >= 3) {
      return fn(req, res, next);
    }
    return fn(req, res);
  };
  await next();
}

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  npm_package_version: process.env.npm_package_version,
};

describe('metrics.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.npm_package_version = originalEnv.npm_package_version;
    jest.restoreAllMocks();
  });

  it('devuelve metrics con database healthy y tiempos controlados', async () => {
    process.env.NODE_ENV = 'production';
    process.env.npm_package_version = '2.5.0';

    // @ts-expect-error - jest.Mock infers never for mockResolvedValueOnce in strict mode
    checkConnection.mockResolvedValueOnce(true);
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1500);
    jest.spyOn(process, 'uptime').mockReturnValue(123.45);
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 400,
      heapTotal: 200,
      heapUsed: 100,
      external: 50,
    } as NodeJS.MemoryUsage);

    const router = (await import('../metrics.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/');
    const res = createMockRes() as any;
    res.set = jest.fn().mockReturnValue(res);

    await runMiddlewares(handlers, {}, res);

    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    expect(res.status).toHaveBeenCalledWith(200);
    const body = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(body).toContain('backend_info{version="2.5.0",environment="production"} 1');
    expect(body).toContain('backend_database_healthy 1');
    expect(body).toContain('backend_metrics_response_time_ms 500');
    expect(body).toContain('backend_memory_usage_bytes{type="heap_used"} 100');
  });

  it('marca la base de datos como no saludable', async () => {
    process.env.NODE_ENV = 'test';
    process.env.npm_package_version = '1.0.0';

    // @ts-expect-error - jest.Mock infers never for mockResolvedValueOnce in strict mode
    checkConnection.mockResolvedValueOnce(false);
    jest.spyOn(Date, 'now').mockReturnValueOnce(2000).mockReturnValueOnce(2000);
    jest.spyOn(process, 'uptime').mockReturnValue(10);
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 10,
      heapTotal: 20,
      heapUsed: 5,
      external: 1,
    } as NodeJS.MemoryUsage);

    const router = (await import('../metrics.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/');
    const res = createMockRes() as any;
    res.set = jest.fn().mockReturnValue(res);

    await runMiddlewares(handlers, {}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(body).toContain('backend_database_healthy 0');
  });

  it('retorna 500 si falla la generacion de metrics', async () => {
    // @ts-expect-error - jest.Mock infers never for mockRejectedValueOnce in strict mode
    checkConnection.mockRejectedValueOnce(new Error('db down'));

    const router = (await import('../metrics.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/');
    const res = createMockRes() as any;
    res.set = jest.fn().mockReturnValue(res);

    await runMiddlewares(handlers, {}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('# error generating metrics\n');
  });
});
