/// <reference types="jest" />
/**
 * Smoke tests para utils del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Utils - Smoke Tests', () => {
  it('should import logger without errors', async () => {
    await expect(import('../logger')).resolves.toBeDefined();
  });

  it('should export logger utilities', async () => {
    const logger = await import('../logger');
    expect(logger).toBeDefined();
  });
});

