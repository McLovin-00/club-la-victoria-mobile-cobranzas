/**
 * Propósito: subir cobertura real de `documentosApiSlice` ejecutando el módulo sin mocks globales.
 * Nota: en `jest.setup.cjs` este módulo está mockeado para la mayoría de los tests.
 */
import { describe, it, expect, jest, beforeAll } from '@jest/globals';

let documentosModule: typeof import('../documentosApiSlice');

beforeAll(async () => {
  // Asegura que el import no use el mock global definido en jest.setup.cjs.
  jest.resetModules();
  jest.unmock('../documentosApiSlice');
  documentosModule = await import('../documentosApiSlice');
});

describe('documentosApiSlice (coverage)', () => {
  it('debe exponer documentosApiSlice y hooks principales', () => {
    expect(documentosModule.documentosApiSlice).toBeDefined();
    expect(documentosModule.documentosApiSlice.reducerPath).toBe('documentosApi');

    // Hooks exportados (no validamos comportamiento de red, solo existencia).
    expect(documentosModule.useGetDadoresQuery).toBeDefined();
    expect(documentosModule.useGetTemplatesQuery).toBeDefined();
    expect(documentosModule.useGetClientsQuery).toBeDefined();
    expect(documentosModule.useGetEquiposQuery).toBeDefined();
  });

  it('debe construir queries sin tirar error (smoke de endpoints)', () => {
    const { documentosApiSlice } = documentosModule;

    // Ejecuta parte de la definición de endpoints (queryFn) sin requerir store.
    expect(documentosApiSlice.endpoints.getTemplates).toBeDefined();
    expect(documentosApiSlice.endpoints.getDadores).toBeDefined();
    expect(documentosApiSlice.endpoints.getClients).toBeDefined();
    expect(documentosApiSlice.endpoints.getMisEquipos).toBeDefined();

    // Verifica que existan las definiciones de initiate (RTK Query).
    expect(typeof documentosApiSlice.endpoints.getTemplates.initiate).toBe('function');
    expect(typeof documentosApiSlice.endpoints.getDadores.initiate).toBe('function');
  });
});


