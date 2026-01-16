import { describe, it, expect } from '@jest/globals';

describe('UserForm - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../UserForm.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../UserForm.tsx');
    const exportName = module.UserForm || module.default;
    expect(exportName).toBeDefined();
  });
});
