import { describe, it, expect } from '@jest/globals';

describe('CamionesPage (smoke)', () => {
  it('importa CamionesPage sin errores', async () => {
    const module = await import('../CamionesPage');
    expect(module.default || module.CamionesPage).toBeDefined();
  });
});

