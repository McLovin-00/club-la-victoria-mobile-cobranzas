import { describe, it, expect } from '@jest/globals';

describe('RemitosPage - Smoke Test', () => {
  it('importa el módulo sin errores', async () => {
    const module = await import('../RemitosPage.tsx');
    expect(module).toBeDefined();
  });

  it('exporta el componente/slice', async () => {
    const module = await import('../RemitosPage.tsx');
    const exportName = module.RemitosPage || module.default;
    expect(exportName).toBeDefined();
  });
});
