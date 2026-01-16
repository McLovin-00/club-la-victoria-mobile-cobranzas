import { describe, it, expect } from '@jest/globals';

describe('EmpresasPage.lazy (smoke)', () => {
  it('importa EmpresasPage.lazy sin errores', async () => {
    const module = await import('../EmpresasPage.lazy');
    expect(module.default || module.EmpresasPage).toBeDefined();
  });
});

