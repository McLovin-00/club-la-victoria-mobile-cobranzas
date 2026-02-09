import { describe, it, expect } from '@jest/globals';

describe('UserForm (smoke)', () => {
  it('importa UserForm sin errores', async () => {
    const module = await import('../UserForm');
    expect(module.default || module.UserForm).toBeDefined();
  });
});

