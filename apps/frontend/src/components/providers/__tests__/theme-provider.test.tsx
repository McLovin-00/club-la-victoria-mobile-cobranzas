import { describe, it, expect } from '@jest/globals';

describe('ThemeProvider (smoke)', () => {
  it('importa ThemeProvider sin errores', async () => {
    const module = await import('../theme-provider');
    expect(module.ThemeProvider).toBeDefined();
  });
});

