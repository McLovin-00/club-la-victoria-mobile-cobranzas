/// <reference types="jest" />
/**
 * Smoke tests para constants del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Constants - Smoke Tests', () => {
  it('should import entityTypes without errors', async () => {
    await expect(import('../entityTypes')).resolves.toBeDefined();
  });

  it('should export entityTypes', async () => {
    const entityTypes = await import('../entityTypes');
    expect(entityTypes).toBeDefined();
  });
});

