import { describe, it, expect } from '@jest/globals';

describe('UserModal (smoke)', () => {
  it('importa UserModal sin errores', async () => {
    const module = await import('../UserModal');
    expect(module.default || module.UserModal).toBeDefined();
  });
});

