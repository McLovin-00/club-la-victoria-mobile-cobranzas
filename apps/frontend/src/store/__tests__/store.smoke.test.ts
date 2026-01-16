/// <reference types="jest" />
/**
 * Smoke tests para store del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Store - Smoke Tests', () => {
  it('should import store without errors', async () => {
    await expect(import('../store')).resolves.toBeDefined();
  });

  it('should import apiSlice without errors', async () => {
    await expect(import('../apiSlice')).resolves.toBeDefined();
  });
});

