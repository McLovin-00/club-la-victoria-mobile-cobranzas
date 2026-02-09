/// <reference types="jest" />
/**
 * Smoke tests para componentes UI del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('UI Components - Smoke Tests', () => {
  it('should import button component without errors', async () => {
    await expect(import('../ui/button')).resolves.toBeDefined();
  });

  it('should import badge component without errors', async () => {
    await expect(import('../ui/badge')).resolves.toBeDefined();
  });

  it('should import card component without errors', async () => {
    await expect(import('../ui/card')).resolves.toBeDefined();
  });

  it('should import input component without errors', async () => {
    await expect(import('../ui/input')).resolves.toBeDefined();
  });

  it('should import label component without errors', async () => {
    await expect(import('../ui/label')).resolves.toBeDefined();
  });

  it('should import dialog component without errors', async () => {
    await expect(import('../ui/dialog')).resolves.toBeDefined();
  });

  it('should import toast component without errors', async () => {
    await expect(import('../ui/Toast')).resolves.toBeDefined();
  });

  it('should import select component without errors', async () => {
    await expect(import('../ui/select')).resolves.toBeDefined();
  });

  it('should import table component without errors', async () => {
    await expect(import('../ui/table')).resolves.toBeDefined();
  });

  it('should import tabs component without errors', async () => {
    await expect(import('../ui/tabs')).resolves.toBeDefined();
  });
});

