/// <reference types="jest" />
/**
 * Smoke tests para feature remitos del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Remitos Feature - Smoke Tests', () => {
  it('should import remitos api slice without errors', async () => {
    await expect(import('../api/remitosApiSlice')).resolves.toBeDefined();
  });

  it('should export remitos api slice', async () => {
    const remitosApi = await import('../api/remitosApiSlice');
    expect(remitosApi).toBeDefined();
  });
});

