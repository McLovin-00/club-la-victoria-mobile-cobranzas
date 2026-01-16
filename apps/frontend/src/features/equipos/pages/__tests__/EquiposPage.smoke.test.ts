import { describe, it, expect } from '@jest/globals';

describe('EquiposPage - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EquiposPage.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EquiposPage.tsx');
    const exportName = module.EquiposPage || module.default;
    expect(exportName).toBeDefined();
  });
});
