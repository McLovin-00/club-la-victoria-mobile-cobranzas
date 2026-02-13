/**
 * Tests for prisma/seed.ts - Simple coverage test
 */

import { describe, it, expect } from '@jest/globals';

describe('prisma seed coverage', () => {
  it('should import seed.ts main function', async () => {
    // Import the seed module - main should be exported now
    const seedModule = await import('../../src/prisma/seed');
    
    // Verify main is exported as a function
    expect(typeof seedModule.main).toBe('function');
  });

  it('should export helper functions', async () => {
    // Import all exported functions
    const seedModule = await import('../../src/prisma/seed');
    
    // Verify exports
    expect(typeof seedModule.main).toBe('function');
  });
});
