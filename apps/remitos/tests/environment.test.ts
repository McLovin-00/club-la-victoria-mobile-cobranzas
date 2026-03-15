/**
 * Tests unitarios para src/config/environment.ts
 * Cobertura de getEnvironment() e isServiceEnabled()
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('src/config/environment.ts - getEnvironment()', () => {
  const originalEnv: NodeJS.ProcessEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.REMITOS_PORT;
    delete process.env.REMITOS_DATABASE_URL;
    delete process.env.DOCUMENTOS_DATABASE_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_PORT;
    delete process.env.MINIO_ACCESS_KEY;
    delete process.env.MINIO_SECRET_KEY;
    delete process.env.MINIO_USE_SSL;
    delete process.env.MINIO_REGION;
    delete process.env.MINIO_BUCKET_PREFIX;
    delete process.env.FRONTEND_URLS;
    delete process.env.FRONTEND_URL;
    delete process.env.DEFAULT_TENANT_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('U20: getEnvironment_returnsCachedEnv', async () => {
    const { getEnvironment } = await import('../src/config/environment');
    const env1 = getEnvironment();
    const env2 = getEnvironment();
    expect(env1).toBe(env2);
  });

  it('U21a: environment_fallbacks_workCorrectly_development', async () => {
    process.env.NODE_ENV = 'development';
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.NODE_ENV).toBe('development');
    expect(env.REMITOS_PORT).toBe(4803);
    expect(env.REMITOS_DATABASE_URL).toBe('postgresql://localhost:5432/monorepo-bca?schema=remitos');
  });

  it('U21b: environment_fallbacks_workCorrectly_production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REMITOS_PORT = '9000';
    process.env.REDIS_HOST = 'redis-server';
    process.env.REDIS_PORT = '6380';
    process.env.MINIO_ENDPOINT = 'minio.example.com';
    process.env.MINIO_PORT = '443';
    process.env.MINIO_USE_SSL = 'true';
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.NODE_ENV).toBe('production');
    expect(env.REMITOS_PORT).toBe(9000);
    expect(env.REDIS_HOST).toBe('redis-server');
    expect(env.REDIS_PORT).toBe(6380);
    expect(env.MINIO_ENDPOINT).toBe('minio.example.com');
    expect(env.MINIO_PORT).toBe(443);
    expect(env.MINIO_USE_SSL).toBe(true);
  });

  it('U21c: environment_fallbacks_databaseUrl', async () => {
    process.env.DOCUMENTOS_DATABASE_URL = 'postgresql://host:5432/db?schema=documentos';
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.REMITOS_DATABASE_URL).toBe('postgresql://host:5432/db?schema=remitos');
  });

  it('U21d: environment_fallbacks_redisHost', async () => {
    process.env.REDIS_HOST = 'redis';
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.REDIS_HOST).toBe('localhost');
  });

  it('U21e: environment_fallbacks_minioSsl', async () => {
    process.env.MINIO_USE_SSL = 'false';
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.MINIO_USE_SSL).toBe(false);
  });

  it('U21f: environment_fallbacks_frontendUrls', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.FRONTEND_URLS).toBe('http://localhost:3000');
  });

  it('U21g: environment_fallbacks_defaultTenantId', async () => {
    process.env.DEFAULT_TENANT_ID = '42';
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.DEFAULT_TENANT_ID).toBe(42);
  });

  it('environment_usesMinioDefaults', async () => {
    const { getEnvironment } = await import('../src/config/environment');
    const env = getEnvironment();
    expect(env.MINIO_ACCESS_KEY).toBe('');
    expect(env.MINIO_SECRET_KEY).toBe('');
    expect(env.MINIO_REGION).toBe('us-east-1');
    expect(env.MINIO_BUCKET_PREFIX).toBe('remitos-empresa');
  });
});

describe('src/config/environment.ts - isServiceEnabled()', () => {
  const originalEnv: NodeJS.ProcessEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('U22: isServiceEnabled_defaultTrue', async () => {
    delete process.env.ENABLE_REMITOS;
    const { isServiceEnabled } = await import('../src/config/environment');
    expect(isServiceEnabled()).toBe(true);
  });

  it('U23a: isServiceEnabled_explicitFalse', async () => {
    process.env.ENABLE_REMITOS = 'false';
    const { isServiceEnabled } = await import('../src/config/environment');
    expect(isServiceEnabled()).toBe(false);
  });

  it('U23b: isServiceEnabled_explicitTrue', async () => {
    process.env.ENABLE_REMITOS = 'true';
    const { isServiceEnabled } = await import('../src/config/environment');
    expect(isServiceEnabled()).toBe(true);
  });

  it('isServiceEnabled_anyNonFalseValue_isTrue', async () => {
    process.env.ENABLE_REMITOS = 'yes';
    const { isServiceEnabled } = await import('../src/config/environment');
    expect(isServiceEnabled()).toBe(true);
  });
});
