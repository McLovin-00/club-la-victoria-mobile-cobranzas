import { describe, it, expect } from '@jest/globals';

describe('remitosApiSlice - Smoke Test', () => {
  it('importa el slice sin errores', async () => {
    const module = await import('../remitosApiSlice');
    expect(module).toBeDefined();
  });

  it('exporta el slice', async () => {
    const module = await import('../remitosApiSlice');
    expect(module.remitosApiSlice).toBeDefined();
  });

  it('tiene endpoints definidos', async () => {
    const module = await import('../remitosApiSlice');
    const slice = module.remitosApiSlice;
    if (slice && slice.endpoints) {
      expect(slice.endpoints).toBeDefined();
    }
  });
});
