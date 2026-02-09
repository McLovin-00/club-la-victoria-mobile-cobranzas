import { describe, it, expect } from '@jest/globals';

describe('DadorDashboard - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../DadorDashboard.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../DadorDashboard.tsx');
    const exportName = module.DadorDashboard || module.default;
    expect(exportName).toBeDefined();
  });
});
