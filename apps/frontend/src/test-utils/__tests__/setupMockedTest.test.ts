/**
 * Tests para setupMockedTest.ts
 * Verifica que la constante de setup está exportada
 */
import { describe, it, expect } from '@jest/globals';

describe('setupMockedTest', () => {
  it('exporta MOCKED_TEST_SETUP como true', async () => {
    const module = await import('../setupMockedTest');
    expect(module.MOCKED_TEST_SETUP).toBe(true);
  });
});

