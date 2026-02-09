/**
 * Comprehensive tests for UserDashboard component
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

describe('UserDashboard - Comprehensive Tests', () => {
  let UserDashboard: React.FC;

  beforeAll(async () => {
    // Mock the RTK Query hooks
    await jest.unstable_mockModule('@/features/dashboard/api/dashboardApiSlice', () => ({
      useGetUserDashboardQuery: () => ({
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
      ArrowPathIcon: ({ className }: any) => <span data-testid="refresh-icon" className={className} />,
    }));

    await jest.unstable_mockModule('@/features/dashboard/components/../../../components/ui/Toast.utils', () => ({
      showToast: mockShowToast,
    }));

    // Import the component after mocks are set up
    const module = await import('../UserDashboard');
    UserDashboard = module.UserDashboard;
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

      render(<UserDashboard />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when there is an error', () => {
      mockQueryError = new Error('Network error');

      render(<UserDashboard />);

      expect(screen.getByText('Error al cargar los datos del panel de control')).toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should display message when data is null', () => {
      mockQueryData = null;

      render(<UserDashboard />);

      expect(screen.getByText('No hay datos disponibles en este momento')).toBeInTheDocument();
    });
  });

  describe('Success State with Activity', () => {
    it('should display dashboard title and refresh button', () => {
      mockQueryData = {
        recentActivity: [],
      };

      render(<UserDashboard />);

      expect(screen.getByText('Mi Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Actualizar')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument();
    });

    it('should display activity section title', () => {
      mockQueryData = {
        recentActivity: [],
      };

      render(<UserDashboard />);

      expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
    });

    it('should display activity items when present', () => {
      mockQueryData = {
        recentActivity: [
          {
            id: '1',
            action: 'Login',
            user: 'test@example.com',
            timestamp: '2024-01-15T10:00:00Z',
            description: 'User logged in',
            type: 'auth',
          },
          {
            id: '2',
            action: 'Update Profile',
            user: 'test@example.com',
            timestamp: '2024-01-15T11:00:00Z',
            description: 'User updated profile',
            type: 'profile',
          },
        ],
      };

      render(<UserDashboard />);

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Update Profile')).toBeInTheDocument();
      expect(screen.getByText('User logged in')).toBeInTheDocument();
      expect(screen.getByText('User updated profile')).toBeInTheDocument();
    });

    it('should display timestamp in localized format', () => {
      mockQueryData = {
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

      render(<UserDashboard />);

      const timestamps = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/); // Localized date pattern
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  describe('Empty Activity State', () => {
    it('should display no activity message when recentActivity is empty', () => {
      mockQueryData = {
        recentActivity: [],
      };

      render(<UserDashboard />);

      expect(screen.getByText('No hay actividad reciente')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should show spinner in button while refreshing', () => {
      mockQueryData = {
        recentActivity: [],
      };
      mockRefreshIsLoading = true;

      render(<UserDashboard />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('refresh-icon')).not.toBeInTheDocument();
    });

    it('should call refresh and refetch when refresh button is clicked', async () => {
      mockQueryData = {
        recentActivity: [],
      };
      
      const mockUnwrap = jest.fn().mockResolvedValue({ success: true });
      mockRefreshMutation.mockReturnValue({ unwrap: mockUnwrap });

      render(<UserDashboard />);

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
        recentActivity: [],
      };
      
      const mockUnwrap = jest.fn().mockResolvedValue({ success: true });
      mockRefreshMutation.mockReturnValue({ unwrap: mockUnwrap });

      render(<UserDashboard />);

      const refreshButton = screen.getByText('Actualizar');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Dashboard actualizado correctamente', 'success');
      });
    });

    it('should log error and show error toast when refresh fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockQueryData = {
        recentActivity: [],
      };
      
      const mockError = new Error('Network error');
      const mockUnwrap = jest.fn().mockRejectedValue(mockError);
      mockRefreshMutation.mockReturnValue({ unwrap: mockUnwrap });

      render(<UserDashboard />);

      const refreshButton = screen.getByText('Actualizar');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error al actualizar dashboard:', mockError);
        expect(mockShowToast).toHaveBeenCalledWith('Error al actualizar dashboard', 'error');
      });

      consoleSpy.mockRestore();
    });

    it('should disable refresh button while refreshing', () => {
      mockQueryData = {
        recentActivity: [],
      };
      mockRefreshIsLoading = true;

      render(<UserDashboard />);

      const refreshButton = screen.getByText('Actualizar').closest('button');
      expect(refreshButton).toBeDisabled();
    });

    it('should not disable refresh button when not refreshing', () => {
      mockQueryData = {
        recentActivity: [],
      };
      mockRefreshIsLoading = false;

      render(<UserDashboard />);

      const refreshButton = screen.getByText('Actualizar').closest('button');
      expect(refreshButton).not.toBeDisabled();
    });
  });

  describe('Button Attributes', () => {
    it('should render button with correct variant and size', () => {
      mockQueryData = {
        recentActivity: [],
      };

      render(<UserDashboard />);

      const refreshButton = screen.getByText('Actualizar').closest('button');
      expect(refreshButton).toHaveAttribute('data-variant', 'outline');
      expect(refreshButton).toHaveAttribute('data-size', 'sm');
    });
  });
});
