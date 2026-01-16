/**
 * Additional coverage for src/index.ts branches (service disabled, OpenAPI, Swagger, AI worker).
 */

function cleanupSignalListeners(beforeTERM: Set<any>, beforeINT: Set<any>) {
  for (const l of process.listeners('SIGTERM')) if (!beforeTERM.has(l as any)) process.removeListener('SIGTERM', l as any);
  for (const l of process.listeners('SIGINT')) if (!beforeINT.has(l as any)) process.removeListener('SIGINT', l as any);
}

describe('src/index.ts (more branches)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns early when service disabled', async () => {
    const beforeTERM = new Set(process.listeners('SIGTERM'));
    const beforeINT = new Set(process.listeners('SIGINT'));

    const warn = jest.fn();
    const connect = jest.fn(async () => undefined);

    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      jest.doMock('./../src/config/logger', () => ({ AppLogger: { info: jest.fn(), warn, error: jest.fn(), debug: jest.fn() } }));
      jest.doMock('./../src/config/environment', () => ({
        isServiceEnabled: () => false,
        getEnvironment: () => ({ NODE_ENV: 'test', DOCUMENTOS_PORT: 1234, FRONTEND_URLS: 'http://x' }),
      }));
      jest.doMock('./../src/config/database', () => ({ db: { connect, disconnect: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/workers/document-validation.worker', () => ({
        getDocumentValidationWorker: jest.fn(),
        closeDocumentValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/workers/document-ai-validation.worker', () => ({
        startDocumentAIValidationWorker: jest.fn(),
        stopDocumentAIValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/workers/notifications.worker', () => ({ getNotificationsWorker: jest.fn() }));
      jest.doMock('./../src/services/document-validation.service', () => ({ documentValidationService: { isEnabled: () => false } }));
      jest.doMock('./../src/services/queue.service', () => ({ queueService: { close: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/scheduler.service', () => ({ schedulerService: { start: jest.fn(), stop: jest.fn() } }));
      jest.doMock('./../src/services/system-config.service', () => ({ SystemConfigService: { initializeDefaults: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/websocket.service', () => ({ webSocketService: { initialize: jest.fn(), close: jest.fn() } }));
      jest.doMock('./../src/middlewares/error.middleware', () => ({ errorHandler: jest.fn(), notFoundHandler: jest.fn() }));
      jest.doMock('./../src/routes', () => ({ __esModule: true, default: jest.fn() }));
      jest.doMock('cors', () => ({ __esModule: true, default: () => (_req: any, _res: any, next: any) => next() }));
      jest.doMock('express', () => {
        const app: any = { set: jest.fn(), use: jest.fn(), get: jest.fn() };
        const express: any = () => app;
        express.json = () => (_req: any, _res: any, next: any) => next();
        express.urlencoded = () => (_req: any, _res: any, next: any) => next();
        return express;
      });
      jest.doMock('http', () => ({ createServer: () => ({ listen: (_p: any, cb: any) => { if (cb) cb(); }, close: (cb: any) => cb?.() }) }));

      require('../src/index');
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DESHABILITADO'));
    expect(connect).not.toHaveBeenCalled();

    cleanupSignalListeners(beforeTERM, beforeINT);
  });

  it('enables AI validation worker when documentValidationService.isEnabled() is true', async () => {
    const beforeTERM = new Set(process.listeners('SIGTERM'));
    const beforeINT = new Set(process.listeners('SIGINT'));

    const startAI = jest.fn();

    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      jest.doMock('./../src/config/logger', () => ({ AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
      jest.doMock('./../src/config/environment', () => ({
        isServiceEnabled: () => true,
        getEnvironment: () => ({ NODE_ENV: 'test', DOCUMENTOS_PORT: 1234, FRONTEND_URLS: 'http://x' }),
      }));
      jest.doMock('./../src/config/database', () => ({ db: { connect: jest.fn(async () => undefined), disconnect: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/workers/document-validation.worker', () => ({
        getDocumentValidationWorker: jest.fn(),
        closeDocumentValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/workers/notifications.worker', () => ({ getNotificationsWorker: jest.fn() }));
      jest.doMock('./../src/workers/document-ai-validation.worker', () => ({
        startDocumentAIValidationWorker: startAI,
        stopDocumentAIValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/services/document-validation.service', () => ({ documentValidationService: { isEnabled: () => true } }));
      jest.doMock('./../src/services/queue.service', () => ({ queueService: { close: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/scheduler.service', () => ({ schedulerService: { start: jest.fn(), stop: jest.fn() } }));
      jest.doMock('./../src/services/system-config.service', () => ({ SystemConfigService: { initializeDefaults: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/websocket.service', () => ({ webSocketService: { initialize: jest.fn(), close: jest.fn() } }));
      jest.doMock('./../src/middlewares/error.middleware', () => ({ errorHandler: jest.fn(), notFoundHandler: jest.fn() }));
      jest.doMock('./../src/routes', () => ({ __esModule: true, default: jest.fn() }));
      jest.doMock('cors', () => ({ __esModule: true, default: () => (_req: any, _res: any, next: any) => next() }));
      jest.doMock('express', () => {
        const app: any = { set: jest.fn(), use: jest.fn(), get: jest.fn() };
        const express: any = () => app;
        express.json = () => (_req: any, _res: any, next: any) => next();
        express.urlencoded = () => (_req: any, _res: any, next: any) => next();
        return express;
      });
      jest.doMock('http', () => ({ createServer: () => ({ listen: (_p: any, cb: any) => { if (cb) cb(); }, close: (cb: any) => cb?.() }) }));

      require('../src/index');
    });

    // allow async main() to advance
    await new Promise<void>((r) => setImmediate(r));

    expect(startAI).toHaveBeenCalled();
    cleanupSignalListeners(beforeTERM, beforeINT);
  });

  it('registers OpenAPI endpoints and returns 404 when yaml missing / json parse fails', async () => {
    const beforeTERM = new Set(process.listeners('SIGTERM'));
    const beforeINT = new Set(process.listeners('SIGINT'));

    const getCalls: Array<{ path: string; handler: Function }> = [];
    const warn = jest.fn();

    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      jest.doMock('fs', () => ({ existsSync: jest.fn(() => false), readFileSync: jest.fn(() => 'x') }));
      jest.doMock('yaml', () => ({ parse: jest.fn(() => { throw new Error('bad yaml'); }) }));
      jest.doMock('swagger-ui-express', () => ({ serve: {}, setup: () => (_req: any, _res: any, _next: any) => undefined }), { virtual: true });

      jest.doMock('./../src/config/logger', () => ({ AppLogger: { info: jest.fn(), warn, error: jest.fn(), debug: jest.fn() } }));
      jest.doMock('./../src/config/environment', () => ({
        isServiceEnabled: () => true,
        getEnvironment: () => ({ NODE_ENV: 'test', DOCUMENTOS_PORT: 1234, FRONTEND_URLS: 'http://x' }),
      }));
      jest.doMock('./../src/config/database', () => ({ db: { connect: jest.fn(async () => undefined), disconnect: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/workers/document-validation.worker', () => ({
        getDocumentValidationWorker: jest.fn(),
        closeDocumentValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/workers/notifications.worker', () => ({ getNotificationsWorker: jest.fn() }));
      jest.doMock('./../src/workers/document-ai-validation.worker', () => ({
        startDocumentAIValidationWorker: jest.fn(),
        stopDocumentAIValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/services/document-validation.service', () => ({ documentValidationService: { isEnabled: () => false } }));
      jest.doMock('./../src/services/queue.service', () => ({ queueService: { close: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/scheduler.service', () => ({ schedulerService: { start: jest.fn(), stop: jest.fn() } }));
      jest.doMock('./../src/services/system-config.service', () => ({ SystemConfigService: { initializeDefaults: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/websocket.service', () => ({ webSocketService: { initialize: jest.fn(), close: jest.fn() } }));
      jest.doMock('./../src/middlewares/error.middleware', () => ({ errorHandler: jest.fn(), notFoundHandler: jest.fn() }));
      jest.doMock('./../src/routes', () => ({ __esModule: true, default: jest.fn() }));
      jest.doMock('cors', () => ({ __esModule: true, default: () => (_req: any, _res: any, next: any) => next() }));
      jest.doMock('express', () => {
        const app: any = {
          set: jest.fn(),
          use: jest.fn(),
          get: jest.fn((p: string, h: any) => getCalls.push({ path: p, handler: h })),
        };
        const express: any = () => app;
        express.json = () => (_req: any, _res: any, next: any) => next();
        express.urlencoded = () => (_req: any, _res: any, next: any) => next();
        return express;
      });
      jest.doMock('http', () => ({ createServer: () => ({ listen: (_p: any, cb: any) => { if (cb) cb(); }, close: (cb: any) => cb?.() }) }));

      require('../src/index');
    });

    // allow async main() to advance and register routes
    await new Promise<void>((r) => setImmediate(r));

    const yamlHandler = getCalls.find((c) => c.path === '/openapi.yaml')!.handler;
    const jsonHandler = getCalls.find((c) => c.path === '/openapi.json')!.handler;

    const res: any = { sendFile: jest.fn(), send: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };
    await yamlHandler({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('not found'));

    const res2: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await jsonHandler({}, res2);
    expect(res2.status).toHaveBeenCalledWith(404);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));

    // Swagger UI not available (yaml missing => warn)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Swagger UI no disponible'));

    cleanupSignalListeners(beforeTERM, beforeINT);
  });

  it('covers openapi.json parse error and swagger-ui /docs when yaml exists', async () => {
    const beforeTERM = new Set(process.listeners('SIGTERM'));
    const beforeINT = new Set(process.listeners('SIGINT'));

    const getCalls: Array<{ path: string; handler: Function }> = [];
    const useCalls: any[] = [];

    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      jest.doMock('fs', () => {
        const real = jest.requireActual('fs');
        return { ...real, existsSync: () => true, readFileSync: () => 'bad-yaml' };
      });
      jest.doMock('yaml', () => ({ parse: jest.fn(() => { throw new Error('parse'); }) }));
      jest.doMock('./../src/utils/swaggerUi', () => ({
        tryGetSwaggerUi: () => ({ serve: {}, setup: jest.fn(() => (_req: any, _res: any, _next: any) => undefined) }),
      }));

      jest.doMock('./../src/config/logger', () => ({
        AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
      }));
      jest.doMock('./../src/config/environment', () => ({
        isServiceEnabled: () => true,
        getEnvironment: () => ({ NODE_ENV: 'test', DOCUMENTOS_PORT: 1234, FRONTEND_URLS: 'http://x' }),
      }));
      jest.doMock('./../src/config/database', () => ({ db: { connect: jest.fn(async () => undefined), disconnect: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/workers/document-validation.worker', () => ({
        getDocumentValidationWorker: jest.fn(),
        closeDocumentValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/workers/notifications.worker', () => ({ getNotificationsWorker: jest.fn() }));
      jest.doMock('./../src/workers/document-ai-validation.worker', () => ({
        startDocumentAIValidationWorker: jest.fn(),
        stopDocumentAIValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/services/document-validation.service', () => ({ documentValidationService: { isEnabled: () => false } }));
      jest.doMock('./../src/services/queue.service', () => ({ queueService: { close: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/scheduler.service', () => ({ schedulerService: { start: jest.fn(), stop: jest.fn() } }));
      jest.doMock('./../src/services/system-config.service', () => ({ SystemConfigService: { initializeDefaults: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/websocket.service', () => ({ webSocketService: { initialize: jest.fn(), close: jest.fn() } }));
      jest.doMock('./../src/middlewares/error.middleware', () => ({ errorHandler: jest.fn(), notFoundHandler: jest.fn() }));
      jest.doMock('./../src/routes', () => ({ __esModule: true, default: jest.fn() }));
      jest.doMock('cors', () => ({ __esModule: true, default: () => (_req: any, _res: any, next: any) => next() }));
      jest.doMock('express', () => {
        const app: any = {
          set: jest.fn(),
          use: jest.fn((...args: any[]) => useCalls.push(args)),
          get: jest.fn((p: string, h: any) => getCalls.push({ path: p, handler: h })),
        };
        const express: any = () => app;
        express.json = () => (_req: any, _res: any, next: any) => next();
        express.urlencoded = () => (_req: any, _res: any, next: any) => next();
        return express;
      });
      jest.doMock('http', () => ({ createServer: () => ({ listen: (_p: any, cb: any) => { if (cb) cb(); }, close: (cb: any) => cb?.() }) }));

      require('../src/index');
    });

    await new Promise<void>((r) => setImmediate(r));

    const jsonHandler = getCalls.find((c) => c.path === '/openapi.json')!.handler;
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await jsonHandler({}, res);
    expect(res.status).toHaveBeenCalledWith(404);

    // Swagger setup should register /docs when yaml exists
    expect(useCalls.map((c) => c[0])).toContain('/docs');

    cleanupSignalListeners(beforeTERM, beforeINT);
  });

  it('covers main() catch: db.connect error triggers process.exit(1)', async () => {
    const beforeTERM = new Set(process.listeners('SIGTERM'));
    const beforeINT = new Set(process.listeners('SIGINT'));

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);

    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      jest.doMock('./../src/config/logger', () => ({ AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
      jest.doMock('./../src/config/environment', () => ({
        isServiceEnabled: () => true,
        getEnvironment: () => ({ NODE_ENV: 'test', DOCUMENTOS_PORT: 1234, FRONTEND_URLS: 'http://x' }),
      }));
      jest.doMock('./../src/config/database', () => ({ db: { connect: jest.fn(async () => { throw new Error('boom'); }), disconnect: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/workers/document-validation.worker', () => ({
        getDocumentValidationWorker: jest.fn(),
        closeDocumentValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/workers/notifications.worker', () => ({ getNotificationsWorker: jest.fn() }));
      jest.doMock('./../src/workers/document-ai-validation.worker', () => ({
        startDocumentAIValidationWorker: jest.fn(),
        stopDocumentAIValidationWorker: jest.fn(async () => undefined),
      }));
      jest.doMock('./../src/services/document-validation.service', () => ({ documentValidationService: { isEnabled: () => false } }));
      jest.doMock('./../src/services/queue.service', () => ({ queueService: { close: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/scheduler.service', () => ({ schedulerService: { start: jest.fn(), stop: jest.fn() } }));
      jest.doMock('./../src/services/system-config.service', () => ({ SystemConfigService: { initializeDefaults: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/websocket.service', () => ({ webSocketService: { initialize: jest.fn(), close: jest.fn() } }));
      jest.doMock('./../src/middlewares/error.middleware', () => ({ errorHandler: jest.fn(), notFoundHandler: jest.fn() }));
      jest.doMock('./../src/routes', () => ({ __esModule: true, default: jest.fn() }));
      jest.doMock('cors', () => ({ __esModule: true, default: () => (_req: any, _res: any, next: any) => next() }));
      jest.doMock('express', () => {
        const app: any = { set: jest.fn(), use: jest.fn(), get: jest.fn() };
        const express: any = () => app;
        express.json = () => (_req: any, _res: any, next: any) => next();
        express.urlencoded = () => (_req: any, _res: any, next: any) => next();
        return express;
      });
      jest.doMock('http', () => ({ createServer: () => ({ listen: (_p: any, cb: any) => { if (cb) cb(); }, close: (cb: any) => cb?.() }) }));

      require('../src/index');
    });

    await new Promise<void>((r) => setImmediate(r));
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    cleanupSignalListeners(beforeTERM, beforeINT);
  });

  it('covers graceful shutdown success and error paths', async () => {
    const beforeTERM = new Set(process.listeners('SIGTERM'));
    const beforeINT = new Set(process.listeners('SIGINT'));

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
    let closeServerMock = jest.fn((cb: any) => cb?.());

    const closeDocWorker = jest.fn(async () => undefined);
    const stopAI = jest.fn(async () => undefined);
    const queueClose = jest.fn(async () => undefined);
    const disconnect = jest.fn(async () => undefined);
    const stopScheduler = jest.fn();
    const wsClose = jest.fn();

    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      jest.doMock('./../src/config/logger', () => ({ AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
      jest.doMock('./../src/config/environment', () => ({
        isServiceEnabled: () => true,
        getEnvironment: () => ({ NODE_ENV: 'test', DOCUMENTOS_PORT: 1234, FRONTEND_URLS: 'http://x' }),
      }));
      jest.doMock('./../src/config/database', () => ({ db: { connect: jest.fn(async () => undefined), disconnect } }));
      jest.doMock('./../src/workers/document-validation.worker', () => ({
        getDocumentValidationWorker: jest.fn(),
        closeDocumentValidationWorker: closeDocWorker,
      }));
      jest.doMock('./../src/workers/notifications.worker', () => ({ getNotificationsWorker: jest.fn() }));
      jest.doMock('./../src/workers/document-ai-validation.worker', () => ({
        startDocumentAIValidationWorker: jest.fn(),
        stopDocumentAIValidationWorker: stopAI,
      }));
      jest.doMock('./../src/services/document-validation.service', () => ({ documentValidationService: { isEnabled: () => false } }));
      jest.doMock('./../src/services/queue.service', () => ({ queueService: { close: queueClose } }));
      jest.doMock('./../src/services/scheduler.service', () => ({ schedulerService: { start: jest.fn(), stop: stopScheduler } }));
      jest.doMock('./../src/services/system-config.service', () => ({ SystemConfigService: { initializeDefaults: jest.fn(async () => undefined) } }));
      jest.doMock('./../src/services/websocket.service', () => ({ webSocketService: { initialize: jest.fn(), close: wsClose } }));
      jest.doMock('./../src/middlewares/error.middleware', () => ({ errorHandler: jest.fn(), notFoundHandler: jest.fn() }));
      jest.doMock('./../src/routes', () => ({ __esModule: true, default: jest.fn() }));
      jest.doMock('cors', () => ({ __esModule: true, default: () => (_req: any, _res: any, next: any) => next() }));
      jest.doMock('express', () => {
        const app: any = { set: jest.fn(), use: jest.fn(), get: jest.fn() };
        const express: any = () => app;
        express.json = () => (_req: any, _res: any, next: any) => next();
        express.urlencoded = () => (_req: any, _res: any, next: any) => next();
        return express;
      });
      jest.doMock('http', () => ({
        createServer: () => {
          const srv: any = {
            listen: (_p: any, cb: any) => { if (cb) cb(); return srv; },
            close: closeServerMock,
          };
          return srv;
        },
      }));

      require('../src/index');
    });

    await new Promise<void>((r) => setImmediate(r));
    process.emit('SIGTERM');
    await new Promise<void>((r) => setImmediate(r));

    expect(closeServerMock).toHaveBeenCalled();
    expect(stopScheduler).toHaveBeenCalled();
    expect(wsClose).toHaveBeenCalled();
    expect(closeDocWorker).toHaveBeenCalled();
    expect(stopAI).toHaveBeenCalled();
    expect(queueClose).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    // error path: disconnect throws => exit(1)
    exitSpy.mockClear();
    disconnect.mockRejectedValueOnce(new Error('boom'));
    process.emit('SIGINT');
    await new Promise<void>((r) => setImmediate(r));
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    cleanupSignalListeners(beforeTERM, beforeINT);
  });
});


