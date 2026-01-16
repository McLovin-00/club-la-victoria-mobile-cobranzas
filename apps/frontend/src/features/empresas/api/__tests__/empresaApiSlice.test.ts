import { describe, it, expect } from '@jest/globals';

describe('empresaApiSlice (smoke)', () => {
  it('importa empresaApiSlice sin errores', async () => {
    const module = await import('../empresaApiSlice');
    expect(module.empresaApiSlice).toBeDefined();
  });
});

