import { describe, it, expect } from '@jest/globals';

describe('EmpresaModal - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EmpresaModal.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EmpresaModal.tsx');
    const exportName = module.EmpresaModal || module.default;
    expect(exportName).toBeDefined();
  });
});
