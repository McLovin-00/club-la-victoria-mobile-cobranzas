import { describe, it, expect } from '@jest/globals';

describe('RemitosPage (smoke)', () => {
  it('importa RemitosPage sin errores', async () => {
    const module = await import('../RemitosPage');
    expect(module.default || module.RemitosPage).toBeDefined();
  });
});

