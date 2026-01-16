/**
 * Propósito: Smoke test del router `equipos.routes` para subir coverage.
 * Importa el router y valida que registre rutas (sin ejecutar handlers).
 */

import router from '../../src/routes/equipos.routes';

describe('equipos.routes (smoke)', () => {
  it('exporta un router con stack de rutas', () => {
    // Express Router expone `stack` internamente.
    const anyRouter = router as any;
    expect(Array.isArray(anyRouter.stack)).toBe(true);
    expect(anyRouter.stack.length).toBeGreaterThan(0);
  });
});


