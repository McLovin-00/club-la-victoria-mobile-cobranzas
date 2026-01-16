import { describe, it, expect } from '@jest/globals';

describe('UsersPage - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../UsersPage.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../UsersPage.tsx');
    const exportName = module.UsersPage || module.default;
    expect(exportName).toBeDefined();
  });
});
