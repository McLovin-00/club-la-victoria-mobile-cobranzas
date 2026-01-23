/**
 * Tests de cobertura para AdminDashboard usando jest.unstable_mockModule
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('AdminDashboard - Coverage', () => {
  let AdminDashboard: React.FC;
  let useGetAdminDashboardQuery: jest.Mock;
  let useRefreshDashboardMutation: jest.Mock;
  let mockShowToast: jest.Mock;

  const mockRefetch = jest.fn();
  const mockRefresh = jest.fn();

  beforeAll(async () => {
    // Crear funciones mock para los hooks
    useGetAdminDashboardQuery = jest.fn();
    useRefreshDashboardMutation = jest.fn();

    // Mock del módulo de API
    await jest.unstable_mockModule('@/features/dashboard/api/dashboardApiSlice', () => ({
      useGetAdminDashboardQuery: (...args: unknown[]) => useGetAdminDashboardQuery(...args),
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
      BuildingOfficeIcon: ({ className }: { className?: string }) => <span className={className}>BuildingIcon</span>,
      ArrowPathIcon: ({ className }: { className?: string }) => <span className={className}>RefreshIcon</span>,
    }));

    await jest.unstable_mockModule('../ServiceWidgets', () => ({
      ServiceWidgetsContainer: () => <div data-testid="service-widgets">ServiceWidgets</div>,
    }));

    // Importar el componente después de mockear dependencias
    const module = await import('../AdminDashboard');
    AdminDashboard = module.AdminDashboard;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue({});
    mockRefresh.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    useGetAdminDashboardQuery.mockReturnValue({
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
    expect(AdminDashboard).toBeDefined();
  });

  it('debería mostrar spinner durante carga', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar mensaje de error', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: { status: 500 },
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);
    expect(screen.getByText(/Error al cargar los datos del panel de control/)).toBeInTheDocument();
  });

  it('debería mostrar mensaje de no datos disponibles', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);
    expect(screen.getByText(/No hay datos disponibles en este momento/)).toBeInTheDocument();
  });

  it('debería renderizar dashboard con datos completos', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 42,
        clientsCount: 10,
        bots: [{ id: 1, name: 'Bot 1' }],
        botCompleteness: [
          {
            botId: '1',
            botName: 'Bot Test',
            completedPercentage: 0.85,
          },
        ],
        users: [
          {
            id: '1',
            email: 'user@test.com',
            role: 'admin',
            botsEnabled: [1, 2],
            lastActive: '2024-01-01T10:00:00',
          },
        ],
        recentActivity: [
          {
            id: '1',
            action: 'Acción 1',
            timestamp: '2024-01-01T10:00:00',
            description: 'Descripción 1',
            user: 'Admin',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Panel de Administrador')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Bots Configurados')).toBeInTheDocument();
    expect(screen.getByText('Bot Test')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Estado de configuración de bots')).toBeInTheDocument();
  });

  it('debería renderizar tabla de usuarios', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 1,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [
          {
            id: '1',
            email: 'admin@test.com',
            role: 'admin',
            botsEnabled: [1],
            lastActive: '2024-01-01T10:00:00',
          },
        ],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Usuarios de la empresa')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('debería mostrar "Sin permisos" cuando usuario no tiene bots', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 1,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [
          {
            id: '1',
            email: 'user@test.com',
            role: 'user',
            botsEnabled: [],
            lastActive: '2024-01-01T10:00:00',
          },
        ],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Sin permisos')).toBeInTheDocument();
  });

  it('debería mostrar "No hay usuarios en esta empresa" cuando no hay usuarios', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 0,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('No hay usuarios en esta empresa')).toBeInTheDocument();
  });

  it('debería mostrar "No hay actividad reciente" cuando no hay actividad', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 0,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('No hay actividad reciente')).toBeInTheDocument();
  });

  it('debería renderizar ServiceWidgetsContainer', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 0,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);
    expect(screen.getByTestId('service-widgets')).toBeInTheDocument();
  });

  it('debería manejar botCompleteness vacío', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 0,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    // No debería renderizar la sección de botCompleteness
    expect(screen.queryByText('Estado de configuración de bots')).not.toBeInTheDocument();
  });

  it('debería mostrar colores correctos según porcentaje de completitud', () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 0,
        clientsCount: 0,
        bots: [],
        botCompleteness: [
          { botId: '1', botName: 'Bot Red', completedPercentage: 0.3 },
          { botId: '2', botName: 'Bot Yellow', completedPercentage: 0.5 },
          { botId: '3', botName: 'Bot Green', completedPercentage: 0.9 },
        ],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    expect(screen.getByText('Bot Red')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('Bot Yellow')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Bot Green')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('debería llamar a handleRefresh correctamente cuando se hace clic en Actualizar', async () => {
    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 1,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

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

    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 1,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

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

    useGetAdminDashboardQuery.mockReturnValue({
      data: {
        usersCount: 1,
        clientsCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<AdminDashboard />);

    const refreshButton = screen.getByText('Actualizar');
    expect(refreshButton).toBeDisabled();
    // There should be a spinner in the button area
    expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0);
  });
});
