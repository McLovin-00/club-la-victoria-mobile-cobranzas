/// <reference types="jest" />
/**
 * Smoke tests para contexts del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Contexts - Smoke Tests', () => {
  it('should import confirmContext without errors', async () => {
    await expect(import('../confirmContext')).resolves.toBeDefined();
  });

  it('should import toastContext without errors', async () => {
    await expect(import('../toastContext')).resolves.toBeDefined();
  });
});

