/**
 * Tests reales para environment.ts
 * @jest-environment node
 */

describe('environment', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.REMITOS_PORT;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.DOCUMENTOS_DATABASE_URL;
    delete process.env.ENABLE_REMITOS;
  });

  it('getEnvironment returns defaults', async () => {
    const envMod = await import('../../src/config/environment');
    const env = envMod.getEnvironment();
    expect(env.REMITOS_PORT).toBe(4803);
    expect(env.REDIS_PORT).toBe(6379);
  });

  it('isServiceEnabled respects ENABLE_REMITOS', async () => {
    process.env.ENABLE_REMITOS = 'false';
    const envMod = await import('../../src/config/environment');
    expect(envMod.isServiceEnabled()).toBe(false);
  });
});


