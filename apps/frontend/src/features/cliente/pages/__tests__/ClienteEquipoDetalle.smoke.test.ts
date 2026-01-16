import { describe, it, expect } from '@jest/globals';

describe('ClienteEquipoDetalle - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../ClienteEquipoDetalle.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../ClienteEquipoDetalle.tsx');
    const exportName = module.ClienteEquipoDetalle || module.default;
    expect(exportName).toBeDefined();
  });
});
