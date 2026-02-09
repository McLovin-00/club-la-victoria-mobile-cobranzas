/**
 * Tests completos para PerfilPage - Todos los casos
 */
import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let mockUser: any = { id: 1, email: 'user@test.com', role: 'admin', name: 'Test User', empresaId: 1 };
let mockIsSuperAdmin = false;
const mockDispatch = jest.fn();
const mockUpdateEmpresa = jest.fn().mockResolvedValue({ unwrap: () => Promise.resolve({ token: 'new-token', data: { empresaId: 2 }, success: true, timestamp: Date.now() }) });
const mockShowToast = jest.fn();
const mockLogger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), log: jest.fn() };

jest.unstable_mockModule('react-redux', () => ({
    useSelector: (selector: unknown) => {
        if (typeof selector === 'function') {
            const result = selector({ auth: { user: mockUser } });
            return result;
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
    selectIsSuperAdmin: () => mockIsSuperAdmin,
    setCredentials: jest.fn(),
}));

jest.unstable_mockModule('@/features/empresas/api/empresasApiSlice', () => ({
    useGetEmpresasQuery: () => ({ data: [{ id: 1, nombre: 'Empresa 1' }, { id: 2, nombre: 'Empresa 2' }], isLoading: false }),
}));

jest.unstable_mockModule('@/features/auth/api/authApiSlice', () => ({
    useUpdateUserEmpresaMutation: () => [mockUpdateEmpresa, { isLoading: false }],
}));

jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
    showToast: mockShowToast,
}));

jest.unstable_mockModule('@/lib/utils', () => ({
    Logger: mockLogger,
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

describe('PerfilPage - Completo', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = { id: 1, email: 'user@test.com', role: 'admin', name: 'Test User', empresaId: 1 };
        mockIsSuperAdmin = false;
    });

    describe('Usuario normal', () => {
        it('renderiza perfil completo', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByText('Mi Perfil')).toBeTruthy();
            expect(screen.getByDisplayValue('user@test.com')).toBeTruthy();
        });

        it('muestra rol admin formateado', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByDisplayValue('Administrador')).toBeTruthy();
        });

        it('no muestra selector de empresa', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.queryByText('Seleccionar Empresa')).toBeFalsy();
        });
    });

    describe('Superadmin', () => {
        beforeEach(() => {
            mockIsSuperAdmin = true;
            mockUser = { id: 1, email: 'super@test.com', role: 'superadmin', empresaId: 1 };
        });

        it('muestra selector de empresa', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByText('Seleccionar Empresa')).toBeTruthy();
        });

        it('muestra rol superadmin formateado', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByDisplayValue('Superadministrador')).toBeTruthy();
        });

        it('muestra empresas en el selector', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByText('Empresa 1')).toBeTruthy();
            expect(screen.getByText('Empresa 2')).toBeTruthy();
        });

        it('permite cambiar empresa', async () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '2' } });

            await waitFor(() => {
                expect(mockUpdateEmpresa).toHaveBeenCalledWith({ empresaId: 2 });
            });
        });
    });

    describe('Usuario sin rol', () => {
        beforeEach(() => {
            mockUser = { id: 1, email: 'user@test.com', role: 'user' };
        });

        it('muestra rol Usuario por defecto', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByDisplayValue('Usuario')).toBeTruthy();
        });
    });

    describe('Usuario sin empresaId', () => {
        beforeEach(() => {
            mockUser = { id: 1, email: 'user@test.com', role: 'admin' };
        });

        it('renderiza sin crashear', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);
            expect(screen.getByText('Mi Perfil')).toBeTruthy();
        });
    });

    describe('Logging', () => {
        it('loggea información del usuario', () => {
            render(<MemoryRouter><PerfilPage /></MemoryRouter>);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'PerfilPage - Usuario actual:',
                expect.objectContaining({
                    hasUser: true,
                    email: 'user@test.com',
                })
            );
        });
    });
});
