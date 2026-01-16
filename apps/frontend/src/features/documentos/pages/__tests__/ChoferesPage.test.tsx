import { describe, it, expect } from '@jest/globals';

describe('ChoferesPage (smoke)', () => {
  it('importa ChoferesPage sin errores', async () => {
    const module = await import('../ChoferesPage');
    expect(module.default || module.ChoferesPage).toBeDefined();
  });
});

