/**
 * Tests for routerTestUtils.ts
 */

import { describe, it, expect } from '@jest/globals';

describe('routerTestUtils (smoke)', () => {
  it('importa routerTestUtils sin errores', async () => {
    const module = await import('../helpers/routerTestUtils');
    expect(module).toBeDefined();
  });
});

