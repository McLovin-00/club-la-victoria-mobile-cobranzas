import { describe, it, expect } from '@jest/globals';

describe('EmpresaTable - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EmpresaTable.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EmpresaTable.tsx');
    const exportName = module.EmpresaTable || module.default;
    expect(exportName).toBeDefined();
  });
});
