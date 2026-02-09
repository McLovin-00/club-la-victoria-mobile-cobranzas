import { describe, it, expect } from '@jest/globals';

describe('EmpresasPage - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EmpresasPage.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EmpresasPage.tsx');
    const exportName = module.EmpresasPage || module.default;
    expect(exportName).toBeDefined();
  });
});
