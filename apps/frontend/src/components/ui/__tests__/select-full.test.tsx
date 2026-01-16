import { describe, it, expect } from '@jest/globals';

describe('SelectFull (smoke)', () => {
  it('importa exports de Select sin errores', async () => {
    const module = await import('../select-full');
    // El archivo exporta primitives (Select, SelectTrigger, etc.)
    expect(module.Select).toBeDefined();
    expect(module.SelectTrigger).toBeDefined();
    expect(module.SelectContent).toBeDefined();
  });
});

