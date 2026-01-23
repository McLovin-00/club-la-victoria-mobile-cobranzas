/**
 * Smoke Tests para CalendarioInteligente
 * Verifica que el componente se pueda importar sin errores
 */
import { describe, it, expect } from '@jest/globals';

describe('CalendarioInteligente - Smoke Tests', () => {
  it('debería exportar el módulo', async () => {
    const module = await import('../CalendarioInteligente');
    expect(module).toBeDefined();
  });

  it('debería exportar el componente', async () => {
    const module = await import('../CalendarioInteligente');
    expect(module.default || module[Object.keys(module).find(k => k.includes(componentName) || k === 'default')]).toBeDefined();
  });
});
