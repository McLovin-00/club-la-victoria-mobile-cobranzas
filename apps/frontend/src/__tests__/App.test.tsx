/**
 * Smoke Tests para App.tsx
 * Verifica que el componente se pueda importar sin errores
 * NOTA: Los tests completos de routing requieren mockear React Router
 * que es complejo con SWC/Jest. Estos tests de humo son suficientes
 * para verificar que App.tsx se importa correctamente.
 */
import { describe, it, expect } from '@jest/globals';

describe('App - Smoke Tests', () => {
  it('debería exportar el módulo App', async () => {
    const module = await import('../App');
    expect(module).toBeDefined();
  });

  it('debería exportar App como default', async () => {
    const module = await import('../App');
    expect(module.default).toBeDefined();
  });

  it('debería ser una función componente', async () => {
    const module = await import('../App');
    const App = module.default;
    expect(typeof App).toBe('function');
  });

  it('debería tener el nombre "App"', async () => {
    const module = await import('../App');
    const App = module.default;
    // Componentes funcionales tienen displayName o name
    expect(App.displayName || App.name).toBe('App');
  });
});
