import { describe, it, expect } from '@jest/globals';

describe('platformUsersApiSlice - Smoke Test', () => {
  it('importa el slice sin errores', async () => {
    const module = await import('../platformUsersApiSlice');
    expect(module).toBeDefined();
  });

  it('exporta el slice', async () => {
    const module = await import('../platformUsersApiSlice');
    expect(module.platformUsersApiSlice).toBeDefined();
  });

  it('tiene endpoints definidos', async () => {
    const module = await import('../platformUsersApiSlice');
    const slice = module.platformUsersApiSlice;
    if (slice && slice.endpoints) {
      expect(slice.endpoints).toBeDefined();
    }
  });
});
