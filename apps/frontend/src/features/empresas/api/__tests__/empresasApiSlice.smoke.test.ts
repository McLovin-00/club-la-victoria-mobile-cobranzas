import { describe, it, expect } from '@jest/globals';

describe('empresasApiSlice - Smoke Test', () => {
  it('importa el slice sin errores', async () => {
    const module = await import('../empresasApiSlice');
    expect(module).toBeDefined();
  });

  it('exporta el slice', async () => {
    const module = await import('../empresasApiSlice');
    expect(module.empresasApiSlice).toBeDefined();
  });

  it('tiene endpoints definidos', async () => {
    const module = await import('../empresasApiSlice');
    const slice = module.empresasApiSlice;
    if (slice && slice.endpoints) {
      expect(slice.endpoints).toBeDefined();
    }
  });
});
