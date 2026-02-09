import { describe, it, expect } from '@jest/globals';

describe('EditarEquipoPage (smoke)', () => {
  it('importa EditarEquipoPage sin errores', async () => {
    const module = await import('../EditarEquipoPage');
    expect(module.default || module.EditarEquipoPage).toBeDefined();
  });
});

