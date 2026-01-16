import { describe, it, expect } from '@jest/globals';

describe('ChoferDashboard - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../ChoferDashboard.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../ChoferDashboard.tsx');
    const exportName = module.ChoferDashboard || module.default;
    expect(exportName).toBeDefined();
  });
});
