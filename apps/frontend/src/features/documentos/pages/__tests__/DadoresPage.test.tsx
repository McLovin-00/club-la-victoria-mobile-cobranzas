import { describe, it, expect } from '@jest/globals';

describe('DadoresPage (smoke)', () => {
  it('importa DadoresPage sin errores', async () => {
    const module = await import('../DadoresPage');
    expect(module.default || module.DadoresPage).toBeDefined();
  });
});

