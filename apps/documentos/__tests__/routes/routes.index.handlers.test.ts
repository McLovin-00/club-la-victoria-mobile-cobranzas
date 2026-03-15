import type { Response } from 'express';

// Mock all mounted sub-routers so importing routes/index.ts is lightweight
jest.mock('../../src/routes/health.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/templates.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/config.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/flowise-config.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/evolution-config.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/documents.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/dashboard.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/metrics.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/clients.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/equipos.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/search.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/storage.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/notifications.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/defaults.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/dadores.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/maestros.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/batch.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/transportistas.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/empresas-transportistas.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/approval.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/compliance.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/audit.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/portal-cliente.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/portal-transportista.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/entity-data.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/transferencias.routes', () => ({ __esModule: true, default: require('express').Router() }));
jest.mock('../../src/routes/plantillas.routes', () => ({ __esModule: true, default: require('express').Router(), clientPlantillasRoutes: require('express').Router(), equipoPlantillasRoutes: require('express').Router() }));
jest.mock('../../src/routes/equipos-download.routes', () => ({ __esModule: true, default: require('express').Router() }));

// Mock middleware functions (pass-through)
jest.mock('../../src/middlewares/rateLimiter.middleware', () => ({
  generalRateLimit: (_req: any, _res: any, next: any) => next(),
  configRateLimit: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/requestContext.middleware', () => ({
  requestContext: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/audit.middleware', () => ({
  auditMiddleware: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/autoFilterByDador.middleware', () => ({
  autoFilterByDador: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/authorizeTransportista.middleware', () => ({
  authorizeTransportista: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const findMany = jest.fn(async () => [{ id: 1 }, { id: 2 }]);
jest.mock('../../src/config/database', () => ({
  db: { getClient: () => ({ documentTemplate: { findMany } }) },
}));

import router from '../../src/routes';

function createRes(): Response & { status: jest.Mock; json: jest.Mock } {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockImplementation(() => res);
  res.json.mockImplementation(() => res);
  return res;
}

function findGetHandler(path: string) {
  const layer: any = (router as any).stack.find((l: any) => l.route?.path === path && l.route?.methods?.get);
  if (!layer) throw new Error(`GET ${path} not found`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as Function;
}

describe('routes/index.ts handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  });

  it('GET / returns service info JSON', async () => {
    const handler = findGetHandler('/');
    const res = createRes();
    await handler({} as any, res);
    const payload = res.json.mock.calls[0][0] as any;
    expect(payload).toMatchObject({
      service: 'Documentos Microservice',
      status: 'active',
      endpoints: expect.any(Object),
    });
    expect(typeof payload.timestamp).toBe('string');
  });

  it('GET /test-templates returns templates list and handles errors', async () => {
    const handler = findGetHandler('/test-templates');
    const res = createRes();
    await handler({} as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, count: 2 }));

    findMany.mockRejectedValueOnce(new Error('boom'));
    const res2 = createRes();
    await handler({} as any, res2);
    expect(res2.status).toHaveBeenCalledWith(500);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});


