import { describe, it, expect } from '@jest/globals';

describe('EditPlatformUserModal (smoke)', () => {
  it('importa EditPlatformUserModal sin errores', async () => {
    const module = await import('../EditPlatformUserModal');
    expect(module.default || module.EditPlatformUserModal).toBeDefined();
  });
});

