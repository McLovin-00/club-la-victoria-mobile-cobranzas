import { describe, it, expect } from '@jest/globals';

describe('endUsersApiSlice (smoke)', () => {
  it('importa endUsersApiSlice sin errores', async () => {
    const module = await import('../endUsersApiSlice');
    expect(module.endUsersApiSlice).toBeDefined();
  });
});

