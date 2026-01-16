/**
 * Tests comprehensivos para store.mock.ts
 * 
 * Verifica todas las funciones factory y exports del mock del store.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  defaultAuthState,
  defaultUiState,
  createMockStore,
  mockStore,
  createMockStoreHooks,
  mockStoreHooks,
} from '../mocks/store.mock';

describe('store.mock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('defaultAuthState', () => {
    it('tiene la estructura correcta', () => {
      expect(defaultAuthState).toEqual({
        user: {
          id: 1,
          email: 'test@test.com',
          role: 'SUPERADMIN',
          empresaId: 1,
          nombre: 'Test',
          apellido: 'User',
        },
        token: 'mock-token',
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    });

    it('tiene usuario con rol SUPERADMIN', () => {
      expect(defaultAuthState.user.role).toBe('SUPERADMIN');
    });

    it('tiene token mock', () => {
      expect(defaultAuthState.token).toBe('mock-token');
    });

    it('está inicializado', () => {
      expect(defaultAuthState.isInitialized).toBe(true);
    });

    it('no está cargando', () => {
      expect(defaultAuthState.isLoading).toBe(false);
    });

    it('no tiene errores', () => {
      expect(defaultAuthState.error).toBeNull();
    });
  });

  describe('defaultUiState', () => {
    it('tiene sidebar abierto por defecto', () => {
      expect(defaultUiState.sidebarOpen).toBe(true);
    });

    it('tiene tema light por defecto', () => {
      expect(defaultUiState.theme).toBe('light');
    });
  });

  describe('createMockStore', () => {
    it('crea un store con estado por defecto sin parámetros', () => {
      const store = createMockStore();
      
      expect(store).toHaveProperty('store');
      expect(store.store).toHaveProperty('dispatch');
      expect(store.store).toHaveProperty('getState');
      expect(store.store).toHaveProperty('subscribe');
      expect(store.store).toHaveProperty('replaceReducer');
    });

    it('dispatch es una función mock', () => {
      const store = createMockStore();
      
      expect(jest.isMockFunction(store.store.dispatch)).toBe(true);
    });

    it('getState retorna el estado con valores por defecto', () => {
      const store = createMockStore();
      const state = store.store.getState();
      
      expect(state.auth).toEqual(defaultAuthState);
      expect(state.ui).toEqual(defaultUiState);
    });

    it('subscribe retorna una función de unsubscribe', () => {
      const store = createMockStore();
      const unsubscribe = store.store.subscribe();
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('permite override de auth state', () => {
      const customAuth = {
        user: { id: 99, email: 'custom@test.com', role: 'ADMIN' as const },
        token: 'custom-token',
        isInitialized: false,
        isLoading: true,
        error: 'test error',
      };
      
      const store = createMockStore({ auth: customAuth });
      const state = store.store.getState();
      
      expect(state.auth.user.id).toBe(99);
      expect(state.auth.user.email).toBe('custom@test.com');
      expect(state.auth.token).toBe('custom-token');
      expect(state.auth.isInitialized).toBe(false);
      expect(state.auth.isLoading).toBe(true);
      expect(state.auth.error).toBe('test error');
    });

    it('permite override de ui state', () => {
      const store = createMockStore({ 
        ui: { sidebarOpen: false, theme: 'dark' as const } 
      });
      const state = store.store.getState();
      
      expect(state.ui.sidebarOpen).toBe(false);
      expect(state.ui.theme).toBe('dark');
    });

    it('permite agregar propiedades adicionales al state', () => {
      const store = createMockStore({ 
        customProperty: { value: 'test' } 
      } as Record<string, unknown>);
      const state = store.store.getState();
      
      expect(state.customProperty).toEqual({ value: 'test' });
    });

    it('replaceReducer es una función mock', () => {
      const store = createMockStore();
      
      expect(jest.isMockFunction(store.store.replaceReducer)).toBe(true);
    });
  });

  describe('mockStore', () => {
    it('es una instancia creada con valores por defecto', () => {
      expect(mockStore).toHaveProperty('store');
      expect(mockStore.store.getState().auth).toEqual(defaultAuthState);
    });
  });

  describe('createMockStoreHooks', () => {
    it('crea hooks con estado por defecto sin parámetros', () => {
      const hooks = createMockStoreHooks();
      
      expect(hooks).toHaveProperty('useAppSelector');
      expect(hooks).toHaveProperty('useAppDispatch');
    });

    it('useAppSelector ejecuta el selector con el estado', () => {
      const hooks = createMockStoreHooks();
      
      // Selector que retorna el email del usuario
      const email = hooks.useAppSelector((state) => state.auth.user.email);
      
      expect(email).toBe('test@test.com');
    });

    it('useAppSelector respeta overrides de estado', () => {
      const hooks = createMockStoreHooks({
        auth: { user: { email: 'custom@test.com' } },
      } as Record<string, unknown>);
      
      const email = hooks.useAppSelector((state) => state.auth.user.email);
      
      expect(email).toBe('custom@test.com');
    });

    it('useAppDispatch retorna una función mock', () => {
      const hooks = createMockStoreHooks();
      const dispatch = hooks.useAppDispatch();
      
      expect(jest.isMockFunction(dispatch)).toBe(true);
    });

    it('useAppSelector puede seleccionar ui state', () => {
      const hooks = createMockStoreHooks();
      
      const theme = hooks.useAppSelector((state) => state.ui.theme);
      
      expect(theme).toBe('light');
    });

    it('useAppSelector puede seleccionar estado completo', () => {
      const hooks = createMockStoreHooks();
      
      const fullState = hooks.useAppSelector((state) => state);
      
      expect(fullState.auth).toBeDefined();
      expect(fullState.ui).toBeDefined();
    });

    it('permite múltiples llamadas a useAppSelector', () => {
      const hooks = createMockStoreHooks();
      
      const result1 = hooks.useAppSelector((state) => state.auth.user.id);
      const result2 = hooks.useAppSelector((state) => state.auth.token);
      const result3 = hooks.useAppSelector((state) => state.ui.sidebarOpen);
      
      expect(result1).toBe(1);
      expect(result2).toBe('mock-token');
      expect(result3).toBe(true);
    });
  });

  describe('mockStoreHooks', () => {
    it('es una instancia creada con valores por defecto', () => {
      expect(mockStoreHooks).toHaveProperty('useAppSelector');
      expect(mockStoreHooks).toHaveProperty('useAppDispatch');
    });

    it('useAppSelector funciona correctamente', () => {
      const role = mockStoreHooks.useAppSelector((state) => state.auth.user.role);
      expect(role).toBe('SUPERADMIN');
    });
  });
});

