/**
 * Smoke Tests para TransportistasPortalPage
 * Verifica que el componente se pueda importar sin errores
 */
import { describe, it, expect } from '@jest/globals';

describe('TransportistasPortalPage - Smoke Tests', () => {
  it('debería exportar el módulo', async () => {
    const module = await import('../TransportistasPortalPage');
    expect(module).toBeDefined();
  });

  it('debería exportar el componente', async () => {
    const module = await import('../TransportistasPortalPage');
    expect(module.default || module[Object.keys(module).find(k => k.includes(componentName) || k === 'default')]).toBeDefined();
  });
});
