/**
 * Smoke Tests para Sidebar
 * Verifica que el componente se pueda importar sin errores
 */
import { describe, it, expect } from '@jest/globals';

describe('Sidebar - Smoke Tests', () => {
  it('debería exportar el módulo', async () => {
    const module = await import('../Sidebar');
    expect(module).toBeDefined();
  });

  it('debería exportar el componente', async () => {
    const module = await import('../Sidebar');
    expect(module.default || module[Object.keys(module).find(k => k.includes(componentName) || k === 'default')]).toBeDefined();
  });
});
