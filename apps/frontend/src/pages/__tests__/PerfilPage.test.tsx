/**
 * Tests para PerfilPage refactorizados para ESM
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// variables compartidas para mocks
const mockUser = { id: 1, email: 'test@test.com', role: 'admin', empresaId: 1 };

// Define mocks
jest.unstable_mockModule('../../features/auth/authSlice', () => ({
  selectCurrentUser: () => mockUser,
  selectIsSuperAdmin: () => false,
  setCredentials: jest.fn(),
}));

jest.unstable_mockModule('../../features/empresas/api/empresasApiSlice', () => ({
  useGetEmpresasQuery: () => ({
    data: [{ id: 1, nombre: 'Empresa Test' }],
    isLoading: false,
  }),
}));

jest.unstable_mockModule('../../features/auth/api/authApiSlice', () => ({
  useUpdateUserEmpresaMutation: () => [jest.fn(), { isLoading: false }],
}));

jest.unstable_mockModule('../../components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

jest.unstable_mockModule('../../lib/utils', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.unstable_mockModule('../../components/ChangePasswordForm', () => ({
  ChangePasswordForm: () => <div data-testid="change-password-form">ChangePasswordForm Mock</div>,
}));

// Import dynamic
const { PerfilPage } = await import('../PerfilPage');

// Store para tests
const createTestStore = () => configureStore({
  reducer: {
    auth: () => ({ user: mockUser }),
    ['authApi' as any]: (state = {}) => state,
    ['empresasApi' as any]: (state = {}) => state,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

const renderWithProviders = () => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <PerfilPage />
      </MemoryRouter>
    </Provider>
  );
};

describe('PerfilPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza el título Mi Perfil', () => {
    renderWithProviders();
    expect(screen.getByText('Mi Perfil')).toBeInTheDocument();
  });

  it('muestra la información del usuario', () => {
    renderWithProviders();
    // screen.debug(); 
    expect(screen.getByDisplayValue('test@test.com')).toBeInTheDocument();
  });

  it('renderiza el formulario de cambio de contraseña', () => {
    renderWithProviders();
    expect(screen.getByTestId('change-password-form')).toBeInTheDocument();
  });

  it('identifica el rol correctamente', () => {
    renderWithProviders();
    expect(screen.getByDisplayValue('Administrador')).toBeInTheDocument();
  });
});
