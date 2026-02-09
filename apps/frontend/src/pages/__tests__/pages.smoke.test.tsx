/// <reference types="jest" />
/**
 * Smoke tests para páginas del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Pages - Smoke Tests', () => {
  it('should import LoginPage without errors', async () => {
    await expect(import('../LoginPage')).resolves.toBeDefined();
  });

  it('should import DashboardPage without errors', async () => {
    await expect(import('../DashboardPage')).resolves.toBeDefined();
  });

  it('should import DadoresPortalPage without errors', async () => {
    await expect(import('../DadoresPortalPage')).resolves.toBeDefined();
  });

  it('should import TransportistasPortalPage without errors', async () => {
    await expect(import('../TransportistasPortalPage')).resolves.toBeDefined();
  });

  it('should import ClientePortalPage without errors', async () => {
    await expect(import('../ClientePortalPage')).resolves.toBeDefined();
  });

  it('should import UsuariosPage without errors', async () => {
    await expect(import('../UsuariosPage')).resolves.toBeDefined();
  });
});

