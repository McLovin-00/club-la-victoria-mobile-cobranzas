import { describe, it, expect } from '@jest/globals';

describe('documentosApiSlice (smoke)', () => {
  it('importa documentosApiSlice sin errores', async () => {
    const module = await import('../documentosApiSlice');
    expect(module.documentosApiSlice).toBeDefined();
    expect(module.documentosApiSlice.reducerPath).toBe('documentosApi');
  });

  it('exporta tipos e interfaces', async () => {
    const module = await import('../documentosApiSlice');
    // Verificar que el módulo tiene tipos definidos
    expect(module.documentosApiSlice.endpoints).toBeDefined();
  });
});
