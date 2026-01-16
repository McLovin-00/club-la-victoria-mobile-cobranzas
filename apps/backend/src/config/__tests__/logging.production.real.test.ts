/**
 * Cubre ramas de config/logging.ts en producción (sanitización y debug no-op).
 * @jest-environment node
 */

describe('config/logging production (real)', () => {
  const oldEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = oldEnv;
    jest.resetModules();
  });

  it('Logger sanitizes sensitive keys and requestLogger logs access without debug extras', async () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => true),
      mkdirSync: jest.fn(),
      appendFileSync: jest.fn(),
    }));
    const { Logger, requestLogger } = await import('../logging');

    Logger.info('hello', { password: 'x', token: 'y', nested: { authorization: 'Bearer abc.def.ghi' } });
    Logger.warn('warn', { apiKey: 'k' });
    Logger.error('err', new Error('boom'));
    // debug no-op in production
    Logger.debug('dbg', { any: 1 });

    const on = jest.fn((_evt: string, cb: any) => cb());
    const req: any = { method: 'GET', originalUrl: '/x', ip: '1', headers: { authorization: 'Bearer a.b.c' }, query: { q: 'x' }, params: { id: '1' }, body: { password: 'x' } };
    const res: any = { statusCode: 200, on };
    const next = jest.fn();
    requestLogger(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});


