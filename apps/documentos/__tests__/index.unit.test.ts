/**
 * Covers src/index.ts boot path without starting real servers.
 */

jest.mock('dotenv', () => ({ config: jest.fn() }));

jest.mock('./../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('./../src/config/environment', () => ({
  isServiceEnabled: () => true,
  getEnvironment: () => ({
    NODE_ENV: 'test',
    DOCUMENTOS_PORT: 1234,
    FRONTEND_URLS: 'http://x',
  }),
}));

jest.mock('./../src/config/database', () => ({
  db: { connect: jest.fn(async () => undefined), disconnect: jest.fn(async () => undefined), getClient: jest.fn() },
}));

jest.mock('./../src/workers/document-validation.worker', () => ({
  getDocumentValidationWorker: jest.fn(() => ({})),
  closeDocumentValidationWorker: jest.fn(async () => undefined),
}));

jest.mock('./../src/workers/document-ai-validation.worker', () => ({
  startDocumentAIValidationWorker: jest.fn(),
  stopDocumentAIValidationWorker: jest.fn(async () => undefined),
}));

jest.mock('./../src/services/queue.service', () => ({
  queueService: { close: jest.fn(async () => undefined) },
}));

jest.mock('./../src/services/scheduler.service', () => ({
  schedulerService: { start: jest.fn(), stop: jest.fn() },
}));

jest.mock('./../src/services/system-config.service', () => ({
  SystemConfigService: { initializeDefaults: jest.fn(async () => undefined) },
}));

jest.mock('./../src/services/websocket.service', () => ({
  webSocketService: { initialize: jest.fn(), close: jest.fn() },
}));

jest.mock('./../src/services/document-validation.service', () => ({
  documentValidationService: { isEnabled: () => false },
}));

jest.mock('./../src/workers/notifications.worker', () => ({
  getNotificationsWorker: jest.fn(() => ({})),
}));

jest.mock('./../src/middlewares/error.middleware', () => ({
  errorHandler: (_e: any, _req: any, _res: any, _next: any) => undefined,
  notFoundHandler: (_req: any, _res: any) => undefined,
}));

jest.mock('./../src/routes', () => ({
  __esModule: true,
  default: (_req: any, _res: any, _next: any) => undefined,
}));

jest.mock('cors', () => {
  const cors = (_opts: any) => (_req: any, _res: any, next: any) => next();
  return { __esModule: true, default: cors };
});

jest.mock('express', () => {
  const app: any = {
    set: jest.fn(),
    use: jest.fn(),
    get: jest.fn(),
  };
  const express: any = () => app;
  express.json = () => (_req: any, _res: any, next: any) => next();
  express.urlencoded = () => (_req: any, _res: any, next: any) => next();
  return express;
});

jest.mock('http', () => ({
  createServer: (_app: any) => {
    const srv: any = {
      listen: (_port: any, cb: any) => { if (cb) cb(); return srv; },
      close: (cb: any) => { if (cb) cb(); },
    };
    return srv;
  },
}));

describe('src/index.ts', () => {
  it('boots without starting real network listeners', async () => {
    const beforeTERM = new Set(process.listeners('SIGTERM'));
    const beforeINT = new Set(process.listeners('SIGINT'));

    jest.isolateModules(() => {
      require('../src/index');
    });

    // Cleanup listeners added by the module
    for (const l of process.listeners('SIGTERM')) if (!beforeTERM.has(l as any)) process.removeListener('SIGTERM', l as any);
    for (const l of process.listeners('SIGINT')) if (!beforeINT.has(l as any)) process.removeListener('SIGINT', l as any);
  });
});


