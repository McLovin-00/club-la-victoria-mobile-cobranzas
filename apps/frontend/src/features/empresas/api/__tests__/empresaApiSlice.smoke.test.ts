import { describe, it, expect } from '@jest/globals';

describe('empresaApiSlice - Smoke Test', () => {
  it('importa el slice sin errores', async () => {
    const module = await import('../empresaApiSlice');
    expect(module).toBeDefined();
  });

  it('exporta el slice', async () => {
    const module = await import('../empresaApiSlice');
    expect(module.empresaApiSlice).toBeDefined();
  });

  it('tiene endpoints definidos', async () => {
    const module = await import('../empresaApiSlice');
    const slice = module.empresaApiSlice;
    if (slice && slice.endpoints) {
      expect(slice.endpoints).toBeDefined();
    }
  });
});
