/// <reference types="jest" />
/**
 * Smoke tests para services del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Services - Smoke Tests', () => {
  it('should import websocket service without errors', async () => {
    await expect(import('../websocket.service')).resolves.toBeDefined();
  });

  it('should export websocket service', async () => {
    const websocketService = await import('../websocket.service');
    expect(websocketService).toBeDefined();
  });
});

