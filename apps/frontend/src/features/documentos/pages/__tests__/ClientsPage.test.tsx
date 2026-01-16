// Tests completos de `ClientsPage`: CRUD de clientes + configuración de defaults (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ClientsPage - render completo con coverage', () => {
  let ClientsPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;

  let useGetClientsQuery: jest.Mock;
  let useGetDefaultsQuery: jest.Mock;
  let useUpdateDefaultsMutation: jest.Mock;
  let useCreateClientMutation: jest.Mock;
  let useUpdateClientMutation: jest.Mock;
  let useDeleteClientMutation: jest.Mock;
  let mockNavigate: jest.Mock;
  let mockGoBack: jest.Mock;

  beforeAll(async () => {
    useGetClientsQuery = jest.fn();
    useGetDefaultsQuery = jest.fn();
    useUpdateDefaultsMutation = jest.fn();
    useCreateClientMutation = jest.fn();
    useUpdateClientMutation = jest.fn();
    useDeleteClientMutation = jest.fn();
    mockNavigate = jest.fn();
    mockGoBack = jest.fn();

    // Mock RTK Query hooks
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetClientsQuery: (...args: any[]) => useGetClientsQuery(...args),
      useGetDefaultsQuery: (...args: any[]) => useGetDefaultsQuery(...args),
      useUpdateDefaultsMutation: (...args: any[]) => useUpdateDefaultsMutation(...args),
      useCreateClientMutation: (...args: any[]) => useCreateClientMutation(...args),
      useUpdateClientMutation: (...args: any[]) => useUpdateClientMutation(...args),
      useDeleteClientMutation: (...args: any[]) => useDeleteClientMutation(...args),
    }));

    // Mock useRoleBasedNavigation hook
    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({ goBack: mockGoBack }),
    }));

    // Mock react-router-dom
    await jest.unstable_mockModule('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    ({ default: ClientsPage } = await import('../ClientsPage'));
    ({ MemoryRouter } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetClientsQuery.mockReturnValue({
      data: { list: [] },
      isLoading: false,
      error: null,
    });
    useGetDefaultsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    useUpdateDefaultsMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false, error: null },
    ]);
    useCreateClientMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false, error: null },
    ]);
    useUpdateClientMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false, error: null },
    ]);
    useDeleteClientMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false, error: null },
    ]);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>
    );
  };

  it('renderiza página con título y botón volver', () => {
    renderPage();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('muestra "Sin clientes" cuando no hay clientes', () => {
    useGetClientsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    renderPage();
    expect(screen.getByText('Sin clientes')).toBeInTheDocument();
  });

  it('muestra lista de clientes', () => {
    useGetClientsQuery.mockReturnValue({
      data: [
        { id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true },
        { id: 2, razonSocial: 'Cliente B', cuit: '20987654321', activo: false },
      ],
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Cliente A')).toBeInTheDocument();
    expect(screen.getByText('CUIT 20123456789 · ID 1')).toBeInTheDocument();
    expect(screen.getByText('Cliente B')).toBeInTheDocument();
    expect(screen.getByText('CUIT 20987654321 · ID 2')).toBeInTheDocument();
  });

  it('muestra inputs para crear nuevo cliente', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Razón social')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('CUIT (11 dígitos)')).toBeInTheDocument();
    expect(screen.getByText('Crear')).toBeInTheDocument();
  });

  it('crea cliente cuando los datos son válidos', async () => {
    const mockCreate = jest.fn();
    useCreateClientMutation.mockReturnValue([
      mockCreate,
      { isLoading: false, error: null },
    ]);

    renderPage();

    const razonSocialInput = screen.getByPlaceholderText('Razón social');
    const cuitInput = screen.getByPlaceholderText('CUIT (11 dígitos)');
    const crearButton = screen.getByText('Crear');

    fireEvent.change(razonSocialInput, { target: { value: 'Nuevo Cliente' } });
    fireEvent.change(cuitInput, { target: { value: '20123456789' } });
    fireEvent.click(crearButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ razonSocial: 'Nuevo Cliente', cuit: '20123456789' });
    });
  });

  it('filtra CUIT para solo dígitos', () => {
    renderPage();
    const cuitInput = screen.getByPlaceholderText('CUIT (11 dígitos)') as HTMLInputElement;
    fireEvent.change(cuitInput, { target: { value: '20-1234-56789' } });
    expect(cuitInput.value).toBe('20123456789');
  });

  it('muestra configuración de defaults cuando existen', () => {
    useGetDefaultsQuery.mockReturnValue({
      data: {
        missingCheckDelayMinutes: 30,
        noExpiryHorizonYears: 50,
        defaultClienteId: null,
      },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Delay verificación faltantes (minutos):')).toBeInTheDocument();
    expect(screen.getByText('Horizonte sin vencimiento (años):')).toBeInTheDocument();
  });

  it('actualiza delay de verificación faltantes', async () => {
    const mockUpdate = jest.fn();
    useUpdateDefaultsMutation.mockReturnValue([
      mockUpdate,
      { isLoading: false, error: null },
    ]);

    useGetDefaultsQuery.mockReturnValue({
      data: { missingCheckDelayMinutes: 30, noExpiryHorizonYears: 50, defaultClienteId: null },
      isLoading: false,
      error: null,
    });

    renderPage();

    const delayInput = screen.getByDisplayValue('30');
    fireEvent.change(delayInput, { target: { value: '45' } });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ missingCheckDelayMinutes: 45 });
    });
  });

  it('muestra checkbox para cliente por defecto', () => {
    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });
    useGetDefaultsQuery.mockReturnValue({
      data: { defaultClienteId: 1 },
      isLoading: false,
      error: null,
    });

    renderPage();
    expect(screen.getByText('Cliente por defecto')).toBeInTheDocument();
    expect(screen.getByText('(por defecto)')).toBeInTheDocument();
  });

  it('marca cliente como por defecto', async () => {
    const mockUpdate = jest.fn();
    useUpdateDefaultsMutation.mockReturnValue([
      mockUpdate,
      { isLoading: false, error: null },
    ]);

    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });
    useGetDefaultsQuery.mockReturnValue({
      data: { defaultClienteId: null },
      isLoading: false,
      error: null,
    });

    renderPage();

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ defaultClienteId: 1 });
    });
  });

  it('desmarca cliente por defecto', async () => {
    const mockUpdate = jest.fn();
    useUpdateDefaultsMutation.mockReturnValue([
      mockUpdate,
      { isLoading: false, error: null },
    ]);

    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });
    useGetDefaultsQuery.mockReturnValue({
      data: { defaultClienteId: 1 },
      isLoading: false,
      error: null,
    });

    renderPage();

    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ defaultClienteId: null });
    });
  });

  it('activa y desactiva cliente', async () => {
    const mockUpdate = jest.fn();
    useUpdateClientMutation.mockReturnValue([
      mockUpdate,
      { isLoading: false, error: null },
    ]);

    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });

    renderPage();

    const desactivarButton = screen.getByText('Desactivar');
    fireEvent.click(desactivarButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ id: 1, activo: false });
    });
  });

  it('navega a requisitos de cliente', () => {
    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });

    renderPage();

    const requisitosButton = screen.getByText('Requisitos');
    fireEvent.click(requisitosButton);

    expect(mockNavigate).toHaveBeenCalledWith('/documentos/clientes/1/requirements');
  });

  it('muestra modal de confirmación al borrar cliente', () => {
    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });

    renderPage();

    const borrarButton = screen.getByText('Borrar');
    fireEvent.click(borrarButton);

    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument();
    expect(screen.getByText(/eliminar el cliente #1/)).toBeInTheDocument();
  });

  it('cancela eliminación de cliente', () => {
    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });

    renderPage();

    const borrarButton = screen.getByText('Borrar');
    fireEvent.click(borrarButton);

    const cancelarButton = screen.getByText('Cancelar');
    fireEvent.click(cancelarButton);

    expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument();
  });

  it('confirma eliminación de cliente', async () => {
    const mockDelete = jest.fn();
    useDeleteClientMutation.mockReturnValue([
      mockDelete,
      { isLoading: false, error: null },
    ]);

    useGetClientsQuery.mockReturnValue({
      data: [{ id: 1, razonSocial: 'Cliente A', cuit: '20123456789', activo: true }],
      isLoading: false,
      error: null,
    });

    renderPage();

    const borrarButton = screen.getByText('Borrar');
    fireEvent.click(borrarButton);

    const eliminarButton = screen.getByText('Eliminar');
    fireEvent.click(eliminarButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1);
    });
  });

  it('llama goBack al hacer click en volver', () => {
    renderPage();
    const volverButton = screen.getByText('Volver');
    fireEvent.click(volverButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
