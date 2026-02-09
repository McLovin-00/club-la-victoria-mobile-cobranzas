import { describe, it, expect } from '@jest/globals';

describe('mockApiResponses (smoke)', () => {
  it('importa mockApiResponses sin errores', async () => {
    const module = await import('../mockApiResponses');
    expect(module).toBeDefined();
  });
});

