/**
 * Cobertura real para app.ts/server.ts y módulos de config con 0%.
 * @jest-environment node
 */

jest.mock('../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../config/prisma', () => ({
  initializePrisma: jest.fn(async () => undefined),
  prismaService: { checkConnection: jest.fn(async () => true), getClient: jest.fn(() => ({})) },
  prisma: {},
}));

jest.mock('../config/serviceConfig', () => ({
  backendServiceConfig: {
    getConfig: () => ({ documentos: { enabled: false } }),
    getEnabledServices: () => [],
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(() => ''),
}));

describe('app/server/logging (real)', () => {
  it('initializeApp(skipPrismaInit=true) configures routes without starting server', async () => {
    const { initializeApp } = await import('../app');
    const app = await initializeApp(true);
    expect(app).toBeDefined();
    expect(typeof (app as any).use).toBe('function');
  });

  it('imports server without running startServer automatically', async () => {
    const m = await import('../server');
    expect(typeof m.startServer).toBe('function');
  });

  it('Logger writes (mocked) and requestLogger hooks finish event', async () => {
    const { Logger, requestLogger } = await import('../config/logging');
    Logger.info('x', { token: 'secret' });
    Logger.warn('x');
    Logger.error('x', new Error('boom'));
    Logger.debug('x');

    const on = jest.fn((_evt: string, cb: any) => cb());
    const req: any = { method: 'GET', originalUrl: '/x', ip: '1', headers: {}, query: {}, params: {}, body: {} };
    const res: any = { statusCode: 200, on };
    const next = jest.fn();
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('imports db.ts safely', async () => {
    jest.doMock('pg', () => ({
      Pool: function Pool() {
        return { on: jest.fn(), connect: jest.fn(async () => ({ release: jest.fn() })) };
      },
    }));
    const m = await import('../config/db');
    expect(m.db).toBeDefined();
    expect(typeof m.testConnection).toBe('function');
  });
});


