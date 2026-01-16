import { describe, it, expect } from '@jest/globals';

describe('EndUsersPage - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EndUsersPage.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EndUsersPage.tsx');
    const exportName = module.EndUsersPage || module.default;
    expect(exportName).toBeDefined();
  });
});
