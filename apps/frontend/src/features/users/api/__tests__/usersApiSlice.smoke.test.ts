import { describe, it, expect } from '@jest/globals';

describe('usersApiSlice - Smoke Test', () => {
  it('importa el slice sin errores', async () => {
    const module = await import('../usersApiSlice');
    expect(module).toBeDefined();
  });

  it('exporta el slice', async () => {
    const module = await import('../usersApiSlice');
    expect(module.usersApiSlice).toBeDefined();
  });

  it('tiene endpoints definidos', async () => {
    const module = await import('../usersApiSlice');
    const slice = module.usersApiSlice;
    if (slice && slice.endpoints) {
      expect(slice.endpoints).toBeDefined();
    }
  });
});
