import { describe, it, expect } from '@jest/globals';

describe('Equipos Components (smoke)', () => {
  it('importa DocumentoField sin errores', async () => {
    await expect(import('../DocumentoField')).resolves.toBeDefined();
  });

  it('importa SeccionDocumentos sin errores', async () => {
    await expect(import('../SeccionDocumentos')).resolves.toBeDefined();
  });
});
