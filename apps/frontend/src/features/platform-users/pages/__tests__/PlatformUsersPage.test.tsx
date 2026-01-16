/**
 * Tests para PlatformUsersPage refactorizados para ESM con rutas corregidas
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Mocks constantes y estables
const mockRefetch = jest.fn();
const mockDeleteUser = jest.fn();
const mockToggleActivo = jest.fn();
const mockShowToast = jest.fn();

let mockUsersData = {
  data: [] as any[],
  total: 0,
  totalPages: 1,
};
let mockIsLoading = false;

// Define mocks con RUTAS ABSOLUTAS (o relativas correctas)
// Desde src/features/platform-users/pages/__tests__/PlatformUsersPage.test.tsx
// 1. platformUsersApiSlice está en src/features/platform-users/api/platformUsersApiSlice.ts
//    Ruta: ../../api/platformUsersApiSlice
jest.unstable_mockModule('../../api/platformUsersApiSlice', () => ({
  useListPlatformUsersQuery: () => ({
    data: mockUsersData,
    isLoading: mockIsLoading,
    refetch: mockRefetch,
  }),
  useDeletePlatformUserMutation: () => [mockDeleteUser],
  useToggleUserActivoMutation: () => [mockToggleActivo],
}));

// 2. Toast.utils está en src/components/ui/Toast.utils.ts
//    Ruta: ../../../../components/ui/Toast.utils
jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
  showToast: mockShowToast,
}));

// 3. RegisterUserModal está en src/features/platform-users/components/RegisterUserModal.tsx
//    Ruta: ../../components/RegisterUserModal
jest.unstable_mockModule('../../components/RegisterUserModal', () => ({
  RegisterUserModal: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="register-modal">
        <button onClick={onClose}>Cerrar Register</button>
      </div>
    ) : null
  ),
}));

// 4. EditPlatformUserModal está en src/features/platform-users/components/EditPlatformUserModal.tsx
//    Ruta: ../../components/EditPlatformUserModal
jest.unstable_mockModule('../../components/EditPlatformUserModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="edit-modal">
        <button onClick={onClose}>Cerrar Edit</button>
      </div>
    ) : null
  ),
}));

// Import dynamic de la página bajo test
// Está en src/features/platform-users/pages/PlatformUsersPage.tsx
// Ruta: ../PlatformUsersPage
const { default: PlatformUsersPage } = await import('../PlatformUsersPage');

// Store para tests
const createTestStore = () => configureStore({
  reducer: {
    auth: () => ({ user: { id: 1, role: 'ADMIN' } }),
    test: () => ({}),
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </Provider>
  );
};

describe('PlatformUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsersData = { data: [], total: 0, totalPages: 1 };
    mockIsLoading = false;
    mockToggleActivo.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockDeleteUser.mockReturnValue({ unwrap: () => Promise.resolve() });
  });

  it('renderiza el título y descripción', () => {
    renderWithProviders(<PlatformUsersPage />);
    expect(screen.getByText('Usuarios de Plataforma')).toBeInTheDocument();
    expect(screen.getByText('Gestión de administradores y operadores')).toBeInTheDocument();
  });

  it('muestra la tabla de usuarios', () => {
    mockUsersData = {
      data: [
        { id: 1, email: 'admin@test.com', role: 'ADMIN', activo: true, empresa: { nombre: 'Empresa 1' } },
        { id: 2, email: 'user@test.com', role: 'USER', activo: false, empresa: null },
      ],
      total: 2,
      totalPages: 1,
    };
    renderWithProviders(<PlatformUsersPage />);
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
  });

  it('llama a refetch al hacer click en Buscar', () => {
    renderWithProviders(<PlatformUsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /buscar/i }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('abre modal de registro al hacer click en Nuevo Usuario', () => {
    renderWithProviders(<PlatformUsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    expect(screen.getByTestId('register-modal')).toBeInTheDocument();
  });

  it('elimina usuario al hacer click en Eliminar', async () => {
    mockUsersData = {
      data: [
        { id: 1, email: 'test@test.com', role: 'ADMIN', activo: true, empresa: null },
      ],
      total: 1,
      totalPages: 1,
    };
    renderWithProviders(<PlatformUsersPage />);
    fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalled();
    });
  });

  it('toggle activo/inactivo funciona correctamente', async () => {
    mockUsersData = {
      data: [
        { id: 1, email: 'test@test.com', role: 'ADMIN', activo: true, empresa: null },
      ],
      total: 1,
      totalPages: 1,
    };
    renderWithProviders(<PlatformUsersPage />);
    fireEvent.click(screen.getByText('Desactivar'));
    await waitFor(() => {
      expect(mockToggleActivo).toHaveBeenCalledWith({ id: 1, activo: false });
    });
  });
});
