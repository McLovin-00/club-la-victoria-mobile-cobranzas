/**
 * Smoke tests para health.routes.ts
 */

const checkConnection = jest.fn();

jest.mock('../../config/prisma', () => ({
  prismaService: { checkConnection },
}));

import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';

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

const fixedDate = new Date('2024-01-01T00:00:00.000Z');
const fixedIso = fixedDate.toISOString();
const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  npm_package_version: process.env.npm_package_version,
};
let uptimeSpy: jest.SpyInstance;

describe('HealthRoutes - Smoke Tests', () => {
  it('should import health routes without errors', () => {
    expect(() => require('../health.routes')).not.toThrow();
  });

  it('should export a router', () => {
    const healthRoutes = require('../health.routes');
    expect(healthRoutes).toBeDefined();
    expect(healthRoutes.default || healthRoutes).toBeDefined();
  });
});

describe('HealthRoutes handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
    uptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(42);
    process.env.NODE_ENV = 'test';
    process.env.npm_package_version = '9.9.9';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.npm_package_version = originalEnv.npm_package_version;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('GET / returns healthy payload', async () => {
    const router = (await import('../health.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/');

    const res = createMockRes();
    await runMiddlewares(handlers, {}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'healthy',
        timestamp: fixedIso,
        uptime: 42,
        responseTime: 0,
        environment: 'test',
        version: '9.9.9',
      })
    );
  });

  it('GET / returns 503 on error', async () => {
    uptimeSpy.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const router = (await import('../health.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/');

    const res = createMockRes();
    await runMiddlewares(handlers, {}, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'unhealthy',
        timestamp: fixedIso,
        error: 'boom',
      })
    );
  });

  it('GET /ready reports readiness', async () => {
    checkConnection.mockResolvedValueOnce(true);

    const router = (await import('../health.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/ready');

    const res = createMockRes();
    await runMiddlewares(handlers, {}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'ready', timestamp: fixedIso });
  });

  it('GET /ready reports not-ready on db error', async () => {
    checkConnection.mockRejectedValueOnce(new Error('db down'));

    const router = (await import('../health.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/ready');

    const res = createMockRes();
    await runMiddlewares(handlers, {}, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: 'not-ready', timestamp: fixedIso });
  });

  it('GET /live reports liveness', async () => {
    const router = (await import('../health.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/live');

    const res = createMockRes();
    await runMiddlewares(handlers, {}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'alive', timestamp: fixedIso, uptime: 42 });
  });
});

