import { describe, it, expect } from '@jest/globals';

describe('EditarEquipoPage (smoke)', () => {
  it('importa EditarEquipoPage sin errores', async () => {
    await expect(import('../EditarEquipoPage')).resolves.toBeDefined();
  });
});
