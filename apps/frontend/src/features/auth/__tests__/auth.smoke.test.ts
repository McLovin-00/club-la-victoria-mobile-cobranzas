/// <reference types="jest" />
/**
 * Smoke tests para feature auth del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Auth Feature - Smoke Tests', () => {
  it('should import authSlice without errors', async () => {
    await expect(import('../authSlice')).resolves.toBeDefined();
  });

  it('should import authApiSlice without errors', async () => {
    await expect(import('../api/authApiSlice')).resolves.toBeDefined();
  });

  it('should export auth slice', async () => {
    const authSlice = await import('../authSlice');
    expect(authSlice).toBeDefined();
  });
});

