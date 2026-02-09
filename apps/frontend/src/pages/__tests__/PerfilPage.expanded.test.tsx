/**
 * Tests expandidos para PerfilPage
 */
import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUser = { id: 1, email: 'user@test.com', role: 'admin', name: 'Test User', empresaId: 1 };
const mockDispatch = jest.fn();
const mockUpdateEmpresa = jest.fn();

jest.unstable_mockModule('react-redux', () => ({
    useSelector: (selector: unknown) => {
        if (typeof selector === 'function') {
            return selector({ auth: { user: mockUser } });
        }
        return mockUser;
    },
    useDispatch: () => mockDispatch,
}));

jest.unstable_mockModule('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
    MemoryRouter: ({ children }: any) => children,
}));

jest.unstable_mockModule('@/features/auth/authSlice', () => ({
    selectCurrentUser: (state: unknown) => (state as any)?.auth?.user || mockUser,
    selectIsSuperAdmin: () => false,
    setCredentials: jest.fn(),
}));

jest.unstable_mockModule('@/features/empresas/api/empresasApiSlice', () => ({
    useGetEmpresasQuery: () => ({ data: [], isLoading: false }),
}));

jest.unstable_mockModule('@/features/auth/api/authApiSlice', () => ({
    useUpdateUserEmpresaMutation: () => [mockUpdateEmpresa, { isLoading: false }],
}));

jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
    showToast: jest.fn(),
}));

jest.unstable_mockModule('@/lib/utils', () => ({
    Logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), log: jest.fn() },
}));

jest.unstable_mockModule('@/components/ChangePasswordForm', () => ({
    ChangePasswordForm: () => <div data-testid="change-password-form">ChangePasswordForm</div>,
}));

jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
    UserCircleIcon: () => <svg data-testid="user-icon" />,
    KeyIcon: () => <svg data-testid="key-icon" />,
    BuildingOfficeIcon: () => <svg data-testid="building-icon" />,
}));

const { PerfilPage } = await import('../PerfilPage');

describe('PerfilPage - Expandido', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renderiza título', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByText('Mi Perfil')).toBeTruthy();
    });

    it('muestra email deshabilitado', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        const emailInput = screen.getByDisplayValue('user@test.com');
        expect(emailInput).toBeDisabled();
    });

    it('muestra rol formateado', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByDisplayValue('Administrador')).toBeTruthy();
    });

    it('muestra sección de información personal', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByText('Información Personal')).toBeTruthy();
    });

    it('muestra sección de cambiar contraseña', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByText('Cambiar Contraseña')).toBeTruthy();
    });

    it('renderiza ChangePasswordForm', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByTestId('change-password-form')).toBeTruthy();
    });

    it('muestra mensaje de email no modificable', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByText('El email no puede ser modificado')).toBeTruthy();
    });

    it('muestra iconos', () => {
        render(<MemoryRouter><PerfilPage /></MemoryRouter>);
        expect(screen.getByTestId('user-icon')).toBeTruthy();
        expect(screen.getByTestId('key-icon')).toBeTruthy();
    });

    describe('Roles', () => {
        it('formatea rol admin', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByDisplayValue('Administrador')).toBeTruthy();
        });
    });
});
