import { describe, it, expect } from '@jest/globals';

describe('PlatformUserTable - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../PlatformUserTable.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../PlatformUserTable.tsx');
    const exportName = module.PlatformUserTable || module.default;
    expect(exportName).toBeDefined();
  });
});
