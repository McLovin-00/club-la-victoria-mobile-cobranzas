/**
 * Tests adicionales para config/logger.ts
 * Cubriendo logDatabaseOperation con duración, logAuthAttempt sin IP, singleton
 * @jest-environment node
 */

describe('config/logger additional coverage', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('logs exist and covers all Logger methods', async () => {
        const logCalls: unknown[][] = [];

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
        }));

        jest.doMock('winston-daily-rotate-file', () => function DailyRotateFile() { });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.doMock('winston', () => {
            const formatFn = () => ({ transform: (info: unknown) => info });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fmt: any = () => () => formatFn();
            fmt.combine = () => formatFn();
            fmt.timestamp = () => () => formatFn();
            fmt.colorize = () => () => formatFn();
            fmt.printf = () => () => formatFn();
            fmt.errors = () => () => formatFn();

            return {
                addColors: jest.fn(),
                format: fmt,
                transports: {
                    Console: function Console() { },
                    File: function File() { },
                },
                createLogger: () => ({
                    error: (...a: unknown[]) => logCalls.push(['error', ...a]),
                    warn: (...a: unknown[]) => logCalls.push(['warn', ...a]),
                    info: (...a: unknown[]) => logCalls.push(['info', ...a]),
                    http: (...a: unknown[]) => logCalls.push(['http', ...a]),
                    debug: (...a: unknown[]) => logCalls.push(['debug', ...a]),
                }),
            };
        });

        const { AppLogger } = await import('../logger');

        // logDatabaseOperation sin duración
        AppLogger.logDatabaseOperation('INSERT', 'users');
        expect(logCalls.some(c => String(c[1]).includes('DB INSERT on users'))).toBe(true);

        // logDatabaseOperation con duración
        AppLogger.logDatabaseOperation('SELECT', 'orders', 25);
        expect(logCalls.some(c => String(c[1]).includes('25ms'))).toBe(true);

        // logAuthAttempt exitoso con IP
        AppLogger.logAuthAttempt('user@email.com', true, '192.168.1.1');
        expect(logCalls.some(c => String(c[1]).includes('SUCCESS'))).toBe(true);

        // logAuthAttempt fallido sin IP
        AppLogger.logAuthAttempt('bad@user.com', false);
        expect(logCalls.some(c => String(c[1]).includes('FAILED'))).toBe(true);

        // logError sin contexto
        AppLogger.logError(new Error('Test error'));
        expect(logCalls.some(c => String(c[1]).includes('Test error'))).toBe(true);
    });

    it('Logger.getInstance always returns same instance', async () => {
        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
        }));

        jest.doMock('winston-daily-rotate-file', () => function DailyRotateFile() { });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        jest.doMock('winston', () => {
            const formatFn = () => ({ transform: (info: unknown) => info });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fmt: any = () => () => formatFn();
            fmt.combine = () => formatFn();
            fmt.timestamp = () => () => formatFn();
            fmt.colorize = () => () => formatFn();
            fmt.printf = () => () => formatFn();
            fmt.errors = () => () => formatFn();

            return {
                addColors: jest.fn(),
                format: fmt,
                transports: {
                    Console: function Console() { },
                    File: function File() { },
                },
                createLogger: () => ({
                    error: jest.fn(),
                    warn: jest.fn(),
                    info: jest.fn(),
                    http: jest.fn(),
                    debug: jest.fn(),
                }),
            };
        });

        const { Logger } = await import('../logger');

        const instance1 = Logger.getInstance();
        const instance2 = Logger.getInstance();

        expect(instance1).toBe(instance2);
    });
});
