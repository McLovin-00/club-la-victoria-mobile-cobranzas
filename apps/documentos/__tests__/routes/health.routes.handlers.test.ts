import type { Response } from 'express';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const envMock = { NODE_ENV: 'test' };
jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => envMock,
}));

const dbMock = {
  healthCheck: jest.fn(),
};
jest.mock('../../src/config/database', () => ({
  db: dbMock,
  prisma: {},
}));

const minioMock = { healthCheck: jest.fn() };
jest.mock('../../src/services/minio.service', () => ({
  minioService: minioMock,
}));

const flowiseMock = { healthCheck: jest.fn() };
jest.mock('../../src/services/flowise.service', () => ({
  flowiseService: flowiseMock,
}));

const queueMock = { getQueueStats: jest.fn() };
jest.mock('../../src/services/queue.service', () => ({
  queueService: queueMock,
}));

const perfMock = { getSystemMetrics: jest.fn() };
jest.mock('../../src/services/performance.service', () => ({
  performanceService: perfMock,
}));

import router from '../../src/routes/health.routes';

function createRes(): Response & { status: jest.Mock; json: jest.Mock } {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockImplementation(() => res);
  res.json.mockImplementation(() => res);
  return res;
}

function findHandler(method: 'get', path: string) {
  const layer: any = (router as any).stack.find((l: any) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as Function;
}

describe('health.routes handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbMock.healthCheck.mockResolvedValue(true);
    minioMock.healthCheck.mockResolvedValue(true);
    flowiseMock.healthCheck.mockResolvedValue(true);
    queueMock.getQueueStats.mockResolvedValue({ waiting: 0, active: 0, completed: 0, failed: 0 });
    perfMock.getSystemMetrics.mockResolvedValue({ databaseConnections: 1, materializedViewAge: 5 });
  });

  it('GET / returns 200 and handles error', async () => {
    const handler = findHandler('get', '/');
    const res = createRes();
    await handler({} as any, res);
    expect(res.status).toHaveBeenCalledWith(200);

    // Force catch via env getter throw
    (envMock as any).NODE_ENV = undefined;
    const original = (router as any).stack; // keep to silence ts
    expect(original).toBeTruthy();
    // Create a req that throws when accessing something? easiest: temporarily mock getEnvironment via require cache not; just simulate by throwing in handler via overriding process.uptime
    const uptime = process.uptime;
    (process as any).uptime = () => {
      throw new Error('boom');
    };
    const res2 = createRes();
    await handler({} as any, res2);
    expect(res2.status).toHaveBeenCalledWith(503);
    (process as any).uptime = uptime;
  });

  it('GET /detailed returns 200 when critical deps healthy and 503 otherwise', async () => {
    const handler = findHandler('get', '/detailed');
    const res = createRes();
    await handler({} as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0] as any;
    expect(payload.dependencies).toMatchObject({ database: 'healthy', redis: 'healthy' });

    dbMock.healthCheck.mockResolvedValueOnce(false);
    const res2 = createRes();
    await handler({} as any, res2);
    expect(res2.status).toHaveBeenCalledWith(503);
  });

  it('GET /detailed catch => 503', async () => {
    const handler = findHandler('get', '/detailed');
    dbMock.healthCheck.mockRejectedValueOnce(new Error('boom'));
    const res = createRes();
    await handler({} as any, res);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('GET /ready returns 200/503 and catch => 503', async () => {
    const handler = findHandler('get', '/ready');
    const res = createRes();
    await handler({} as any, res);
    expect(res.status).toHaveBeenCalledWith(200);

    dbMock.healthCheck.mockResolvedValueOnce(false);
    const res2 = createRes();
    await handler({} as any, res2);
    expect(res2.status).toHaveBeenCalledWith(503);

    dbMock.healthCheck.mockRejectedValueOnce(new Error('boom'));
    const res3 = createRes();
    await handler({} as any, res3);
    expect(res3.status).toHaveBeenCalledWith(503);
  });

  it('GET /live always returns 200', async () => {
    const handler = findHandler('get', '/live');
    const res = createRes();
    await handler({} as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'alive' }));
  });
});


