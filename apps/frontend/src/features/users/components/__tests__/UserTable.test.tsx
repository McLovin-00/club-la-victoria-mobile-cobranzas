import { describe, it, expect } from '@jest/globals';

describe('UserTable (smoke)', () => {
  it('importa UserTable sin errores', async () => {
    const module = await import('../UserTable');
    expect(module.default || module.UserTable).toBeDefined();
  });
});
