import { describe, it, expect } from '@jest/globals';

describe('EquiposPage (smoke)', () => {
  it('exporta el componente EquiposPage', async () => {
    const module = await import('../EquiposPage');
    expect(module.EquiposPage).toBeDefined();
    expect(typeof module.EquiposPage).toBe('function');
  });
});
