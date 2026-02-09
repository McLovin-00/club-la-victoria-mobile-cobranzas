/// <reference types="jest" />
/**
 * Smoke tests para feature platform-users del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Platform Users Feature - Smoke Tests', () => {
  it('should import platform users api slice without errors', async () => {
    await expect(import('../api/platformUsersApiSlice')).resolves.toBeDefined();
  });

  it('should export platform users api slice', async () => {
    const platformUsersApi = await import('../api/platformUsersApiSlice');
    expect(platformUsersApi).toBeDefined();
  });
});

