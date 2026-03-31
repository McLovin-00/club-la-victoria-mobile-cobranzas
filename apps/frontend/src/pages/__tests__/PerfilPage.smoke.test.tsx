/**
 * Smoke test para PerfilPage
 */
import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock de react-redux
const mockUser = { id: 1, email: 'user@test.com', role: 'USER', name: 'Test User', empresaId: 1 };
const mockDispatch = jest.fn();
jest.unstable_mockModule('react-redux', () => ({
    useSelector: (selector: unknown) => {
        if (typeof selector === 'function') {
            return selector({ auth: { user: mockUser } });
        }
        return mockUser;
    },
    useDispatch: () => mockDispatch,
}));

// Mock de react-router-dom
const mockNavigate = jest.fn();
jest.unstable_mockModule('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    MemoryRouter: ({ children }: any) => children,
}));

// Mock de authSlice
jest.unstable_mockModule('@/features/auth/authSlice', () => ({
    selectCurrentUser: (state: unknown) => (state as any)?.auth?.user || mockUser,
    selectIsSuperAdmin: () => false,
    setCredentials: jest.fn(),
    setCurrentUser: jest.fn(),
}));

// Mock de empresasApiSlice
jest.unstable_mockModule('@/features/empresas/api/empresasApiSlice', () => ({
    useGetEmpresasQuery: () => ({ data: [], isLoading: false }),
}));

// Mock de authApiSlice
jest.unstable_mockModule('@/features/auth/api/authApiSlice', () => ({
    useUpdateUserEmpresaMutation: () => [jest.fn(), { isLoading: false }],
    useUpdateProfileMutation: () => [jest.fn(), { isLoading: false }],
}));

// Mock de Toast
jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
    showToast: jest.fn(),
}));

// Mock de Logger
jest.unstable_mockModule('@/lib/utils', () => ({
    Logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

// Mock de ChangePasswordForm
jest.unstable_mockModule('@/components/ChangePasswordForm', () => ({
    ChangePasswordForm: () => <div data-testid="change-password-form">ChangePasswordForm</div>,
}));

// Mock de heroicons
jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
    UserCircleIcon: () => <svg data-testid="user-icon" />,
    KeyIcon: () => <svg data-testid="key-icon" />,
    BuildingOfficeIcon: () => <svg data-testid="building-icon" />,
}));

// Mock de PerfilMobile
jest.unstable_mockModule('@/components/transportistas/PerfilMobile', () => ({
    PerfilMobile: () => <div data-testid="perfil-mobile">PerfilMobile</div>,
}));

const { PerfilPage } = await import('../PerfilPage');

describe('PerfilPage (smoke)', () => {
    it('renderiza sin crashear', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByText('Mi Perfil')).toBeTruthy();
    });

    it('muestra email del usuario', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        const emailInput = screen.getByDisplayValue('user@test.com');
        expect(emailInput).toBeTruthy();
    });

    it('muestra formulario de cambio de contraseña', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByTestId('change-password-form')).toBeTruthy();
    });

    it('muestra información personal', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByText('Información Personal')).toBeTruthy();
    });

    it('exporta default', async () => {
        const module = await import('../PerfilPage');
        expect(module.PerfilPage).toBeDefined();
    });
});
