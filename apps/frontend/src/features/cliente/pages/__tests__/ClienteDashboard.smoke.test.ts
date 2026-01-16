import { describe, it, expect } from '@jest/globals';

describe('ClienteDashboard - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../ClienteDashboard.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../ClienteDashboard.tsx');
    const exportName = module.ClienteDashboard || module.default;
    expect(exportName).toBeDefined();
  });
});
