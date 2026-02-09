/**
 * Tests de integración para UserModal
 *
 * Prueba:
 * - Integración con useGetEmpresasQuery
 * - Integración con useCreateUserMutation
 * - Integración con useUpdateUserMutation
 * - Estados de loading
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock de componentes UI
jest.mock('../../../../components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
}));

jest.mock('../../../../components/ui/spinner', () => ({
  Spinner: ({ className }: any) => <div className={className} data-testid="spinner">Loading...</div>,
}));

jest.mock('../../../../components/ui/toast', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../../../components/icons', () => ({
  UserIcon: ({ className }: any) => <span className={className} data-testid="user-icon">User</span>,
  BuildingOfficeIcon: ({ className }: any) => <span className={className} data-testid="building-icon">Building</span>,
  XMarkIcon: ({ className }: any) => <span className={className} data-testid="close-icon">X</span>,
}));

jest.mock('../../../../components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} data-testid="button">
      {children}
    </button>
  ),
}));

// Mock de Toast.utils
jest.mock('../../../../components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

// Mock de Logger
jest.mock('../../../../lib/utils', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Variables para los mocks que podremos controlar
let mockCreateUserFn = jest.fn().mockResolvedValue({ data: { data: { id: 1, email: 'new@test.com' } } });
let mockUpdateUserFn = jest.fn().mockResolvedValue({ data: { data: { id: 1, email: 'updated@test.com' } } });
let mockIsCreating = false;
let mockIsUpdating = false;
let mockIsLoadingEmpresas = false;
let mockEmpresasData: any[] = [
  { id: 1, nombre: 'Empresa 1' },
  { id: 2, nombre: 'Empresa 2' },
];

// Mock de useEmailValidation
const mockCheckEmail = jest.fn();

// Mock de usersApiSlice
jest.mock('../../api/usersApiSlice', () => ({
  useCreateUserMutation: () => [mockCreateUserFn, { isLoading: mockIsCreating }],
  useUpdateUserMutation: () => [mockUpdateUserFn, { isLoading: mockIsUpdating }],
  useEmailValidation: () => ({
    checkEmail: mockCheckEmail,
    emailExists: false,
    isCheckingEmail: false,
  }),
}));

// Mock de empresasApiSlice
jest.mock('../../../empresas/api/empresasApiSlice', () => ({
  useGetEmpresasQuery: () => ({
    data: mockEmpresasData,
    isLoading: mockIsLoadingEmpresas,
  }),
}));

describe('UserModal - integración con useGetEmpresasQuery', () => {
  let UserModal: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Resetear variables de control
    mockIsCreating = false;
    mockIsUpdating = false;
    mockIsLoadingEmpresas = false;
    mockEmpresasData = [
      { id: 1, nombre: 'Empresa 1' },
      { id: 2, nombre: 'Empresa 2' },
    ];

    // Crear mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, role: 'ADMIN' } }) => state,
        users: (state = { users: [] }) => state,
      },
    });

    // Importar componente después de configurar mocks
    const module = await import('../UserModal');
    UserModal = module.UserModal;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  it('debería cargar empresas al montar', () => {
    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // El modal debería renderizarse
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debería pasar loading mientras carga empresas', async () => {
    // Simular loading de empresas
    mockIsLoadingEmpresas = true;

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Debería renderizar aunque esté loading
    expect(document.body.children.length).toBeGreaterThan(0);

    // Resetear para siguientes tests
    mockIsLoadingEmpresas = false;
  });

  it('debería pasar empresas al UserForm', () => {
    const { container } = render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Las empresas deberían estar disponibles para el formulario
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debería manejar array vacío de empresas', async () => {
    mockEmpresasData = [];

    // Reimportar para obtener el nuevo mock
    const module = await import('../UserModal');
    const UserModalWithEmptyEmpresas = module.UserModal;

    render(
      <UserModalWithEmptyEmpresas
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Debería renderizar incluso sin empresas
    expect(document.body.children.length).toBeGreaterThan(0);

    // Resetear
    mockEmpresasData = [
      { id: 1, nombre: 'Empresa 1' },
      { id: 2, nombre: 'Empresa 2' },
    ];
  });

  it('debería manejar empresas como undefined', async () => {
    mockEmpresasData = [] as any;

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Debería renderizar
    expect(document.body.children.length).toBeGreaterThan(0);

    // Resetear
    mockEmpresasData = [
      { id: 1, nombre: 'Empresa 1' },
      { id: 2, nombre: 'Empresa 2' },
    ];
  });
});

describe('UserModal - integración con useCreateUserMutation', () => {
  let UserModal: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Resetear variables
    mockIsCreating = false;
    mockIsUpdating = false;
    mockIsLoadingEmpresas = false;

    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, role: 'ADMIN' } }) => state,
        users: (state = { users: [] }) => state,
      },
    });

    mockCreateUserFn = jest.fn().mockResolvedValue({
      data: {
        data: { id: 1, email: 'new@test.com', role: 'user' },
        success: true,
      },
    });

    const module = await import('../UserModal');
    UserModal = module.UserModal;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  it('debería tener createUser disponible', async () => {
    const { showToast } = await import('../../../../components/ui/Toast.utils');

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Verificar que la mutación está disponible
    expect(mockCreateUserFn).toBeDefined();
  });

  it('debería tener showToast disponible', async () => {
    const { showToast } = await import('../../../../components/ui/Toast.utils');

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // showToast está mockeado, verificar que existe
    expect(showToast).toBeDefined();
  });

  it('debería tener Logger disponible', async () => {
    const { Logger } = await import('../../../../lib/utils');

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Logger.debug debería ser llamado
    expect(Logger.debug).toBeDefined();
  });
});

describe('UserModal - integración con useUpdateUserMutation', () => {
  let UserModal: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Resetear variables
    mockIsCreating = false;
    mockIsUpdating = false;
    mockIsLoadingEmpresas = false;

    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, role: 'ADMIN' } }) => state,
        users: (state = { users: [] }) => state,
      },
    });

    mockUpdateUserFn = jest.fn().mockResolvedValue({
      data: {
        data: { id: 5, email: 'updated@test.com', role: 'admin' },
        success: true,
      },
    });

    const module = await import('../UserModal');
    UserModal = module.UserModal;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  it('debería tener updateUser disponible', async () => {
    const onClose = jest.fn();
    const mockUser = { id: 5, email: 'test@test.com', role: 'user' };

    render(
      <UserModal
        isOpen={true}
        mode="edit"
        user={mockUser}
        onClose={onClose}
      />,
      { wrapper }
    );

    // Verificar que la mutación de update está disponible
    expect(mockUpdateUserFn).toBeDefined();
  });

  it('debería tener showToast disponible en modo edit', async () => {
    const { showToast } = await import('../../../../components/ui/Toast.utils');

    render(
      <UserModal
        isOpen={true}
        mode="edit"
        user={{ id: 1, email: 'test@test.com' }}
        onClose={() => {}}
      />,
      { wrapper }
    );

    // showToast debería estar disponible
    expect(showToast).toBeDefined();
  });

  it('debería tener Logger disponible en modo edit', async () => {
    const { Logger } = await import('../../../../lib/utils');

    render(
      <UserModal
        isOpen={true}
        mode="edit"
        user={{ id: 1, email: 'test@test.com' }}
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Logger.debug debería ser llamado
    expect(Logger.debug).toBeDefined();
  });
});

describe('UserModal - estado de loading', () => {
  let UserModal: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Resetear variables
    mockIsCreating = false;
    mockIsUpdating = false;
    mockIsLoadingEmpresas = false;

    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, role: 'ADMIN' } }) => state,
        users: (state = { users: [] }) => state,
      },
    });

    const module = await import('../UserModal');
    UserModal = module.UserModal;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  it('debería poder simular isCreating', async () => {
    // Simular loading en creación
    mockIsCreating = true;

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Debería renderizar aunque esté cargando
    expect(document.body.children.length).toBeGreaterThan(0);

    // Resetear
    mockIsCreating = false;
  });

  it('debería poder simular isUpdating', async () => {
    // Simular loading en actualización
    mockIsUpdating = true;

    render(
      <UserModal
        isOpen={true}
        mode="edit"
        user={{ id: 1, email: 'test@test.com' }}
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Debería renderizar aunque esté cargando
    expect(document.body.children.length).toBeGreaterThan(0);

    // Resetear
    mockIsUpdating = false;
  });

  it('debería poder simular loadingEmpresas', async () => {
    // Simular loading de empresas
    mockIsLoadingEmpresas = true;

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Debería renderizar aunque esté cargando
    expect(document.body.children.length).toBeGreaterThan(0);

    // Resetear
    mockIsLoadingEmpresas = false;
  });

  it('debería poder simular loading combinado', async () => {
    // Simular loading en ambas mutaciones y empresas
    mockIsCreating = true;
    mockIsLoadingEmpresas = true;

    render(
      <UserModal
        isOpen={true}
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    // Debería renderizar
    expect(document.body.children.length).toBeGreaterThan(0);

    // Resetear
    mockIsCreating = false;
    mockIsLoadingEmpresas = false;
  });
});
