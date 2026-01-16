import { describe, it, expect } from '@jest/globals';

describe('RegisterUserModal (smoke)', () => {
  it('importa RegisterUserModal sin errores', async () => {
    const module = await import('../RegisterUserModal');
    expect(module.default || module.RegisterUserModal).toBeDefined();
  });
});
