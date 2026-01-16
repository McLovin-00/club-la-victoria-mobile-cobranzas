import { describe, it, expect } from '@jest/globals';

describe('UserModal - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../UserModal.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../UserModal.tsx');
    const exportName = module.UserModal || module.default;
    expect(exportName).toBeDefined();
  });
});
