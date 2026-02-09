import { describe, it, expect } from '@jest/globals';

describe('AltaEquipoCompletaPage (smoke)', () => {
  it('importa AltaEquipoCompletaPage sin errores', async () => {
    const module = await import('../AltaEquipoCompletaPage');
    expect(module.default || module.AltaEquipoCompletaPage).toBeDefined();
  });
});

