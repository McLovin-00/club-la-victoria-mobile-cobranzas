import { describe, it, expect } from '@jest/globals';

describe('PlatformUsersPage.lazy (smoke)', () => {
  it('importa PlatformUsersPage.lazy sin errores', async () => {
    const module = await import('../PlatformUsersPage.lazy');
    expect(module.default || module.PlatformUsersPage).toBeDefined();
  });
});

