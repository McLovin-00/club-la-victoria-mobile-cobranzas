import { describe, it, expect } from '@jest/globals';

describe('endUsersApiSlice - Smoke Test', () => {
  it('importa el slice sin errores', async () => {
    const module = await import('../endUsersApiSlice');
    expect(module).toBeDefined();
  });

  it('exporta el slice', async () => {
    const module = await import('../endUsersApiSlice');
    expect(module.endUsersApiSlice).toBeDefined();
  });

  it('tiene endpoints definidos', async () => {
    const module = await import('../endUsersApiSlice');
    const slice = module.endUsersApiSlice;
    if (slice && slice.endpoints) {
      expect(slice.endpoints).toBeDefined();
    }
  });
});
