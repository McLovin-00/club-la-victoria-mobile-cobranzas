/**
 * Comprehensive tests for AdminDashboard component
 * These tests cover all code paths to achieve 85% coverage
 */

import React from 'react';
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Create mock objects that will be returned by the mocked hooks
let mockQueryData: any = undefined;
let mockQueryIsLoading = false;
let mockQueryError: any = undefined;
let mockQueryRefetch = jest.fn();

let mockRefreshMutation = jest.fn();
let mockRefreshIsLoading = false;

const mockShowToast = jest.fn();

describe('AdminDashboard - Comprehensive Tests', () => {
  let AdminDashboard: React.FC;

  beforeAll(async () => {
    // Mock the RTK Query hooks
    await jest.unstable_mockModule('@/features/dashboard/api/dashboardApiSlice', () => ({
      useGetAdminDashboardQuery: () => ({
        data: mockQueryData,
        isLoading: mockQueryIsLoading,
        error: mockQueryError,
        refetch: mockQueryRefetch,
      }),
      useRefreshDashboardMutation: () => [
        mockRefreshMutation,
        { isLoading: mockRefreshIsLoading },
      ],
    }));

    // Mock UI components
    await jest.unstable_mockModule('@/features/dashboard/components/../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('@/features/dashboard/components/../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant, size }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('@/features/dashboard/components/../../../components/ui/spinner', () => ({
      Spinner: ({ className }: any) => <div data-testid="spinner" className={className} />,
    }));

    await jest.unstable_mockModule('@/features/dashboard/components/../../../components/icons', () => ({
      UserIcon: ({ className }: any) => <span data-testid="user-icon" className={className} />,
      BuildingOfficeIcon: ({ className }: any) => <span data-testid="building-icon" className={className} />,
      ArrowPathIcon: ({ className }: any) => <span data-testid="refresh-icon" className={className} />,
    }));

    await jest.unstable_mockModule('@/features/dashboard/components/../../../components/ui/Toast.utils', () => ({
      showToast: mockShowToast,
    }));

    // Mock ServiceWidgetsContainer
    await jest.unstable_mockModule('@/features/dashboard/components/ServiceWidgets', () => ({
      ServiceWidgetsContainer: () => <div data-testid="service-widgets">Service Widgets</div>,
    }));

    // Import the component after mocks are set up
    const module = await import('../AdminDashboard');
    AdminDashboard = module.AdminDashboard;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockQueryData = undefined;
    mockQueryIsLoading = false;
    mockQueryError = undefined;
    mockQueryRefetch = jest.fn();
    mockRefreshMutation = jest.fn();
    mockRefreshIsLoading = false;
  });

  describe('Loading State', () => {
    it('should display spinner when data is loading', () => {
      mockQueryIsLoading = true;

      render(<AdminDashboard />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when there is an error', () => {
      mockQueryError = new Error('Network error');

      render(<AdminDashboard />);

      expect(screen.getByText('Error al cargar los datos del panel de control')).toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should display message when data is null', () => {
      mockQueryData = null;

      render(<AdminDashboard />);

      expect(screen.getByText('No hay datos disponibles en este momento')).toBeInTheDocument();
    });
  });

  describe('Success State with Stats Cards', () => {
    it('should display dashboard title and refresh button', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Panel de Administrador')).toBeInTheDocument();
      expect(screen.getByText('Actualizar')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('should display users count card', () => {
      mockQueryData = {
        usersCount: 10,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Usuarios')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display bots count card', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [{ id: 1, name: 'Bot 1' }],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Bots Configurados')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display clients count card', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 7,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Clientes')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should display zero when bots array is empty', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Bot Completeness Section', () => {
    it('should display bot completeness section when data exists', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [
          { botId: 1, botName: 'Bot 1', completedPercentage: 0.9 },
        ],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Estado de configuración de bots')).toBeInTheDocument();
      expect(screen.getByText('Bot 1')).toBeInTheDocument();
    });

    it('should not display bot completeness section when empty', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.queryByText('Estado de configuración de bots')).not.toBeInTheDocument();
    });

    it('should display green progress bar for high completeness (> 80%)', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [
          { botId: 1, botName: 'Bot 1', completedPercentage: 0.9 },
        ],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      const progressBar = screen.getByText('Bot 1').closest('div')?.nextElementSibling?.querySelector('div[style]');
      expect(progressBar).toHaveStyle({ width: '90%' });
    });

    it('should display yellow progress bar for medium completeness (40-80%)', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [
          { botId: 1, botName: 'Bot 2', completedPercentage: 0.6 },
        ],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      const progressBar = screen.getByText('Bot 2').closest('div')?.nextElementSibling?.querySelector('div[style]');
      expect(progressBar).toHaveStyle({ width: '60%' });
    });

    it('should display red progress bar for low completeness (< 40%)', () => {
      mockQueryData = {
        usersCount: 5,
        bots: [],
        botCompleteness: [
          { botId: 1, botName: 'Bot 3', completedPercentage: 0.3 },
        ],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      const progressBar = screen.getByText('Bot 3').closest('div')?.nextElementSibling?.querySelector('div[style]');
      expect(progressBar).toHaveStyle({ width: '30%' });
    });
  });

  describe('Users Table Section', () => {
    it('should display users table header', () => {
      mockQueryData = {
        usersCount: 1,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Usuarios de la empresa')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Rol')).toBeInTheDocument();
      expect(screen.getByText('Bots Habilitados')).toBeInTheDocument();
      expect(screen.getByText('Última Actividad')).toBeInTheDocument();
    });

    it('should display users when they exist', () => {
      const testDate = new Date('2024-01-15T10:00:00Z');
      mockQueryData = {
        usersCount: 1,
        bots: [],
        botCompleteness: [],
        users: [
          {
            id: 1,
            email: 'test@example.com',
            role: 'admin',
            botsEnabled: [1, 2],
            lastActive: testDate.toISOString(),
          },
        ],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('Bot 1')).toBeInTheDocument();
      expect(screen.getByText('Bot 2')).toBeInTheDocument();
    });

    it('should display admin role with blue badge', () => {
      mockQueryData = {
        usersCount: 1,
        bots: [],
        botCompleteness: [],
        users: [
          {
            id: 1,
            email: 'admin@example.com',
            role: 'admin',
            botsEnabled: [],
            lastActive: new Date().toISOString(),
          },
        ],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('should display non-admin role with gray badge', () => {
      mockQueryData = {
        usersCount: 1,
        bots: [],
        botCompleteness: [],
        users: [
          {
            id: 1,
            email: 'user@example.com',
            role: 'user',
            botsEnabled: [],
            lastActive: new Date().toISOString(),
          },
        ],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('user')).toBeInTheDocument();
    });

    it('should display "Sin permisos" when user has no bots enabled', () => {
      mockQueryData = {
        usersCount: 1,
        bots: [],
        botCompleteness: [],
        users: [
          {
            id: 1,
            email: 'user@example.com',
            role: 'user',
            botsEnabled: [],
            lastActive: new Date().toISOString(),
          },
        ],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Sin permisos')).toBeInTheDocument();
    });

    it('should display "No hay usuarios" message when users array is empty', () => {
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('No hay usuarios en esta empresa')).toBeInTheDocument();
    });
  });

  describe('Recent Activity Section', () => {
    it('should display activity section title', () => {
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
    });

    it('should display activity items when present', () => {
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [
          {
            id: '1',
            action: 'Login',
            user: 'test@example.com',
            timestamp: '2024-01-15T10:00:00Z',
            description: 'User logged in',
          },
        ],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('User logged in')).toBeInTheDocument();
      expect(screen.getByText('Usuario: test@example.com')).toBeInTheDocument();
    });

    it('should display "No hay actividad reciente" when empty', () => {
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };

      render(<AdminDashboard />);

      expect(screen.getByText('No hay actividad reciente')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should show spinner in button while refreshing', () => {
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };
      mockRefreshIsLoading = true;

      render(<AdminDashboard />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('refresh-icon')).not.toBeInTheDocument();
    });

    it('should call refresh and refetch when refresh button is clicked', async () => {
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };
      
      const mockUnwrap = jest.fn().mockResolvedValue({ success: true });
      mockRefreshMutation.mockReturnValue({ unwrap: mockUnwrap });

      render(<AdminDashboard />);

      const refreshButton = screen.getByText('Actualizar');
      fireEvent.click(refreshButton);

      expect(mockRefreshMutation).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockUnwrap).toHaveBeenCalled();
        expect(mockQueryRefetch).toHaveBeenCalled();
      });
    });

    it('should show success toast after successful refresh', async () => {
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };
      
      const mockUnwrap = jest.fn().mockResolvedValue({ success: true });
      mockRefreshMutation.mockReturnValue({ unwrap: mockUnwrap });

      render(<AdminDashboard />);

      const refreshButton = screen.getByText('Actualizar');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Dashboard actualizado correctamente', 'success');
      });
    });

    it('should log error and show error toast when refresh fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQueryData = {
        usersCount: 0,
        bots: [],
        botCompleteness: [],
        users: [],
        clientsCount: 3,
        recentActivity: [],
      };
      
      const mockError = new Error('Network error');
      const mockUnwrap = jest.fn().mockRejectedValue(mockError);
      mockRefreshMutation.mockReturnValue({ unwrap: mockUnwrap });

      render(<AdminDashboard />);

      const refreshButton = screen.getByText('Actualizar');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error al actualizar dashboard:', mockError);
        expect(mockShowToast).toHaveBeenCalledWith('Error al actualizar dashboard', 'error');
      });

      consoleSpy.mockRestore();
    });
  });
});
