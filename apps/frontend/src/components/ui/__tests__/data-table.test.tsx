import { describe, it, expect } from '@jest/globals';

describe('DataTable (smoke)', () => {
  it('importa DataTable sin errores', async () => {
    const module = await import('../data-table');
    expect(module.default || module.DataTable).toBeDefined();
  });
});

