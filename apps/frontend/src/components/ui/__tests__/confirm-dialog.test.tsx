import { describe, it, expect } from '@jest/globals';

describe('ConfirmDialog (smoke)', () => {
  it('importa ConfirmProvider sin errores', async () => {
    const module = await import('../confirm-dialog');
    // El archivo expone el provider de confirmación (no un componente ConfirmDialog directo).
    expect(module.ConfirmProvider).toBeDefined();
  });
});

