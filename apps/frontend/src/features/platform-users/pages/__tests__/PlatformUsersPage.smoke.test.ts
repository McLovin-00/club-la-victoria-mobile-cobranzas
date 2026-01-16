import { describe, it, expect } from '@jest/globals';

describe('PlatformUsersPage - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../PlatformUsersPage.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../PlatformUsersPage.tsx');
    const exportName = module.PlatformUsersPage || module.default;
    expect(exportName).toBeDefined();
  });
});
