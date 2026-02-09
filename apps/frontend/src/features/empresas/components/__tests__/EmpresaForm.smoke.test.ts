import { describe, it, expect } from '@jest/globals';

describe('EmpresaForm - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EmpresaForm.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EmpresaForm.tsx');
    const exportName = module.EmpresaForm || module.default;
    expect(exportName).toBeDefined();
  });
});
