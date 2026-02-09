/// <reference types="jest" />
/**
 * Smoke tests para providers del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Providers - Smoke Tests', () => {
  it('should import theme provider without errors', async () => {
    await expect(import('../providers/theme-provider')).resolves.toBeDefined();
  });

  it('should import theme provider utils without errors', async () => {
    await expect(import('../providers/theme-provider.utils')).resolves.toBeDefined();
  });
});

