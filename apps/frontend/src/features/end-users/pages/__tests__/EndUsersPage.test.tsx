/**
 * Tests para EndUsersPage refactorizados para ESM
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

const originalGetComputedStyle = window.getComputedStyle;

beforeAll(() => {
  Object.defineProperty(window, 'getComputedStyle', {
    configurable: true,
    value: () => ({ getPropertyValue: () => '' }),
  });
});

afterAll(() => {
  Object.defineProperty(window, 'getComputedStyle', {
    configurable: true,
    value: originalGetComputedStyle,
  });
});

// variables compartidas para mocks
const mockRefetch = jest.fn();
const mockCreateEndUser = jest.fn();
const mockUpdateEndUser = jest.fn();
const mockDeleteEndUser = jest.fn();
let mockEndUsersData = { data: [] as any[] };
let mockIsLoading = false;

// Define mocks
jest.unstable_mockModule('../../api/endUsersApiSlice', () => ({
  useListEndUsersQuery: () => ({
    data: mockEndUsersData,
    isLoading: mockIsLoading,
    refetch: mockRefetch,
  }),
  useCreateEndUserMutation: () => [mockCreateEndUser],
  useUpdateEndUserMutation: () => [mockUpdateEndUser],
  useDeleteEndUserMutation: () => [mockDeleteEndUser],
}));

jest.unstable_mockModule('../../../empresas/api/empresasApiSlice', () => ({
  useGetEmpresasQuery: () => ({
    data: [
      { id: 1, nombre: 'Empresa 1' },
      { id: 2, nombre: 'Empresa 2' },
    ],
  }),
}));

jest.unstable_mockModule('../../components/EndUserModal', () => ({
  default: ({ isOpen, onClose, initial, onSubmit }: any) => (
    isOpen ? (
      <div data-testid="end-user-modal">
        <span>{initial ? 'Editando' : 'Creando'}</span>
        <button onClick={() => onSubmit({ identifierType: 'email', identifierValue: 'test@test.com' })}>Guardar</button>
        <button onClick={onClose}>Cancelar</button>
      </div>
    ) : null
  ),
}));

// Import dynamic
const { default: EndUsersPage } = await import('../EndUsersPage');

// Store para tests
const createTestStore = () => configureStore({
  reducer: {
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

describe('EndUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEndUsersData = { data: [] };
    mockIsLoading = false;
  });

  it('renderiza el título y descripción', () => {
    renderWithProviders(<EndUsersPage />);
    expect(screen.getByText('Usuarios Finales')).toBeInTheDocument();
  });

  it('muestra spinner cuando está cargando', () => {
    mockIsLoading = true;
    const { container } = renderWithProviders(<EndUsersPage />);
    const spinner = container.querySelector('.p-8.text-center');
    expect(spinner).toBeTruthy();
  });

  it('muestra usuarios en la tabla', () => {
    mockEndUsersData = {
      data: [
        { id: 1, email: 'user1@test.com', identifierType: 'email', identifier_value: 'user1@test.com', is_active: true, nombre: 'Juan', apellido: 'Pérez', empresa: { nombre: 'Empresa 1' } },
      ],
    };
    renderWithProviders(<EndUsersPage />);
    expect(screen.getByText('user1@test.com')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('permite buscar usuarios', () => {
    renderWithProviders(<EndUsersPage />);
    const searchInput = screen.getByPlaceholderText('Buscar');
    fireEvent.change(searchInput, { target: { value: 'test@test.com' } });
    expect(searchInput).toHaveValue('test@test.com');
  });

  it('llama a refetch al hacer click en Filtrar', () => {
    renderWithProviders(<EndUsersPage />);
    const filterButton = screen.getByRole('button', { name: /filtrar/i });
    fireEvent.click(filterButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('abre modal al hacer click en Nuevo', () => {
    renderWithProviders(<EndUsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
    expect(screen.getByTestId('end-user-modal')).toBeInTheDocument();
    expect(screen.getByText('Creando')).toBeInTheDocument();
  });

  it('abre modal de edición al hacer click en Editar', () => {
    mockEndUsersData = {
      data: [{ id: 1, email: 'user1@test.com', identifierType: 'email', identifier_value: 'user1@test.com', is_active: true }],
    };
    renderWithProviders(<EndUsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByTestId('end-user-modal')).toBeInTheDocument();
    expect(screen.getByText('Editando')).toBeInTheDocument();
  });

  it('crea usuario al guardar en modal nuevo', async () => {
    mockCreateEndUser.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 1 }),
    });
    renderWithProviders(<EndUsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /nuevo/i }));
    fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => {
      expect(mockCreateEndUser).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('elimina usuario al hacer click en Eliminar', async () => {
    mockEndUsersData = {
      data: [{ id: 1, email: 'user1@test.com', identifierType: 'email', identifier_value: 'user1@test.com', is_active: true }],
    };
    mockDeleteEndUser.mockReturnValue({ unwrap: () => Promise.resolve() });
    renderWithProviders(<EndUsersPage />);
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }));
    await waitFor(() => {
      expect(mockDeleteEndUser).toHaveBeenCalledWith({ id: 1 });
      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
