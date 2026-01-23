/**
 * Smoke Tests para PullToRefresh
 * Verifica que el componente se pueda importar sin errores
 */
import { describe, it, expect } from '@jest/globals';

describe('PullToRefresh - Smoke Tests', () => {
  it('debería exportar el módulo', async () => {
    const module = await import('../PullToRefresh');
    expect(module).toBeDefined();
  });

  it('debería exportar el componente', async () => {
    const module = await import('../PullToRefresh');
    expect(module.default || module[Object.keys(module).find(k => k.includes(componentName) || k === 'default')]).toBeDefined();
  });
});
