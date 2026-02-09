import { describe, it, expect } from '@jest/globals';

describe('DadoresPortalPage (smoke)', () => {
  it('importa DadoresPortalPage sin errores', async () => {
    const module = await import('../DadoresPortalPage');
    expect(module.default || module.DadoresPortalPage).toBeDefined();
  });
});

