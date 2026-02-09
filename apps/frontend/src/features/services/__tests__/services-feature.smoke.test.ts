/// <reference types="jest" />
/**
 * Smoke tests para feature services del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Services Feature - Smoke Tests', () => {
  it('should import services api slice without errors', async () => {
    await expect(import('../api/servicesApiSlice')).resolves.toBeDefined();
  });

  it('should export services api slice', async () => {
    const servicesApi = await import('../api/servicesApiSlice');
    expect(servicesApi).toBeDefined();
  });
});

