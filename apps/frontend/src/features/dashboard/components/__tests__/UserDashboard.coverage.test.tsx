/**
 * Tests de cobertura para UserDashboard usando jest.unstable_mockModule
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('UserDashboard - Coverage', () => {
  let UserDashboard: React.FC;
  let useGetUserDashboardQuery: jest.Mock;
  let useRefreshDashboardMutation: jest.Mock;

  const mockRefetch = jest.fn();
  const mockRefresh = jest.fn();
  const mockShowToast = jest.fn();

  beforeAll(async () => {
    // Crear funciones mock para los hooks
    useGetUserDashboardQuery = jest.fn();
    useRefreshDashboardMutation = jest.fn();

    // Mock del módulo de API
    await jest.unstable_mockModule('@/features/dashboard/api/dashboardApiSlice', () => ({
      useGetUserDashboardQuery: (...args: unknown[]) => useGetUserDashboardQuery(...args),
      useRefreshDashboardMutation: (...args: unknown[]) => useRefreshDashboardMutation(...args),
    }));

    // Mock de componentes UI
    await jest.unstable_mockModule('@/components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
      showToast: (...args: unknown[]) => mockShowToast(...args),
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
      ArrowPathIcon: ({ className }: any) => <span className={className}>RefreshIcon</span>,
    }));

    // Importar el componente después de mockear dependencias
    const module = await import('../UserDashboard');
    UserDashboard = module.UserDashboard;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetUserDashboardQuery.mockReturnValue({
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
    expect(UserDashboard).toBeDefined();
  });

  it('debería mostrar spinner durante carga', () => {
    useGetUserDashboardQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<UserDashboard />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('debería mostrar mensaje de error', () => {
    useGetUserDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: { status: 500 },
      refetch: mockRefetch,
    });

    render(<UserDashboard />);
    expect(screen.getByText(/Error al cargar los datos del panel de control/)).toBeInTheDocument();
  });

  it('debería mostrar mensaje de no datos disponibles', () => {
    useGetUserDashboardQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<UserDashboard />);
    expect(screen.getByText(/No hay datos disponibles en este momento/)).toBeInTheDocument();
  });

  it('debería renderizar dashboard con datos', () => {
    useGetUserDashboardQuery.mockReturnValue({
      data: {
        recentActivity: [
          {
            id: '1',
            action: 'Acción 1',
            timestamp: '2024-01-01T10:00:00',
            description: 'Descripción 1',
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<UserDashboard />);
    expect(screen.getByText('Mi Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
    expect(screen.getByText('Acción 1')).toBeInTheDocument();
  });

  it('debería mostrar mensaje cuando no hay actividad reciente', () => {
    useGetUserDashboardQuery.mockReturnValue({
      data: {
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<UserDashboard />);
    expect(screen.getByText('No hay actividad reciente')).toBeInTheDocument();
  });

  it('debería llamar a handleRefresh al hacer click en Actualizar', async () => {
    const unwrapMock = jest.fn().mockResolvedValue({ success: true });
    mockRefresh.mockReturnValue({ unwrap: unwrapMock });

    useRefreshDashboardMutation.mockReturnValue([
      mockRefresh,
      { isLoading: false },
    ]);

    useGetUserDashboardQuery.mockReturnValue({
      data: {
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<UserDashboard />);

    const refreshButton = screen.getByText('Actualizar').closest('button');
    if (refreshButton) {
      await fireEvent.click(refreshButton);
    }

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('debería mostrar spinner de carga en botón durante refresh', () => {
    useRefreshDashboardMutation.mockReturnValue([
      mockRefresh,
      { isLoading: true },
    ]);

    useGetUserDashboardQuery.mockReturnValue({
      data: {
        recentActivity: [],
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(<UserDashboard />);

    const buttonSpinner = screen.getAllByTestId('spinner').find(el => el.textContent === 'Spinner');
    expect(buttonSpinner).toBeDefined();
  });
});
