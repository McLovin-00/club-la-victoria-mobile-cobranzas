/// <reference types="jest" />
/**
 * Smoke tests para lib del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Lib - Smoke Tests', () => {
  it('should import utils without errors', async () => {
    await expect(import('../utils')).resolves.toBeDefined();
  });

  it('should import api without errors', async () => {
    await expect(import('../api')).resolves.toBeDefined();
  });

  it('should import runtimeEnv without errors', async () => {
    await expect(import('../runtimeEnv')).resolves.toBeDefined();
  });
});

