import { describe, it, expect } from '@jest/globals';

describe('EndUserTable - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EndUserTable.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EndUserTable.tsx');
    const exportName = module.EndUserTable || module.default;
    expect(exportName).toBeDefined();
  });
});
