import { describe, it, expect } from '@jest/globals';

describe('PlatformUserForm - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../PlatformUserForm.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../PlatformUserForm.tsx');
    const exportName = module.PlatformUserForm || module.default;
    expect(exportName).toBeDefined();
  });
});
