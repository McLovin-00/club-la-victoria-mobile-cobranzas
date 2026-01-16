import { describe, it, expect } from '@jest/globals';

describe('DocumentPreview (smoke)', () => {
  it('importa DocumentPreview sin errores', async () => {
    const module = await import('../DocumentPreview');
    expect(module.default || module.DocumentPreview).toBeDefined();
  });
});

