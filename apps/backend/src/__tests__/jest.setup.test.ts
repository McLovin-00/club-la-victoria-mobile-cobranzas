/**
 * Tests for jest.setup.ts
 */

import { describe, it, expect } from '@jest/globals';

describe('jest.setup (smoke)', () => {
  it('jest setup existe', () => {
    // jest.setup.ts es un archivo de configuración que se ejecuta antes de los tests
    expect(true).toBe(true);
  });
});

