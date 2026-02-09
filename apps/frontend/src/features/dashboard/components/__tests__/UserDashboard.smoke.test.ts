import { describe, it, expect } from '@jest/globals';

describe('UserDashboard - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../UserDashboard.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../UserDashboard.tsx');
    const exportName = module.UserDashboard || module.default;
    expect(exportName).toBeDefined();
  });
});
