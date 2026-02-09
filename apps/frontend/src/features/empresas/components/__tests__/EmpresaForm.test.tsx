import { describe, it, expect } from '@jest/globals';

describe('EmpresaForm (smoke)', () => {
  it('importa EmpresaForm sin errores', async () => {
    const module = await import('../EmpresaForm');
    expect(module.default || module.EmpresaForm).toBeDefined();
  });
});

