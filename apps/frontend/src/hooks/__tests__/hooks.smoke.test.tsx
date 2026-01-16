/// <reference types="jest" />
/**
 * Smoke tests para hooks del frontend
 */

import { describe, it, expect } from '@jest/globals';

describe('Frontend Hooks - Smoke Tests', () => {
  it('should import useToast hook without errors', async () => {
    await expect(import('../../components/ui/useToast')).resolves.toBeDefined();
  });
});

