/**
 * Smoke Tests para LoginPage
 * Verifica que el componente se pueda importar sin errores
 */
import { describe, it, expect } from '@jest/globals';

describe('LoginPage - Smoke Tests', () => {
  it('debería exportar el módulo LoginPage', async () => {
    const module = await import('../LoginPage');
    expect(module).toBeDefined();
  });

  it('debería exportar el componente LoginPage', async () => {
    const module = await import('../LoginPage');
    expect(module.LoginPage || module.default).toBeDefined();
  });

  it('debería ser una función componente', async () => {
    const module = await import('../LoginPage');
    const Component = module.LoginPage || module.default;
    expect(typeof Component).toBe('function');
  });
});
