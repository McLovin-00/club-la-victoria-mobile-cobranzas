/**
 * Tests for remitos types/index.ts
 */

import { describe, it, expect } from '@jest/globals';

describe('remitos types index', () => {
  it('importa types/index sin errores', async () => {
    const module = await import('../../src/types/index');
    expect(module).toBeDefined();
  });
});

