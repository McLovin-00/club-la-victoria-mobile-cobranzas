/**
 * Tests for testUtils.ts
 */

import { describe, it, expect } from '@jest/globals';

describe('testUtils (smoke)', () => {
  it('importa testUtils sin errores', async () => {
    const module = await import('../helpers/testUtils');
    expect(module).toBeDefined();
  });
});

