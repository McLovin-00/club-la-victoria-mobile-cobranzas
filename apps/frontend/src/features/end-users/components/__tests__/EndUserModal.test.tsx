/**
 * Tests para EndUserModal refactorizados para ESM
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Mocks constantes y estables
const empresasData = [
  { id: 1, nombre: 'Empresa 1' },
  { id: 2, nombre: 'Empresa 2' },
];

const mockAlert = jest.fn();
window.alert = mockAlert;

// Define mocks
jest.unstable_mockModule('../../../empresas/api/empresasApiSlice', () => ({
  useGetEmpresasQuery: () => ({
    data: empresasData,
    isLoading: false,
  }),
}));

// Import dynamic
const { default: EndUserModal } = await import('../EndUserModal');

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

describe('EndUserModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('no renderiza nada cuando isOpen es false', () => {
    renderWithProviders(
      <EndUserModal
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.queryByText('Nuevo usuario final')).not.toBeInTheDocument();
  });

  it('renderiza el modal cuando isOpen es true', () => {
    renderWithProviders(
      <EndUserModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.getByText('Nuevo usuario final')).toBeInTheDocument();
  });

  it('muestra título de edición cuando hay initial', () => {
    const initial = {
      id: 1,
      identifierType: 'email',
      identifier_value: 'test@test.com',
      is_active: true,
    };
    renderWithProviders(
      <EndUserModal
        isOpen={true}
        onClose={mockOnClose}
        initial={initial}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.getByText('Editar usuario final')).toBeInTheDocument();
  });

  it('muestra campos de identificador solo en creación', () => {
    renderWithProviders(
      <EndUserModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Identificador')).toBeInTheDocument();
  });

  it('muestra lista de empresas', () => {
    renderWithProviders(
      <EndUserModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.getByText('Empresa 1')).toBeInTheDocument();
    expect(screen.getByText('Empresa 2')).toBeInTheDocument();
  });

  it('llama a onClose al hacer click en Cancelar', () => {
    renderWithProviders(
      <EndUserModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('llama a onSubmit con los valores correctos', async () => {
    renderWithProviders(
      <EndUserModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    const identifierInput = screen.getByPlaceholderText('email o handle');
    fireEvent.change(identifierInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /crear/i }));
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('parsea metadata JSON correctamente', async () => {
    renderWithProviders(
      <EndUserModal
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );
    const metadataTextarea = screen.getByPlaceholderText('{"preferencias": {"idioma": "es"}}');
    fireEvent.change(metadataTextarea, { target: { value: '{"key": "value"}' } });
    fireEvent.click(screen.getByRole('button', { name: /crear/i }));
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      const callArgs = mockOnSubmit.mock.calls[0][0];
      expect(callArgs.metadata).toEqual({ key: 'value' });
    });
  });
});
