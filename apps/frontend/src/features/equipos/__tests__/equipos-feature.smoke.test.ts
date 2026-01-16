/// <reference types="jest" />
/**
 * Smoke tests para feature equipos del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Equipos Feature - Smoke Tests', () => {
  it('should import feature pages/components without errors', async () => {
    await expect(import('../pages/AltaEquipoCompletaPage')).resolves.toBeDefined();
    await expect(import('../pages/EditarEquipoPage')).resolves.toBeDefined();
    await expect(import('../components/SeccionDocumentos')).resolves.toBeDefined();
  });
});

