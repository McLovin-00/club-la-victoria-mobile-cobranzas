/**
 * Test Helpers para Platform Users
 *
 * Helpers reutilizables para tests de platform-users que requieren
 * Redux Store configurado y usuarios mock autenticados.
 */

import React from 'react';
import { render, RenderOptions, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, Store } from '@reduxjs/toolkit';
import { fireEvent } from '@testing-library/react';
import apiSlice from '@/store/apiSlice';
import { documentosApiSlice } from '@/features/documentos/api/documentosApiSlice';

// =============================================================================
// TIPOS
// =============================================================================

export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'ADMIN_INTERNO'
  | 'OPERATOR'
  | 'OPERADOR_INTERNO'
  | 'DADOR_DE_CARGA'
  | 'TRANSPORTISTA'
  | 'CHOFER'
  | 'CLIENTE';

export interface MockUser {
  id: number;
  email: string;
  role: UserRole;
  empresaId?: number;
  nombre?: string;
  apellido?: string;
  dadorCargaId?: number;
  empresaTransportistaId?: number;
  choferId?: number;
  clienteId?: number;
  activo?: boolean;
}

export interface PlatformUsersRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: Partial<MockUser>;
  userRole?: UserRole;
  store?: Store;
  routerOptions?: { initialEntries?: string[] };
}

// =============================================================================
// FACTORY DE USUARIO MOCK
// =============================================================================

const defaultUser: MockUser = {
  id: 1,
  email: 'test@test.com',
  role: 'SUPERADMIN',
  empresaId: 1,
  nombre: 'Test',
  apellido: 'User',
  activo: true,
};

/**
 * Crea un usuario mock con overrides opcionales
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  ...defaultUser,
  ...overrides,
});

/**
 * Crea un usuario mock con un rol específico
 */
export const createMockUserWithRole = (role: UserRole, overrides: Partial<MockUser> = {}): MockUser =>
  createMockUser({ role, ...overrides });

// Usuarios pre-configurados para roles comunes
export const mockSuperadmin = createMockUserWithRole('SUPERADMIN');
export const mockAdmin = createMockUserWithRole('ADMIN');
export const mockAdminInterno = createMockUserWithRole('ADMIN_INTERNO');
export const mockDadorCarga = createMockUserWithRole('DADOR_DE_CARGA', { dadorCargaId: 1 });
export const mockTransportista = createMockUserWithRole('TRANSPORTISTA', {
  dadorCargaId: 1,
  empresaTransportistaId: 1,
});
export const mockChofer = createMockUserWithRole('CHOFER', {
  dadorCargaId: 1,
  empresaTransportistaId: 1,
  choferId: 1,
});
export const mockCliente = createMockUserWithRole('CLIENTE', { clienteId: 1 });

// =============================================================================
// FACTORY DE STORE CONFIGURADO
// =============================================================================

/**
 * Crea un store de Redux configurado para tests de platform-users
 */
export const createPlatformUsersStore = (user: Partial<MockUser> = {}): Store => {
  const fullUser = createMockUser(user);

  return configureStore({
    reducer: {
      auth: () => ({
        user: fullUser,
        token: 'mock-token',
        isAuthenticated: true,
        initialized: true,
        isLoading: false,
        error: null,
      }),
      [apiSlice.reducerPath]: apiSlice.reducer,
      [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        apiSlice.middleware,
        documentosApiSlice.middleware,
      ),
  });
};

// =============================================================================
// WRAPPER PERSONALIZADO
// =============================================================================

interface PlatformUsersWrapperProps {
  children: React.ReactNode;
  store?: Store;
  user?: Partial<MockUser>;
  userRole?: UserRole;
}

export const PlatformUsersWrapper: React.FC<PlatformUsersWrapperProps> = ({
  children,
  store,
  user = {},
  userRole,
}) => {
  const storeToUse =
    store ||
    createPlatformUsersStore(
      userRole ? { role: userRole, ...user } : user
    );

  return (
    <Provider store={storeToUse}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );
};

// =============================================================================
// FUNCIÓN DE RENDERIZADO CON AUTENTICACIÓN
// =============================================================================

/**
 * Renderiza un componente con Redux Store y Router configurados
 * Opción principal para tests de platform-users
 */
export const renderWithAuthUser = (
  ui: React.ReactElement,
  options: PlatformUsersRenderOptions = {}
): ReturnType<typeof render> & { store: ReturnType<typeof createPlatformUsersStore> } => {
  const {
    user,
    userRole,
    store: customStore,
    routerOptions,
    ...renderOptions
  } = options;

  const store =
    customStore ||
    createPlatformUsersStore(userRole ? { role: userRole, ...user } : user);

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={routerOptions?.initialEntries}>
        {children}
      </MemoryRouter>
    </Provider>
  );

  return {
    ...render(ui, { wrapper, ...renderOptions }),
    store,
  };
};

/**
 * Renderiza con un rol específico (helper simplificado)
 */
export const renderWithRole = (
  ui: React.ReactElement,
  role: UserRole,
  userOverrides: Partial<MockUser> = {}
): ReturnType<typeof renderWithAuthUser> => renderWithAuthUser(ui, { userRole: role, user: userOverrides });

// =============================================================================
// HELPERS PARA MUTATIONS
// =============================================================================

type MutationResult = { data: unknown } | void;
type TriggerFn = () => Promise<MutationResult>;

/**
 * Espera a que se llame una mutation y retorna el trigger
 */
export const waitForMutationCall = async (
  mockFn: jest.Mock
): Promise<{ calls: unknown[][]; trigger: TriggerFn }> => {
  await waitFor(() => {
    expect(mockFn).toHaveBeenCalled();
  });

  // El primer elemento del array retornado por useMutation es el trigger
  const trigger = mockFn.mock.results[0]?.value?.[0];

  return {
    calls: mockFn.mock.calls,
    trigger: trigger || jest.fn(),
  };
};

/**
 * Crea un mock de mutation que resuelve con un valor específico
 */
export const createMockMutation = <T = unknown>(
  data: T,
  options: { isLoading?: boolean; shouldError?: boolean; error?: string } = {}
) => {
  const { shouldError, error } = options;

  const trigger = shouldError
    ? jest.fn().mockRejectedValue(new Error(error || 'Mock error'))
    : jest.fn().mockResolvedValue({ data });

  const mutationResult = [
    trigger,
    { isLoading: options.isLoading || false },
  ] as const;

  const mockFn = jest.fn(() => mutationResult);

  return {
    mockFn,
    trigger,
    result: mutationResult,
  };
};

// =============================================================================
// HELPERS PARA FORMULARIOS
// =============================================================================

/**
 * Simula el llenado de un campo de formulario react-hook-form
 */
export const fillFormField = (
  container: HTMLElement,
  labelText: string,
  value: string
) => {
  const label = Array.from(container.querySelectorAll('label')).find(el =>
    el.textContent?.includes(labelText)
  );

  if (!label) {
    throw new Error(`Label "${labelText}" no encontrado`);
  }

  const formControl = label.parentElement?.querySelector('input, select, textarea');
  if (!formControl) {
    throw new Error(`Input para "${labelText}" no encontrado`);
  }

  fireEvent.change(formControl, { target: { value } });
};

/**
 * Simula un click en un botón dentro de un contenedor
 */
export const clickButton = (container: HTMLElement, buttonText: string) => {
  const button = Array.from(container.querySelectorAll('button')).find(el =>
    el.textContent?.includes(buttonText)
  );

  if (!button) {
    throw new Error(`Botón "${buttonText}" no encontrado`);
  }

  fireEvent.click(button);
};

// =============================================================================
// FIXTURES DE DATOS COMUNES
// =============================================================================

export const mockDadores = [
  { id: 1, razonSocial: 'Dador 1', cuit: '20111111111', activo: true },
  { id: 2, razonSocial: 'Dador 2', cuit: '20222222222', activo: true },
  { id: 3, razonSocial: 'Dador 3', cuit: '20333333333', activo: true },
];

export const mockClientes = [
  { id: 1, razonSocial: 'Cliente 1', cuit: '30111111111', activo: true },
  { id: 2, razonSocial: 'Cliente 2', cuit: '30222222222', activo: true },
];

export const mockTransportistas = [
  {
    id: 1,
    razonSocial: 'Transportista 1',
    cuit: '40111111111',
    dadorCargaId: 1,
    activo: true,
  },
  {
    id: 2,
    razonSocial: 'Transportista 2',
    cuit: '40222222222',
    dadorCargaId: 1,
    activo: true,
  },
  {
    id: 3,
    razonSocial: 'Transportista 3',
    cuit: '40333333333',
    dadorCargaId: 2,
    activo: true,
  },
];

export const mockChoferes = [
  {
    id: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    empresaTransportistaId: 1,
    activo: true,
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'López',
    dni: '87654321',
    empresaTransportistaId: 1,
    activo: true,
  },
  {
    id: 3,
    nombre: 'María',
    apellido: 'García',
    dni: '11223344',
    empresaTransportistaId: 2,
    activo: true,
  },
];

export const mockEmpresas = [
  { id: 1, nombre: 'Empresa 1' },
  { id: 2, nombre: 'Empresa 2' },
  { id: 3, nombre: 'Empresa 3' },
];

export const mockPlatformUsers = [
  {
    id: 1,
    email: 'admin@test.com',
    role: 'ADMIN',
    nombre: 'Admin',
    apellido: 'User',
    empresaId: 1,
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'dador@test.com',
    role: 'DADOR_DE_CARGA',
    nombre: 'Dador',
    apellido: 'User',
    empresaId: 1,
    dadorCargaId: 1,
    activo: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    email: 'transportista@test.com',
    role: 'TRANSPORTISTA',
    nombre: 'Transportista',
    apellido: 'User',
    empresaId: 1,
    empresaTransportistaId: 1,
    activo: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// =============================================================================
// EXPORTS
// =============================================================================

export * from './fixtures';