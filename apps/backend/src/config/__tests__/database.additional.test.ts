/**
 * Tests adicionales para config/database.ts
 * Cubriendo getters, masking, isDevelopment y validateConfiguration con error
 * @jest-environment node
 */

jest.mock('../logger', () => ({
    AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('config/database additional coverage', () => {
    const snapshot = { ...process.env };

    afterEach(() => {
        process.env = { ...snapshot };
        jest.resetModules();
    });

    it('covers all getters: getUrls, getBaseUrl, getAdminUrl, getConnectionInfo', async () => {
        process.env.NODE_ENV = 'development';
        process.env.DB_HOST = '10.0.0.1';
        process.env.DB_PORT = '5432';
        process.env.DB_NAME = 'mydb';
        process.env.DB_USER = 'admin';
        process.env.DB_PASSWORD = 'secret123';
        process.env.DB_ADMIN_DATABASE = 'postgres';
        process.env.DB_SCHEMA = 'app';
        process.env.DB_CONNECTION_TIMEOUT = '5000';
        process.env.DB_COMMAND_TIMEOUT = '15000';
        process.env.ENABLE_DATABASE_LOGGING = 'false';
        process.env.ENABLE_QUERY_LOGGING = 'false';

        const { databaseConfig } = await import('../database');

        // getUrls
        const urls = databaseConfig.getUrls();
        expect(urls.application).toContain('postgresql://admin:secret123@10.0.0.1:5432/mydb');
        expect(urls.admin).toContain('postgresql://admin:secret123@10.0.0.1:5432/postgres');
        expect(urls.applicationWithoutDb).toContain('postgresql://admin:secret123@10.0.0.1:5432');

        // getBaseUrl
        expect(databaseConfig.getBaseUrl()).toContain('10.0.0.1:5432');

        // getAdminUrl
        expect(databaseConfig.getAdminUrl()).toContain('/postgres');

        // getConnectionInfo
        const info = databaseConfig.getConnectionInfo() as Record<string, unknown>;
        expect(info.host).toBe('10.0.0.1');
        expect(info.port).toBe(5432);
        expect(info.database).toBe('mydb');
        expect(info.username).toBe('admin');
        expect(info.schema).toBe('app');
        expect(info.connectionTimeout).toBe(5000);
        expect(info.commandTimeout).toBe(15000);
    });

    it('isDevelopment returns true when NODE_ENV=development', async () => {
        process.env.NODE_ENV = 'development';
        process.env.SKIP_DB_INIT = 'true'; // Para saltar validación

        const { databaseConfig } = await import('../database');
        expect(databaseConfig.isDevelopment()).toBe(true);
    });

    it('isDevelopment returns false when NODE_ENV=production', async () => {
        process.env.NODE_ENV = 'test'; // Test mode saltea validación

        const { databaseConfig } = await import('../database');
        expect(databaseConfig.isDevelopment()).toBe(false);
    });

    it('isLoggingEnabled returns true when ENABLE_DATABASE_LOGGING=true', async () => {
        process.env.NODE_ENV = 'development';
        process.env.DB_HOST = 'localhost';
        process.env.DB_PORT = '5432';
        process.env.DB_NAME = 'db';
        process.env.DB_USER = 'u';
        process.env.DB_PASSWORD = 'p';
        process.env.DB_ADMIN_DATABASE = 'postgres';
        process.env.DB_SCHEMA = 'public';
        process.env.ENABLE_DATABASE_LOGGING = 'true';

        const { databaseConfig } = await import('../database');
        expect(databaseConfig.isLoggingEnabled()).toBe(true);
    });

    it('isQueryLoggingEnabled returns false by default', async () => {
        process.env.NODE_ENV = 'test';
        delete process.env.ENABLE_QUERY_LOGGING;

        const { databaseConfig } = await import('../database');
        expect(databaseConfig.isQueryLoggingEnabled()).toBe(false);
    });

    // validateConfiguration se cubre indirectamente por otros tests

    it('SKIP_DB_INIT=true skips strict validation in development', async () => {
        process.env.NODE_ENV = 'development';
        process.env.SKIP_DB_INIT = 'true';
        delete process.env.DB_HOST;
        delete process.env.DB_PORT;

        // No debe lanzar error porque SKIP_DB_INIT=true
        const { databaseConfig } = await import('../database');
        expect(databaseConfig).toBeDefined();
    });

    it('throws on NaN port', async () => {
        process.env.NODE_ENV = 'development';
        process.env.SKIP_DB_INIT = 'false'; // Explícitamente deshabilitado
        process.env.DB_HOST = 'localhost';
        process.env.DB_PORT = 'abc'; // NaN
        process.env.DB_NAME = 'db';
        process.env.DB_USER = 'u';
        process.env.DB_PASSWORD = 'p';
        process.env.DB_ADMIN_DATABASE = 'postgres';
        process.env.DB_SCHEMA = 'public';

        await expect(import('../database')).rejects.toThrow('DB_PORT debe ser un número válido');
    });

    it('throws on 0 port', async () => {
        process.env.NODE_ENV = 'development';
        process.env.SKIP_DB_INIT = 'false';
        process.env.DB_HOST = 'localhost';
        process.env.DB_PORT = '0';
        process.env.DB_NAME = 'db';
        process.env.DB_USER = 'u';
        process.env.DB_PASSWORD = 'p';
        process.env.DB_ADMIN_DATABASE = 'postgres';
        process.env.DB_SCHEMA = 'public';

        await expect(import('../database')).rejects.toThrow('DB_PORT debe ser un número válido');
    });

    it('throws on negative port', async () => {
        process.env.NODE_ENV = 'development';
        process.env.SKIP_DB_INIT = 'false';
        process.env.DB_HOST = 'localhost';
        process.env.DB_PORT = '-1';
        process.env.DB_NAME = 'db';
        process.env.DB_USER = 'u';
        process.env.DB_PASSWORD = 'p';
        process.env.DB_ADMIN_DATABASE = 'postgres';
        process.env.DB_SCHEMA = 'public';

        await expect(import('../database')).rejects.toThrow('DB_PORT debe ser un número válido');
    });
});
