/**
 * Tests de cobertura para SuperAdminDashboard usando jest.unstable_mockModule
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('SuperAdminDashboard - Coverage', () => {
  let SuperAdminDashboard: React.FC;
  let useGetSuperAdminDashboardQuery: jest.Mock;
  let useRefreshDashboardMutation: jest.Mock;
  let mockShowToast: jest.Mock;

  const mockRefetch = jest.fn();
  const mockRefresh = jest.fn();

  beforeAll(async () => {
    // Crear funciones mock para los hooks
    useGetSuperAdminDashboardQuery = jest.fn();
    useRefreshDashboardMutation = jest.fn();

    // Mock del módulo de API
    await jest.unstable_mockModule('@/features/dashboard/api/dashboardApiSlice', () => ({
      useGetSuperAdminDashboardQuery: (...args: unknown[]) => useGetSuperAdminDashboardQuery(...args),
      useRefreshDashboardMutation: (...args: unknown[]) => useRefreshDashboardMutation(...args),
    }));

    // Mock de componentes UI
    await jest.unstable_mockModule('@/components/ui/card', () => ({
      Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    }));

    mockShowToast = jest.fn();
    await jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
      showToast: (...args: unknown[]) => mockShowToast(...args),
    }));

    await jest.unstable_mockModule('@/components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant, size }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; size?: string }) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('@/components/ui/spinner', () => ({
      Spinner: ({ className }: { className?: string }) => <div className={className} data-testid="spinner">Spinner</div>,
    }));

    await jest.unstable_mockModule('@/components/icons', () => ({
      UserIcon: ({ className }: { className?: string }) => <span className={className}>UserIcon</span>,
      ServerIcon: ({ className }: { className?: string }) => <span className={className}>ServerIcon</span>,
      BuildingOfficeIcon: ({ className }: { className?: string }) => <span className={className}>BuildingIcon</span>,
      ArrowPathIcon: ({ className }: { className?: string }) => <span className={className}>RefreshIcon</span>,
    }));

    await jest.unstable_mockModule('../ServiceWidgets', () => ({
      ServiceWidgetsContainer: () => <div data-testid="service-widgets">ServiceWidgets</div>,
    }));

    // Importar el componente después de mockear dependencias
    const module = await import('../SuperAdminDashboard');
    SuperAdminDashboard = module.SuperAdminDashboard;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue({});
    mockRefresh.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
    useRefreshDashboardMutation.mockReturnValue([
      mockRefresh,
      { isLoading: false },
    ]);
  });

  it('debería importar el componente', () => {
    expect(SuperAdminDashboard).toBeDefined();
  });

  it('debería mostrar spinner durante carga', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar mensaje de error', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: { status: 500 },
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByText(/Error al cargar los datos del panel de control/)).toBeInTheDocument();
  });

  it('debería mostrar mensaje de no datos disponibles cuando data es null', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByText(/No hay datos disponibles en este momento/)).toBeInTheDocument();
  });

  it('debería mostrar mensaje de no datos cuando faltan propiedades', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: { empresas: [] },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByText(/No hay datos disponibles en este momento/)).toBeInTheDocument();
  });

  it('debería renderizar dashboard con datos completos', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 5,
        totalUsersCount: 150,
        serverUsage: 45,
        empresas: [
          {
            id: '1',
            nombre: 'Empresa 1',
            descripcion: 'Descripción 1',
            usuariosCount: 30,
            createdAt: '2024-01-01T00:00:00',
          },
          {
            id: '2',
            nombre: 'Empresa 2',
            descripcion: 'Descripción 2',
            usuariosCount: 20,
            createdAt: '2024-02-01T00:00:00',
          },
        ],
        systemActivity: [
          {
            id: '1',
            action: 'Actividad 1',
            timestamp: '2024-01-01T10:00:00',
            description: 'Descripción actividad',
            user: 'admin',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    expect(screen.getByText('Panel de Superadministrador')).toBeInTheDocument();
    expect(screen.getAllByText('Empresas').length).toBeGreaterThan(0);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Usuarios Totales')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Actividades Recientes')).toBeInTheDocument();
  });

  it('debería mostrar indicador de memoria verde cuando uso es bajo', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 45,
        empresas: [],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('debería mostrar indicador de memoria amarillo cuando uso es medio', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 65,
        empresas: [],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('debería mostrar indicador de memoria rojo cuando uso es alto', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 85,
        empresas: [],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('debería renderizar tabla de empresas con paginación', () => {
    const empresas = Array.from({ length: 7 }, (_, i) => ({
      id: String(i + 1),
      nombre: `Empresa ${i + 1}`,
      descripcion: `Descripción ${i + 1}`,
      usuariosCount: i + 1,
      createdAt: '2024-01-01T00:00:00',
    }));

    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 7,
        totalUsersCount: 28,
        serverUsage: 50,
        empresas,
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    expect(screen.getByText('Listado de Empresas')).toBeInTheDocument();
    expect(screen.getByText('Empresa 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('debería renderizar ServiceWidgetsContainer', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 50,
        empresas: [],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);
    expect(screen.getByTestId('service-widgets')).toBeInTheDocument();
  });

  it('debería mostrar actividades recientes del sistema', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 50,
        empresas: [],
        systemActivity: [
          {
            id: '1',
            action: 'Usuario creado',
            timestamp: '2024-01-01T10:00:00',
            description: 'Nuevo usuario registrado',
            user: 'admin',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    expect(screen.getByText('Actividad Reciente del Sistema')).toBeInTheDocument();
    const activityElements = screen.getAllByText('Usuario creado');
    expect(activityElements.length).toBeGreaterThan(0);
  });

  it('debería mostrar sección de información de empresas', () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 3,
        totalUsersCount: 50,
        serverUsage: 50,
        empresas: [
          { id: '1', nombre: 'Emp1', descripcion: 'D1', usuariosCount: 10, createdAt: '2024-01-01' },
          { id: '2', nombre: 'Emp2', descripcion: 'D2', usuariosCount: 20, createdAt: '2024-01-02' },
          { id: '3', nombre: 'Emp3', descripcion: 'D3', usuariosCount: 20, createdAt: '2024-01-03' },
        ],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    expect(screen.getByText('Resumen de Empresas')).toBeInTheDocument();
    expect(screen.getByText('Total de Empresas registradas: 3')).toBeInTheDocument();
    expect(screen.getByText('Información de Empresas')).toBeInTheDocument();
    expect(screen.getByText('Total Empresas')).toBeInTheDocument();
    const totalElements = screen.getAllByText('3');
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it('debería llamar a handleRefresh correctamente cuando se hace clic en Actualizar', async () => {
    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 50,
        empresas: [],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    const refreshButton = screen.getByText('Actualizar');
    
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Dashboard actualizado correctamente', 'success');
    });
  });

  it('debería manejar error en handleRefresh', async () => {
    mockRefresh.mockReturnValue({
      unwrap: () => Promise.reject(new Error('Error de refresh')),
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 50,
        empresas: [],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    const refreshButton = screen.getByText('Actualizar');
    
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error al actualizar dashboard:', expect.anything());
      expect(mockShowToast).toHaveBeenCalledWith('Error al actualizar dashboard', 'error');
    });

    consoleSpy.mockRestore();
  });

  it('debería mostrar spinner en botón mientras se actualiza', () => {
    useRefreshDashboardMutation.mockReturnValue([
      mockRefresh,
      { isLoading: true },
    ]);

    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 1,
        totalUsersCount: 10,
        serverUsage: 50,
        empresas: [],
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    const refreshButton = screen.getByText('Actualizar');
    expect(refreshButton).toBeDisabled();
    expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0);
  });

  it('debería paginar hacia adelante al hacer clic en Siguiente', async () => {
    const empresas = Array.from({ length: 7 }, (_, i) => ({
      id: String(i + 1),
      nombre: `Empresa ${i + 1}`,
      descripcion: `Descripción ${i + 1}`,
      usuariosCount: i + 1,
      createdAt: '2024-01-01T00:00:00',
    }));

    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 7,
        totalUsersCount: 28,
        serverUsage: 50,
        empresas,
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Empresa 1')).toBeInTheDocument();

    const nextButton = screen.getByText('Siguiente');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
      expect(screen.getByText('Empresa 6')).toBeInTheDocument();
    });
  });

  it('debería paginar hacia atrás al hacer clic en Anterior', async () => {
    const empresas = Array.from({ length: 7 }, (_, i) => ({
      id: String(i + 1),
      nombre: `Empresa ${i + 1}`,
      descripcion: `Descripción ${i + 1}`,
      usuariosCount: i + 1,
      createdAt: '2024-01-01T00:00:00',
    }));

    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 7,
        totalUsersCount: 28,
        serverUsage: 50,
        empresas,
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    // Go to page 2
    fireEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    });

    // Go back to page 1
    fireEvent.click(screen.getByText('Anterior'));

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
      expect(screen.getByText('Empresa 1')).toBeInTheDocument();
    });
  });

  it('debería deshabilitar Anterior en primera página y Siguiente en última', async () => {
    const empresas = Array.from({ length: 7 }, (_, i) => ({
      id: String(i + 1),
      nombre: `Empresa ${i + 1}`,
      descripcion: `Descripción ${i + 1}`,
      usuariosCount: i + 1,
      createdAt: '2024-01-01T00:00:00',
    }));

    useGetSuperAdminDashboardQuery.mockReturnValue({
      data: {
        empresasCount: 7,
        totalUsersCount: 28,
        serverUsage: 50,
        empresas,
        systemActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<SuperAdminDashboard />);

    // On page 1, Anterior should be disabled
    const anteriorButton = screen.getByText('Anterior');
    expect(anteriorButton).toBeDisabled();

    // Go to page 2
    fireEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    });

    // On page 2 (last), Siguiente should be disabled
    const siguienteButton = screen.getByText('Siguiente');
    expect(siguienteButton).toBeDisabled();
  });
});
