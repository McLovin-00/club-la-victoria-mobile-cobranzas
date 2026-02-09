import { describe, it, expect } from '@jest/globals';

describe('EndUsersPage.lazy (smoke)', () => {
  it('importa EndUsersPage.lazy sin errores', async () => {
    const module = await import('../EndUsersPage.lazy');
    expect(module.default || module.EndUsersPage).toBeDefined();
  });
});

