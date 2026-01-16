import { describe, it, expect } from '@jest/globals';

describe('UserTable - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../UserTable.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../UserTable.tsx');
    const exportName = module.UserTable || module.default;
    expect(exportName).toBeDefined();
  });
});
