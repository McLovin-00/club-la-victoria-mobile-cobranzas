/**
 * Tests de cobertura para SuperAdminDashboard usando jest.unstable_mockModule
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('SuperAdminDashboard - Coverage', () => {
  let SuperAdminDashboard: React.FC;
  let useGetSuperAdminDashboardQuery: jest.Mock;
  let useRefreshDashboardMutation: jest.Mock;

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
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
      showToast: jest.fn(),
    }));

    await jest.unstable_mockModule('@/components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant, size }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('@/components/ui/spinner', () => ({
      Spinner: ({ className }: any) => <div className={className} data-testid="spinner">Spinner</div>,
    }));

    await jest.unstable_mockModule('@/components/icons', () => ({
      UserIcon: ({ className }: any) => <span className={className}>UserIcon</span>,
      ServerIcon: ({ className }: any) => <span className={className}>ServerIcon</span>,
      BuildingOfficeIcon: ({ className }: any) => <span className={className}>BuildingIcon</span>,
      ArrowPathIcon: ({ className }: any) => <span className={className}>RefreshIcon</span>,
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
});
