/**
 * Tests for UserModal handleSubmit function - ACTUAL component coverage
 *
 * These tests import and render the actual UserModal component to ensure
 * proper coverage of handleSubmit, error handling, and all status codes.
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { UserModalProps } from '../../types';

// Mock implementations
let mockCreateUser: jest.Mock;
let mockUpdateUser: jest.Mock;
let mockShowToast: jest.Mock;
let mockLoggerDebug: jest.Mock;
let mockLoggerError: jest.Mock;
let mockOnClose: jest.Mock;

describe('UserModal - handleSubmit coverage', () => {
  let UserModal: React.FC<UserModalProps>;

  beforeAll(async () => {
    // Initialize mocks
    mockCreateUser = jest.fn();
    mockUpdateUser = jest.fn();
    mockShowToast = jest.fn();
    mockLoggerDebug = jest.fn();
    mockLoggerError = jest.fn();
    mockOnClose = jest.fn();

    // Mock empresasApiSlice
    jest.unstable_mockModule('../../../empresas/api/empresasApiSlice', () => ({
      useGetEmpresasQuery: () => ({
        data: [{ id: 1, nombre: 'Empresa Test' }],
        isLoading: false,
      }),
    }));

    // Mock usersApiSlice with dynamic mocks
    jest.unstable_mockModule('../../api/usersApiSlice', () => ({
      useCreateUserMutation: () => [mockCreateUser, { isLoading: false }],
      useUpdateUserMutation: () => [mockUpdateUser, { isLoading: false }],
    }));

    // Mock Toast.utils
    jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
      showToast: (...args: unknown[]) => mockShowToast(...args),
    }));

    // Mock Logger
    jest.unstable_mockModule('../../../../lib/utils', () => ({
      Logger: {
        debug: (...args: unknown[]) => mockLoggerDebug(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
        warn: jest.fn(),
        info: jest.fn(),
        performance: jest.fn(),
      },
    }));

    // Mock UserForm to capture and call onSubmit
    jest.unstable_mockModule('../UserForm', () => ({
      UserForm: ({
        mode,
        user,
        onSubmit,
        onClose,
        isLoading,
      }: {
        mode: string;
        user?: unknown;
        empresas?: unknown[];
        onSubmit: (data: unknown) => void;
        onClose: () => void;
        isLoading?: boolean;
      }) => (
        <div data-testid="user-form">
          <span data-testid="form-mode">{mode}</span>
          <span data-testid="form-loading">{isLoading ? 'loading' : 'ready'}</span>
          <button
            data-testid="submit-create"
            onClick={() =>
              onSubmit({
                email: 'test@test.com',
                password: 'Test123',
                role: 'user',
                empresaId: 1,
              })
            }
          >
            Submit Create
          </button>
          <button
            data-testid="submit-edit"
            onClick={() =>
              onSubmit({
                email: 'updated@test.com',
                role: 'admin',
                empresaId: 2,
              })
            }
          >
            Submit Edit
          </button>
          <button data-testid="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      ),
    }));

    // Import the actual component AFTER mocking
    const module = await import('../UserModal');
    UserModal = module.UserModal;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnClose.mockReset();
    mockCreateUser.mockReset();
    mockUpdateUser.mockReset();
    mockShowToast.mockReset();
    mockLoggerDebug.mockReset();
    mockLoggerError.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(<UserModal isOpen={false} mode="create" onClose={mockOnClose} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders modal when isOpen is true', () => {
      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      expect(screen.getByTestId('user-form')).toBeTruthy();
    });

    it('renders in create mode', () => {
      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      expect(screen.getByTestId('form-mode').textContent).toBe('create');
    });

    it('renders in edit mode with user', () => {
      const user = { id: 1, email: 'test@test.com', role: 'user' as const };
      render(<UserModal isOpen={true} mode="edit" user={user} onClose={mockOnClose} />);

      expect(screen.getByTestId('form-mode').textContent).toBe('edit');
    });

    it('calls onClose when backdrop is clicked', () => {
      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('handleSubmit - Create Mode Success', () => {
    it('calls createUser on successful create', async () => {
      const mockResponse = { data: { id: 1, email: 'test@test.com', role: 'user' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.resolve(mockResponse) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalled();
      });
    });

    it('shows success toast on create success', async () => {
      const mockResponse = { data: { id: 1, email: 'test@test.com', role: 'user' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.resolve(mockResponse) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Usuario creado exitosamente', 'success');
      });
    });

    it('calls onClose after successful create', async () => {
      const mockResponse = { data: { id: 1, email: 'test@test.com', role: 'user' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.resolve(mockResponse) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('logs debug info on successful create', async () => {
      const mockResponse = { data: { id: 1, email: 'test@test.com', role: 'user' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.resolve(mockResponse) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockLoggerDebug).toHaveBeenCalled();
      });
    });
  });

  describe('handleSubmit - Edit Mode Success', () => {
    it('calls updateUser on successful edit', async () => {
      const user = { id: 1, email: 'test@test.com', role: 'user' as const };
      const mockResponse = { data: { id: 1, email: 'updated@test.com', role: 'admin' } };
      mockUpdateUser.mockReturnValue({ unwrap: () => Promise.resolve(mockResponse) });

      render(<UserModal isOpen={true} mode="edit" user={user} onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-edit'));
      });

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          id: 1,
          data: expect.objectContaining({ email: 'updated@test.com' }),
        });
      });
    });

    it('shows success toast on edit success', async () => {
      const user = { id: 1, email: 'test@test.com', role: 'user' as const };
      const mockResponse = { data: { id: 1, email: 'updated@test.com', role: 'admin' } };
      mockUpdateUser.mockReturnValue({ unwrap: () => Promise.resolve(mockResponse) });

      render(<UserModal isOpen={true} mode="edit" user={user} onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-edit'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Usuario actualizado exitosamente', 'success');
      });
    });

    it('calls onClose after successful edit', async () => {
      const user = { id: 1, email: 'test@test.com', role: 'user' as const };
      const mockResponse = { data: { id: 1, email: 'updated@test.com', role: 'admin' } };
      mockUpdateUser.mockReturnValue({ unwrap: () => Promise.resolve(mockResponse) });

      render(<UserModal isOpen={true} mode="edit" user={user} onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-edit'));
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('handleSubmit - Invalid Modal State', () => {
    it('shows error toast when edit mode has no user', async () => {
      render(<UserModal isOpen={true} mode="edit" user={null} onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-edit'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error: Estado de modal inválido', 'error');
      });
    });

    it('logs error when modal state is invalid', async () => {
      render(<UserModal isOpen={true} mode="edit" user={null} onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-edit'));
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith('Estado de modal inválido');
      });
    });

    it('does NOT call onClose when modal state is invalid', async () => {
      render(<UserModal isOpen={true} mode="edit" user={null} onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-edit'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });

      // onClose should NOT be called
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('handleSubmit - Error 400 (Validation)', () => {
    it('shows validation errors from data.errors array', async () => {
      const validationError = {
        status: 400,
        data: {
          errors: [
            { field: 'email', message: 'Email inválido' },
            { field: 'password', message: 'Password muy corto' },
          ],
        },
      };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(validationError) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Errores de validación: Email inválido, Password muy corto',
          'error'
        );
      });
    });

    it('falls back to data.message for 400 errors', async () => {
      const error = {
        status: 400,
        data: { message: 'Error de validación general' },
      };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error de validación general', 'error');
      });
    });

    it('shows generic message for 400 without details', async () => {
      const error = { status: 400, data: {} };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Datos inválidos. Verifica la información ingresada.',
          'error'
        );
      });
    });
  });

  describe('handleSubmit - Error 401 (Unauthorized)', () => {
    it('shows session expired toast for 401', async () => {
      const error = { status: 401, data: { message: 'Unauthorized' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Sesión expirada. Por favor, inicia sesión nuevamente.',
          'error'
        );
      });
    });
  });

  describe('handleSubmit - Error 403 (Forbidden)', () => {
    it('shows no permissions toast for 403', async () => {
      const error = { status: 403, data: { message: 'Forbidden' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'No tienes permisos para realizar esta acción',
          'error'
        );
      });
    });
  });

  describe('handleSubmit - Error 409 (Conflict)', () => {
    it('shows email already registered toast for 409', async () => {
      const error = { status: 409, data: { message: 'Conflict' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('El email ya está registrado', 'error');
      });
    });
  });

  describe('handleSubmit - Error 422 (Unprocessable)', () => {
    it('shows invalid data toast for 422', async () => {
      const error = { status: 422, data: { message: 'Unprocessable Entity' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Los datos proporcionados no son válidos',
          'error'
        );
      });
    });
  });

  describe('handleSubmit - Error 500 (Server)', () => {
    it('shows server error toast for 500', async () => {
      const error = { status: 500, data: { message: 'Internal Server Error' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Error interno del servidor. Inténtalo más tarde.',
          'error'
        );
      });
    });
  });

  describe('handleSubmit - Default RTK Error', () => {
    it('shows data.message for unknown status codes', async () => {
      const error = { status: 418, data: { message: "I'm a teapot" } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith("I'm a teapot", 'error');
      });
    });

    it('shows data.error for unknown status codes without message', async () => {
      const error = { status: 418, data: { error: 'Teapot error' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Teapot error', 'error');
      });
    });

    it('shows generic toast for unknown status without data', async () => {
      const error = { status: 418, data: {} };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Error al guardar usuario. Inténtalo de nuevo.',
          'error'
        );
      });
    });
  });

  describe('handleSubmit - Network/Error Instance', () => {
    it('shows connection error for Error instances', async () => {
      const error = new Error('Network error');
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Error de conexión. Verifica tu conexión a internet.',
          'error'
        );
      });
    });

    it('logs error message for Error instances', async () => {
      const error = new Error('Network error');
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Error de red o aplicación:',
          'Network error'
        );
      });
    });
  });

  describe('handleSubmit - Unknown Error Type', () => {
    it('shows generic toast for unknown errors', async () => {
      const error = 'string error';
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error inesperado. Inténtalo de nuevo.', 'error');
      });
    });

    it('logs unknown error', async () => {
      const error = { unknown: 'structure' };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(error) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith('Error desconocido:', expect.anything());
      });
    });
  });

  describe('isRTKQueryError type guard', () => {
    it('correctly identifies RTK Query errors', async () => {
      const rtkError = { status: 400, data: { message: 'Error' } };
      mockCreateUser.mockReturnValue({ unwrap: () => Promise.reject(rtkError) });

      render(<UserModal isOpen={true} mode="create" onClose={mockOnClose} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-create'));
      });

      // Should use RTK path, not generic error path
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Error', 'error');
      });
    });
  });
});
