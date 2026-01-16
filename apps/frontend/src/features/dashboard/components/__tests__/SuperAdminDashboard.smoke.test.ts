import { describe, it, expect } from '@jest/globals';

describe('SuperAdminDashboard - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../SuperAdminDashboard.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../SuperAdminDashboard.tsx');
    const exportName = module.SuperAdminDashboard || module.default;
    expect(exportName).toBeDefined();
  });
});
