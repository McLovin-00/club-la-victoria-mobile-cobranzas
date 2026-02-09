/**
 * Tests de cobertura para LoginForm
 * Objetivo: Aumentar cobertura de 4.5% a 80%+
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Mock de react-router-dom navigate
const mockNavigate = jest.fn();
jest.unstable_mockModule('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom') as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock del login mutation
const mockLogin = jest.fn();
const mockUnwrap = jest.fn();
jest.unstable_mockModule('../../api/authApiSlice', () => ({
  useLoginMutation: () => [
    (credentials: unknown) => {
      mockLogin(credentials);
      return { unwrap: mockUnwrap };
    },
    { isLoading: false },
  ],
}));

// Mock de authSlice
jest.unstable_mockModule('../../authSlice', () => ({
  setCredentials: jest.fn((payload: unknown) => ({ type: 'auth/setCredentials', payload })),
  logout: jest.fn(() => ({ type: 'auth/logout' })),
}));

// Mock de apiSlice
jest.unstable_mockModule('../../../../store/apiSlice', () => ({
  apiSlice: {
    util: {
      resetApiState: jest.fn(() => ({ type: 'api/resetApiState' })),
    },
  },
}));

// Mock de documentosApiSlice
jest.unstable_mockModule('../../../documentos/api/documentosApiSlice', () => ({
  documentosApiSlice: {
    util: {
      resetApiState: jest.fn(() => ({ type: 'documentos/resetApiState' })),
    },
  },
}));

// Mock de Logger
jest.unstable_mockModule('../../../../lib/utils', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock de navigationUtils
jest.unstable_mockModule('../../navigationUtils', () => ({
  getDestinationByRole: jest.fn((role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return '/dashboard';
      case 'ADMIN_INTERNO':
        return '/portal/admin-interno';
      default:
        return '/';
    }
  }),
  getLoginErrorMessage: jest.fn((status: number) => {
    if (status === 401) return 'Credenciales inválidas';
    if (status === 403) return 'Usuario no autorizado';
    return 'Error al iniciar sesión';
  }),
  isValidRole: jest.fn((role: string) => {
    const validRoles = ['ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE', 'SUPERADMIN'];
    return validRoles.includes(role);
  }),
}));

// Dynamic import after mocks
const { LoginForm } = await import('../LoginForm');

// Store mock mínimo
const createMockStore = () =>
  configureStore({
    reducer: {
      auth: (state = { user: null, token: null }) => state,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });

// Wrapper de pruebas
const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>{component}</MemoryRouter>
    </Provider>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLogin.mockClear();
    mockUnwrap.mockClear();
  });

  describe('Renderizado inicial', () => {
    it('debe renderizar el formulario con campos email y password', () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    });

    it('debe renderizar los inputs con los tipos correctos', () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('debe tener autocomplete configurado correctamente', () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      expect(emailInput).toHaveAttribute('autocomplete', 'username');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  describe('Validación de formulario', () => {
    it('debe mostrar error cuando email está vacío al enviar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('El email es requerido')).toBeInTheDocument();
      });
    });

    it('debe mostrar error cuando password está vacío al enviar', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
      });
    });

    // Note: Email pattern validation with type="email" is handled by browser's native 
    // validation, which intercepts form submission before react-hook-form. We test
    // the other validation paths which cover the form validation logic.

    it('debe mostrar error cuando password tiene menos de 6 caracteres', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '12345');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('La contraseña debe tener al menos 6 caracteres')).toBeInTheDocument();
      });
    });
  });

  describe('Submit exitoso', () => {
    it('debe llamar a login con las credenciales correctas', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockResolvedValue({
        data: { role: 'SUPERADMIN' },
        token: 'test-token',
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@example.com',
          password: 'password123',
        });
      });
    });

    it('debe navegar al dashboard para SUPERADMIN', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockResolvedValue({
        data: { role: 'SUPERADMIN' },
        token: 'test-token',
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });

    it('debe navegar al portal admin-interno para ADMIN_INTERNO', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockResolvedValue({
        data: { role: 'ADMIN_INTERNO' },
        token: 'test-token',
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'admin@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/portal/admin-interno', { replace: true });
      });
    });
  });

  describe('Manejo de errores', () => {
    it('debe mostrar error cuando usuario no tiene rol válido', async () => {
      const user = userEvent.setup();
      const { isValidRole } = await import('../../navigationUtils') as { isValidRole: jest.Mock };
      isValidRole.mockReturnValueOnce(false);

      mockUnwrap.mockResolvedValue({
        data: { role: 'INVALID_ROLE' },
        token: 'test-token',
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Usuario no autorizado')).toBeInTheDocument();
      });
    });

    it('debe mostrar error 401 como credenciales inválidas', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockRejectedValue({ status: 401 });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
      });
    });

    it('debe mostrar error 403 como usuario no autorizado', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockRejectedValue({ status: 403 });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Usuario no autorizado')).toBeInTheDocument();
      });
    });

    it('debe mostrar error genérico para otros códigos de estado', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockRejectedValue({ status: 500 });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error al iniciar sesión')).toBeInTheDocument();
      });
    });

    it('debe manejar error sin objeto status', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error al iniciar sesión')).toBeInTheDocument();
      });
    });
  });

  describe('Estados de UI', () => {
    it('debe aplicar clases CSS correctamente al formulario', () => {
      renderWithProviders(<LoginForm />);

      const form = screen.getByRole('button', { name: /iniciar sesión/i }).closest('form');
      expect(form).toHaveClass('space-y-4', 'w-full', 'max-w-sm');
    });

    it('debe renderizar el botón con la clase w-full', () => {
      renderWithProviders(<LoginForm />);

      const button = screen.getByRole('button', { name: /iniciar sesión/i });
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Usuario sin rol', () => {
    it('debe mostrar error cuando data.role es null', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockResolvedValue({
        data: { role: null },
        token: 'test-token',
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Usuario no autorizado')).toBeInTheDocument();
      });
    });

    it('debe mostrar error cuando data.role es undefined', async () => {
      const user = userEvent.setup();
      mockUnwrap.mockResolvedValue({
        data: {},
        token: 'test-token',
      });

      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Contraseña');

      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Usuario no autorizado')).toBeInTheDocument();
      });
    });
  });
});
