/**
 * Mocks para Redux Store
 * 
 * Provee mocks configurables para el store y sus hooks.
 * Usar solo cuando sea necesario aislar componentes del store real.
 */

import type { RootState } from '@/store/store';

// Estado por defecto para tests
export const defaultAuthState = {
  user: { 
    id: 1, 
    email: 'test@test.com', 
    role: 'SUPERADMIN' as const, 
    empresaId: 1,
    nombre: 'Test',
    apellido: 'User',
  },
  token: 'mock-token',
  isInitialized: true,
  isLoading: false,
  error: null,
};

export const defaultUiState = {
  sidebarOpen: true,
  theme: 'light' as const,
};

/**
 * Crea un mock del store con estado personalizable
 */
export const createMockStore = (overrides: Partial<RootState> = {}) => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({
      auth: { ...defaultAuthState, ...overrides.auth },
      ui: { ...defaultUiState, ...overrides.ui },
      ...overrides,
    })),
    subscribe: jest.fn(() => () => {}),
    replaceReducer: jest.fn(),
  },
});

/**
 * Mock por defecto del store (exportar para uso rápido)
 */
export const mockStore = createMockStore();

/**
 * Crea mocks de los hooks de Redux
 */
export const createMockStoreHooks = (state: Partial<RootState> = {}) => ({
  useAppSelector: jest.fn((selector: (s: RootState) => unknown) => {
    const fullState = {
      auth: { ...defaultAuthState, ...state.auth },
      ui: { ...defaultUiState, ...state.ui },
      ...state,
    } as RootState;
    return selector(fullState);
  }),
  useAppDispatch: () => jest.fn(),
});

/**
 * Mock por defecto de los hooks del store
 */
export const mockStoreHooks = createMockStoreHooks();

