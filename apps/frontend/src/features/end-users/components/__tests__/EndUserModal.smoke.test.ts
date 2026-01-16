import { describe, it, expect } from '@jest/globals';

describe('EndUserModal - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../EndUserModal.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../EndUserModal.tsx');
    const exportName = module.EndUserModal || module.default;
    expect(exportName).toBeDefined();
  });
});
