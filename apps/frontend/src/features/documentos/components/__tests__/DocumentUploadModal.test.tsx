import { describe, it, expect } from '@jest/globals';

describe('DocumentUploadModal (smoke)', () => {
  it('importa DocumentUploadModal sin errores', async () => {
    const module = await import('../DocumentUploadModal');
    expect(module.default || module.DocumentUploadModal).toBeDefined();
  });
});
