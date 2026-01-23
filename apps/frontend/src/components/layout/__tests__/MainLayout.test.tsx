/**
 * Smoke Tests para MainLayout
 * Verifica que el componente se pueda importar sin errores
 */
import { describe, it, expect } from '@jest/globals';

describe('MainLayout - Smoke Tests', () => {
  it('debería exportar el módulo MainLayout', async () => {
    const module = await import('../MainLayout');
    expect(module).toBeDefined();
  });

  it('debería exportar el componente MainLayout', async () => {
    const module = await import('../MainLayout');
    expect(module.MainLayout || module.default).toBeDefined();
  });

  it('debería ser una función componente', async () => {
    const module = await import('../MainLayout');
    const Component = module.MainLayout || module.default;
    expect(typeof Component).toBe('function');
  });
});
