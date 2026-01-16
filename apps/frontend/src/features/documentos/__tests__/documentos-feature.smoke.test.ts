/// <reference types="jest" />
/**
 * Smoke tests para feature documentos del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Documentos Feature - Smoke Tests', () => {
  it('should import documentosApiSlice without errors', async () => {
    await expect(import('../api/documentosApiSlice')).resolves.toBeDefined();
  });

  it('should export documentos api slice', async () => {
    const documentosApi = await import('../api/documentosApiSlice');
    expect(documentosApi).toBeDefined();
  });
});

