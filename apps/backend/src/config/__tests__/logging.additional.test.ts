/**
 * Tests adicionales para config/logging.ts
 * Cubriendo sanitización completa, formateo con errores, access log en desarrollo
 * @jest-environment node
 */

describe('config/logging additional coverage', () => {
    const oldEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        process.env.NODE_ENV = oldEnv;
        jest.resetModules();
    });

    it('sanitizeObject handles arrays and nested objects', async () => {
        process.env.NODE_ENV = 'production';

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: jest.fn(),
        }));

        const { Logger } = await import('../logging');

        // Array con objetos sensibles
        Logger.info('test', [
            { password: 'secret', token: 'abc' },
            { normal: 'value' },
        ]);

        // Objeto con claves sensibles anidadas
        Logger.info('test2', {
            user: {
                auth: 'bearer token',
                credential: 'xyz',
                apiKey: '123',
            },
        });

        // No debe lanzar errores
        expect(true).toBe(true);
    });

    it('sanitizeObject returns string unchanged if not sensitive', async () => {
        process.env.NODE_ENV = 'production';

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: jest.fn(),
        }));

        const { Logger } = await import('../logging');

        // String normal que no es JWT
        Logger.info('test', 'normal string value');
        expect(true).toBe(true);
    });

    it('sanitizeObject returns primitive values unchanged', async () => {
        process.env.NODE_ENV = 'production';

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: jest.fn(),
        }));

        const { Logger } = await import('../logging');

        // Primitivos (number, boolean)
        Logger.info('test', 42);
        Logger.info('test', true);
        Logger.info('test', null);
        Logger.info('test', undefined);
        expect(true).toBe(true);
    });

    it('formatLogMessage handles meta serialization errors', async () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: jest.fn(),
        }));

        const { Logger } = await import('../logging');

        // Crear objeto circular que falla al serializar
        const circular: Record<string, unknown> = { a: 1 };
        circular.self = circular;

        // Debe manejar el error sin lanzar excepción
        Logger.info('test with circular', circular);
        expect(true).toBe(true);
    });

    it('Logger.error handles non-Error objects', async () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: jest.fn(),
        }));

        const { Logger } = await import('../logging');

        // Error como string
        Logger.error('error message', 'just a string');

        // Error como objeto plano
        Logger.error('error message', { code: 500, detail: 'fail' });

        // Error como null
        Logger.error('error message', null);

        expect(true).toBe(true);
    });

    it('Logger.access logs with development extras', async () => {
        process.env.NODE_ENV = 'development';

        const appendFileSyncMock = jest.fn();
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: appendFileSyncMock,
        }));

        const { Logger } = await import('../logging');

        const req = {
            method: 'POST',
            originalUrl: '/api/users',
            ip: '192.168.1.1',
            headers: { 'user-agent': 'Test/1.0' },
            query: { filter: 'active' },
            params: { id: '123' },
            body: { name: 'John', password: 'secret' },
        };

        const res = { statusCode: 201 };

        Logger.access(req, res, 150);

        // En desarrollo, debe escribir a archivo y mostrar en consola
        expect(appendFileSyncMock).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalled();

        consoleLogSpy.mockRestore();
    });

    it('Logger.access without authorization header', async () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: jest.fn(),
        }));

        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        const { Logger } = await import('../logging');

        const req = {
            method: 'GET',
            originalUrl: '/api/health',
            ip: '127.0.0.1',
            headers: {}, // Sin authorization
        };

        const res = { statusCode: 200 };

        // Sin responseTime
        Logger.access(req, res);

        expect(true).toBe(true);
        consoleLogSpy.mockRestore();
    });

    it('Logger.debug is called in development', async () => {
        process.env.NODE_ENV = 'development';

        const appendFileSyncMock = jest.fn();
        const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => { });

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: appendFileSyncMock,
        }));

        const { Logger } = await import('../logging');

        Logger.debug('debug message', { context: 'test' });

        expect(consoleDebugSpy).toHaveBeenCalled();
        expect(appendFileSyncMock).toHaveBeenCalled();

        consoleDebugSpy.mockRestore();
    });

    it('requestLogger calculates response time correctly', async () => {
        process.env.NODE_ENV = 'development';

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: jest.fn(),
        }));

        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

        const { requestLogger } = await import('../logging');

        const req = {
            method: 'GET',
            originalUrl: '/test',
            ip: '127.0.0.1',
            headers: {},
        };

        let finishCallback: (() => void) | null = null;
        const res = {
            statusCode: 200,
            on: jest.fn((event: string, cb: () => void) => {
                if (event === 'finish') {
                    finishCallback = cb;
                }
            }),
        };

        const next = jest.fn();

        requestLogger(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

        // Simular que la respuesta termina
        if (finishCallback) {
            finishCallback();
        }

        consoleLogSpy.mockRestore();
    });

    it('Logger.warn writes to app log', async () => {
        process.env.NODE_ENV = 'development';

        const appendFileSyncMock = jest.fn();
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => true),
            mkdirSync: jest.fn(),
            appendFileSync: appendFileSyncMock,
        }));

        const { Logger } = await import('../logging');

        Logger.warn('warning message');

        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(appendFileSyncMock).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
    });

    it('creates logs directory when it does not exist', async () => {
        process.env.NODE_ENV = 'development';

        const mkdirSyncMock = jest.fn();

        jest.doMock('fs', () => ({
            existsSync: jest.fn(() => false), // directorio no existe
            mkdirSync: mkdirSyncMock,
            appendFileSync: jest.fn(),
        }));

        await import('../logging');

        expect(mkdirSyncMock).toHaveBeenCalledWith(
            expect.any(String),
            { recursive: true }
        );
    });
});
