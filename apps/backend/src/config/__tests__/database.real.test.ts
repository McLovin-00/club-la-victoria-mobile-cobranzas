/**
 * Tests reales para config/database.ts (cubre validaciones y getters).
 * Nota: el módulo instancia un singleton al importarse, así que usamos resetModules.
 * @jest-environment node
 */

jest.mock('../logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('config/database (real)', () => {
  const snapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...snapshot };
    jest.resetModules();
  });

  it('skips strict validation in NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    const mod = await import('../database');
    expect(mod.databaseConfig.getApplicationUrl()).toContain('postgresql://');
    expect(mod.isDevelopmentWithoutDB()).toBe(false);
  });

  it('throws on missing required vars in development', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SKIP_DB_INIT;
    delete process.env.DB_HOST;
    await expect(import('../database')).rejects.toThrow('Variables de entorno requeridas faltantes');
  });

  it('throws on invalid port', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '99999';
    process.env.DB_NAME = 'db';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_ADMIN_DATABASE = 'postgres';
    process.env.DB_SCHEMA = 'public';
    await expect(import('../database')).rejects.toThrow('DB_PORT debe ser un número válido');
  });

  it('builds urls, sets env urls, validates configuration', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'db';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_ADMIN_DATABASE = 'postgres';
    process.env.DB_SCHEMA = 'public';
    process.env.DB_CONNECTION_TIMEOUT = '1000';
    process.env.DB_COMMAND_TIMEOUT = '2000';
    process.env.ENABLE_DATABASE_LOGGING = 'true';
    process.env.ENABLE_QUERY_LOGGING = 'true';

    const { databaseConfig, isDevelopmentWithoutDB } = await import('../database');
    expect(databaseConfig.getConfig().host).toBe('localhost');
    expect(databaseConfig.getApplicationUrl()).toContain('/db?schema=public');
    expect(process.env.DATABASE_URL).toContain('postgresql://');
    expect(isDevelopmentWithoutDB()).toBe(false);
    databaseConfig.validateConfiguration();
  });

  it('isDevelopmentWithoutDB true when NODE_ENV=development and SKIP_DB_INIT=true', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SKIP_DB_INIT = 'true';
    const { isDevelopmentWithoutDB } = await import('../database');
    expect(isDevelopmentWithoutDB()).toBe(true);
  });
});


