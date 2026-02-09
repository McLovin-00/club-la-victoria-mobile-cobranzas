/**
 * Tests para EmpresasPage
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Define mocks BEFORE any imports
jest.unstable_mockModule('../../api/empresasApiSlice', () => ({
  useGetEmpresasQuery: jest.fn(),
  useCreateEmpresaMutation: jest.fn(),
  useUpdateEmpresaMutation: jest.fn(),
  useDeleteEmpresaMutation: jest.fn(),
}));

jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

jest.unstable_mockModule('react-router-dom', () => ({
  useNavigate: jest.fn(),
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.unstable_mockModule('../../components/EmpresaTable', () => ({
  EmpresaTable: ({ empresas, onEdit, onDelete, isLoading }: any) => (
    <div data-testid="empresa-table">
      {isLoading && <span>Cargando...</span>}
      {empresas?.map((e: any) => (
        <div key={e.id} data-testid={`empresa-${e.id}`}>
          <span>{e.nombre}</span>
          <button onClick={() => onEdit(e)}>Editar</button>
          <button onClick={() => onDelete(e.id)}>Eliminar</button>
        </div>
      ))}
    </div>
  ),
}));

jest.unstable_mockModule('../../components/EmpresaModal', () => ({
  EmpresaModal: ({ isOpen, onClose, empresa, onSubmit, isLoading }: any) => (
    isOpen ? (
      <div data-testid="empresa-modal">
        <span>{empresa ? 'Editando empresa' : 'Creando empresa'}</span>
        <span>{isLoading ? 'Guardando...' : ''}</span>
        <button onClick={() => onSubmit({ nombre: 'Test' })}>Guardar</button>
        <button onClick={onClose}>Cerrar</button>
      </div>
    ) : null
  ),
}));

jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
  PlusIcon: () => <span>+</span>,
}));

// Dynamic imports
const { EmpresasPage } = await import('../EmpresasPage');
const empresasApi = await import('../../api/empresasApiSlice');
const { showToast } = await import('@/components/ui/Toast.utils');

const mockUseGetEmpresasQuery = empresasApi.useGetEmpresasQuery as jest.Mock;
const mockUseCreateEmpresaMutation = empresasApi.useCreateEmpresaMutation as jest.Mock;
const mockUseUpdateEmpresaMutation = empresasApi.useUpdateEmpresaMutation as jest.Mock;
const mockUseDeleteEmpresaMutation = empresasApi.useDeleteEmpresaMutation as jest.Mock;
const mockShowToast = showToast as jest.Mock;

describe('EmpresasPage', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockUseCreateEmpresaMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    mockUseUpdateEmpresaMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    mockUseDeleteEmpresaMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  it('renderiza el título y descripción', () => {
    render(<EmpresasPage />);
    expect(screen.getByText('Gestión de Empresas')).toBeInTheDocument();
    expect(screen.getByText(/Administra las empresas del sistema/)).toBeInTheDocument();
  });

  it('muestra botón de Nueva Empresa', () => {
    render(<EmpresasPage />);
    expect(screen.getByRole('button', { name: /nueva empresa/i })).toBeInTheDocument();
  });

  it('muestra error cuando falla la carga', () => {
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: { message: 'Error de red' },
      refetch: mockRefetch,
    });
    render(<EmpresasPage />);
    expect(screen.getAllByText(/Error/i).length).toBeGreaterThan(0);
  });

  it('abre modal al hacer click en Nueva Empresa', () => {
    render(<EmpresasPage />);
    expect(screen.queryByTestId('empresa-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    expect(screen.getByTestId('empresa-modal')).toBeInTheDocument();
    expect(screen.getByText('Creando empresa')).toBeInTheDocument();
  });

  it('abre modal de edición al hacer click en Editar', () => {
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [{ id: 1, nombre: 'Empresa Test' }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<EmpresasPage />);
    fireEvent.click(screen.getByText('Editar'));
    expect(screen.getByTestId('empresa-modal')).toBeInTheDocument();
    expect(screen.getByText('Editando empresa')).toBeInTheDocument();
  });

  it('cierra modal al hacer click en Cerrar', () => {
    render(<EmpresasPage />);
    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    expect(screen.getByTestId('empresa-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cerrar'));
    expect(screen.queryByTestId('empresa-modal')).not.toBeInTheDocument();
  });

  it('crea empresa exitosamente', async () => {
    const mockCreate = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 1, nombre: 'Nueva Empresa' }) });
    mockUseCreateEmpresaMutation.mockReturnValue([mockCreate, { isLoading: false }]);

    render(<EmpresasPage />);
    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Empresa creada exitosamente', 'success');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('actualiza empresa exitosamente', async () => {
    const mockUpdate = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockUseUpdateEmpresaMutation.mockReturnValue([mockUpdate, { isLoading: false }]);
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [{ id: 1, nombre: 'Empresa Test' }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<EmpresasPage />);
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Empresa actualizada exitosamente', 'success');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('elimina empresa exitosamente', async () => {
    const mockDelete = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    mockUseDeleteEmpresaMutation.mockReturnValue([mockDelete, { isLoading: false }]);
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [{ id: 1, nombre: 'Empresa Test' }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<EmpresasPage />);
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('maneja error al crear empresa', async () => {
    const mockCreate = jest.fn().mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'Error al crear' } }) });
    mockUseCreateEmpresaMutation.mockReturnValue([mockCreate, { isLoading: false }]);

    render(<EmpresasPage />);
    fireEvent.click(screen.getByRole('button', { name: /nueva empresa/i }));
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Error al crear', 'error');
    });
  });

  it('maneja error al eliminar empresa', async () => {
    const mockDelete = jest.fn().mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'Error al eliminar' } }) });
    mockUseDeleteEmpresaMutation.mockReturnValue([mockDelete, { isLoading: false }]);
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [{ id: 1, nombre: 'Empresa Test' }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<EmpresasPage />);
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Error al eliminar', 'error');
    });
  });

  it('renderiza la tabla de empresas', () => {
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [{ id: 1, nombre: 'Empresa 1' }, { id: 2, nombre: 'Empresa 2' }],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    render(<EmpresasPage />);

    expect(screen.getByTestId('empresa-table')).toBeInTheDocument();
    expect(screen.getByText('Empresa 1')).toBeInTheDocument();
    expect(screen.getByText('Empresa 2')).toBeInTheDocument();
  });

  it('pasa isLoading a EmpresaTable', () => {
    mockUseGetEmpresasQuery.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    render(<EmpresasPage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });
});
