/**
 * Tests for config.routes.ts
 */

const getConfig = jest.fn();
const getEnabledServices = jest.fn();

jest.mock('../../config/serviceConfig', () => ({
  backendServiceConfig: {
    getConfig,
    getEnabledServices,
  },
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
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
};

describe('ConfigRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should import config routes without errors', () => {
    expect(() => require('../config.routes')).not.toThrow();
  });

  it('should export a router', () => {
    const configRoutes = require('../config.routes');
    expect(configRoutes).toBeDefined();
  });

  it('GET /services devuelve configuracion sin servicios habilitados', async () => {
    getConfig.mockReturnValue({ documentos: { enabled: false } });
    getEnabledServices.mockReturnValue([]);

    const router = (await import('../config.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/services');
    const res = createMockRes();

    await runMiddlewares(
      handlers,
      { get: jest.fn().mockReturnValue('jest'), ip: '127.0.0.1' },
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        services: { documentos: { enabled: false, name: 'Documentos', description: expect.any(String) } },
        summary: { totalEnabled: 0, enabledServices: [], coreServicesOnly: true },
        timestamp: fixedIso,
        version: '1.0.0',
      })
    );
  });

  it('GET /services devuelve servicios habilitados', async () => {
    getConfig.mockReturnValue({ documentos: { enabled: true } });
    getEnabledServices.mockReturnValue(['Documentos']);

    const router = (await import('../config.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/services');
    const res = createMockRes();

    await runMiddlewares(
      handlers,
      { get: jest.fn().mockReturnValue('jest'), ip: '127.0.0.1' },
      res
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: { totalEnabled: 1, enabledServices: ['Documentos'], coreServicesOnly: false },
        timestamp: fixedIso,
      })
    );
  });

  it('GET /services devuelve error detallado en development', async () => {
    process.env.NODE_ENV = 'development';
    getConfig.mockImplementation(() => {
      throw new Error('boom');
    });

    const router = (await import('../config.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/services');
    const res = createMockRes();

    await runMiddlewares(
      handlers,
      { get: jest.fn().mockReturnValue('jest'), ip: '127.0.0.1' },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error reading service configuration',
        error: 'boom',
        timestamp: fixedIso,
      })
    );
  });

  it('GET /services devuelve error generico fuera de development', async () => {
    process.env.NODE_ENV = 'production';
    getConfig.mockImplementation(() => {
      throw new Error('boom');
    });

    const router = (await import('../config.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/services');
    const res = createMockRes();

    await runMiddlewares(
      handlers,
      { get: jest.fn().mockReturnValue('jest'), ip: '127.0.0.1' },
      res
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error reading service configuration',
        error: 'Internal server error',
        timestamp: fixedIso,
      })
    );
  });

  it('GET /health devuelve estado OK', async () => {
    const router = (await import('../config.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/health');
    const res = createMockRes();

    await runMiddlewares(handlers, {}, res);

    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      service: 'config',
      timestamp: fixedIso,
    });
  });
});

