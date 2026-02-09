import { describe, it, expect } from '@jest/globals';

describe('EstadoEquipoPage (smoke)', () => {
  it('importa EstadoEquipoPage sin errores', async () => {
    const module = await import('../EstadoEquipoPage');
    expect(module.default || module.EstadoEquipoPage).toBeDefined();
  });
});

