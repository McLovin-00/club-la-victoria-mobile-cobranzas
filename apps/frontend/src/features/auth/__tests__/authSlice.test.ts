import { describe, it, expect } from '@jest/globals';

describe('authSlice (smoke)', () => {
  it('importa authSlice sin errores', async () => {
    await expect(import('../authSlice')).resolves.toBeDefined();
  });

  it('exporta el reducer por defecto', async () => {
    const module = await import('../authSlice');
    expect(module.default).toBeDefined();
  });

  it('exporta acciones básicas', async () => {
    const module = await import('../authSlice');
    expect(module.setCredentials).toBeDefined();
    expect(module.logout).toBeDefined();
  });

  it('exporta selectores', async () => {
    const module = await import('../authSlice');
    expect(module.selectCurrentUser).toBeDefined();
    expect(module.selectCurrentToken).toBeDefined();
  });
});
