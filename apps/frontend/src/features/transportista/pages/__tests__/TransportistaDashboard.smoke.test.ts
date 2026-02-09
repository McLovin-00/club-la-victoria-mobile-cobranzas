import { describe, it, expect } from '@jest/globals';

describe('TransportistaDashboard - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../TransportistaDashboard.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../TransportistaDashboard.tsx');
    const exportName = module.TransportistaDashboard || module.default;
    expect(exportName).toBeDefined();
  });
});
