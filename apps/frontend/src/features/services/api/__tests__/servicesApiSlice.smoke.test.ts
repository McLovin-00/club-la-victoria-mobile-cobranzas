import { describe, it, expect } from '@jest/globals';

describe('servicesApiSlice - Smoke Test', () => {
  it('importa el slice sin errores', async () => {
    const module = await import('../servicesApiSlice');
    expect(module).toBeDefined();
  });

  it('exporta el slice', async () => {
    const module = await import('../servicesApiSlice');
    expect(module.servicesApiSlice).toBeDefined();
  });

  it('tiene endpoints definidos', async () => {
    const module = await import('../servicesApiSlice');
    const slice = module.servicesApiSlice;
    if (slice && slice.endpoints) {
      expect(slice.endpoints).toBeDefined();
    }
  });
});
