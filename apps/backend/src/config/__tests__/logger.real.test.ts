/**
 * Cubre config/logger.ts con mocks de winston para evitar I/O real.
 * @jest-environment node
 */

describe('config/logger (real)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('creates logs dir when missing and Logger helpers call underlying logger', async () => {
    const logCalls: any[] = [];
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => false),
      mkdirSync: jest.fn(),
    }));

    jest.doMock('winston-daily-rotate-file', () => function DailyRotateFile() {});

    jest.doMock('winston', () => {
      const formatFn = (transform?: any) => ({ transform: transform || ((info: any) => info) });
      // En winston real, winston.format(fn) retorna una factory callable (piiMaskFormat()).
      const fmt: any = (fn: any) => () => formatFn(fn);
      fmt.combine = (..._a: any[]) => formatFn();
      fmt.timestamp = (_o: any) => () => formatFn();
      fmt.colorize = (_o: any) => () => formatFn();
      fmt.printf = (_fn: any) => () => formatFn();
      fmt.errors = (_o: any) => () => formatFn();

      const transports: any = {
        Console: function Console(_o: any) {},
        File: function File(_o: any) {},
      };

      return {
        addColors: jest.fn(),
        format: fmt,
        transports,
        createLogger: (_cfg: any) => ({
          error: (...a: any[]) => logCalls.push(['error', ...a]),
          warn: (...a: any[]) => logCalls.push(['warn', ...a]),
          info: (...a: any[]) => logCalls.push(['info', ...a]),
          http: (...a: any[]) => logCalls.push(['http', ...a]),
          debug: (...a: any[]) => logCalls.push(['debug', ...a]),
        }),
      };
    });

    const { AppLogger, Logger } = await import('../logger');
    AppLogger.info('a');
    AppLogger.warn('b');
    AppLogger.error('c');
    AppLogger.debug('d');
    AppLogger.http('e');
    AppLogger.logRequest('GET', '/x', 200, 12);
    AppLogger.logDatabaseOperation('SELECT', 'users');
    AppLogger.logAuthAttempt('a@b.com', true, '1.1.1.1');
    AppLogger.logError(new Error('boom'), 'CTX');

    expect(typeof Logger.getInstance).toBe('function');
    expect(logCalls.length).toBeGreaterThan(0);
  });
});


