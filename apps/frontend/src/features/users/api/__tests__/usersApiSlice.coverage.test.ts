/**
 * Propósito: subir cobertura real de `usersApiSlice` ejecutando el módulo sin mocks globales.
 * Nota: en `jest.setup.cjs` este módulo está mockeado para evitar IO real.
 */
import { describe, it, expect, jest, beforeAll } from '@jest/globals';

let usersModule: typeof import('../usersApiSlice');

beforeAll(async () => {
  jest.resetModules();
  jest.unmock('../usersApiSlice');
  usersModule = await import('../usersApiSlice');
});

describe('usersApiSlice (coverage)', () => {
  it('debe exponer usersApiSlice y endpoints principales', () => {
    expect(usersModule.usersApiSlice).toBeDefined();
    expect(usersModule.usersApiSlice.endpoints.getUsuarios).toBeDefined();
    expect(usersModule.usersApiSlice.endpoints.getUsuarioById).toBeDefined();
    expect(usersModule.usersApiSlice.endpoints.createUser).toBeDefined();
    expect(usersModule.usersApiSlice.endpoints.updateUser).toBeDefined();
    expect(usersModule.usersApiSlice.endpoints.deleteUser).toBeDefined();
  });
});


