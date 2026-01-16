import { describe, it, expect } from '@jest/globals';

describe('AdminDashboard - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../AdminDashboard.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../AdminDashboard.tsx');
    const exportName = module.AdminDashboard || module.default;
    expect(exportName).toBeDefined();
  });
});
