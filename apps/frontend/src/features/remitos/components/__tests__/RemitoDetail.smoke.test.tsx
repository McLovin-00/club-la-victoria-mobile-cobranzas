import { describe, it, expect } from '@jest/globals';

describe('RemitoDetail (smoke)', () => {
  it('importa RemitoDetail sin errores', async () => {
    const module = await import('../RemitoDetail');
    expect(module.default || module.RemitoDetail).toBeDefined();
  });
});

