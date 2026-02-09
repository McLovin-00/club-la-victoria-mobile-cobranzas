/**
 * Smoke tests expandidos para UsuariosPage - Cubre más casos
 */
import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

let mockUser: any = { id: 1, email: 'admin@test.com', role: 'ADMIN', empresa: { nombre: 'Test' } };

// Mock de react-redux
jest.unstable_mockModule('react-redux', () => ({
    useSelector: () => mockUser,
}));

// Mock de react-router-dom
const mockNavigate = jest.fn();
jest.unstable_mockModule('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

// Mock de authSlice
jest.unstable_mockModule('@/features/auth/authSlice', () => ({
    selectCurrentUser: (state: unknown) => state,
}));

// Mock de Toast
const mockShowToast = jest.fn();
jest.unstable_mockModule('@/components/ui/Toast.utils', () => ({
    showToast: mockShowToast,
}));

// Mock de Logger
const mockLogger = { warn: jest.fn(), debug: jest.fn(), error: jest.fn(), log: jest.fn() };
jest.unstable_mockModule('@/lib/utils', () => ({
    Logger: mockLogger,
}));

// Mock de UserTable.lazy
jest.unstable_mockModule('@/features/users/components/UserTable.lazy', () => ({
    UserTableLazy: ({ enablePerformanceMonitoring, enablePreloading }: any) =>
        React.createElement('div', { 'data-testid': 'user-table' }, `UserTable(perf:${enablePerformanceMonitoring},preload:${enablePreloading})`),
}));

// Mock de UI components
jest.unstable_mockModule('@/components/ui/card', () => ({
    Card: ({ children }: any) => React.createElement('div', { 'data-testid': 'card' }, children),
}));

jest.unstable_mockModule('@/components/ui/button', () => ({
    Button: ({ children, onClick }: any) => React.createElement('button', { onClick, 'data-testid': 'button' }, children),
}));

// Mock de heroicons
jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
    ShieldExclamationIcon: () => React.createElement('svg', { 'data-testid': 'shield-icon' }),
    ArrowLeftIcon: () => React.createElement('svg', { 'data-testid': 'arrow-icon' }),
}));

const { UsuariosPage } = await import('../UsuariosPage');

describe('UsuariosPage - Casos completos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = { id: 1, email: 'admin@test.com', role: 'ADMIN', empresa: { nombre: 'Test' } };
    });

    describe('Usuario ADMIN', () => {
        it('renderiza página completa', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText(/Gestión de Usuarios/i)).toBeTruthy();
            expect(screen.getByText('Dashboard')).toBeTruthy();
            expect(screen.getByText(/admin@test.com/)).toBeTruthy();
            expect(screen.getByTestId('user-table')).toBeTruthy();
        });

        it('muestra inicial del email', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText('A')).toBeTruthy();
        });

        it('muestra empresa', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText(/Test/)).toBeTruthy();
        });

        it('pasa props correctas a UserTable', () => {
            render(React.createElement(UsuariosPage));
            const table = screen.getByTestId('user-table');
            expect(table.textContent).toContain('perf:true');
            expect(table.textContent).toContain('preload:true');
        });

        it('navega al dashboard al hacer click', () => {
            render(React.createElement(UsuariosPage));
            const dashboardLink = screen.getByText('Dashboard');
            fireEvent.click(dashboardLink);
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });

        it('loggea acceso exitoso', () => {
            render(React.createElement(UsuariosPage));
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Acceso autorizado a gestión de usuarios',
                expect.objectContaining({ userId: 1, userRole: 'ADMIN' })
            );
        });
    });

    describe('Usuario SUPERADMIN', () => {
        beforeEach(() => {
            mockUser = { id: 2, email: 'super@test.com', role: 'SUPERADMIN' };
        });

        it('permite acceso', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByTestId('user-table')).toBeTruthy();
            expect(screen.queryByText('Acceso Restringido')).toBeFalsy();
        });

        it('muestra rol correcto', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText(/SUPERADMIN/)).toBeTruthy();
        });
    });

    describe('Usuario sin permisos', () => {
        beforeEach(() => {
            mockUser = { id: 3, email: 'user@test.com', role: 'USER' };
        });

        it('muestra acceso denegado', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText('Acceso Restringido')).toBeTruthy();
        });

        it('muestra mensaje explicativo', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText(/No tienes permisos/)).toBeTruthy();
        });

        it('muestra rol actual', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText('USER')).toBeTruthy();
        });

        it('tiene botón volver', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.getByText('Volver al Dashboard')).toBeTruthy();
        });

        it('loggea advertencia', () => {
            render(React.createElement(UsuariosPage));
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Usuario sin permisos intentando acceder a gestión de usuarios',
                expect.objectContaining({ userRole: 'USER' })
            );
        });
    });

    describe('Sin usuario', () => {
        beforeEach(() => {
            mockUser = null;
        });

        it('muestra pantalla de carga', () => {
            render(React.createElement(UsuariosPage));
            const cards = screen.getAllByTestId('card');
            expect(cards.length).toBeGreaterThan(0);
        });

        it('loggea advertencia', () => {
            render(React.createElement(UsuariosPage));
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Usuario no autenticado intentando acceder a gestión de usuarios'
            );
        });
    });

    describe('Usuario sin empresa', () => {
        beforeEach(() => {
            mockUser = { id: 1, email: 'admin@test.com', role: 'ADMIN' };
        });

        it('no muestra empresa', () => {
            render(React.createElement(UsuariosPage));
            expect(screen.queryByText(/Empresa:/)).toBeFalsy();
        });
    });

    describe('Diferentes emails', () => {
        it('inicial T', () => {
            mockUser = { id: 1, email: 'test@test.com', role: 'ADMIN' };
            render(React.createElement(UsuariosPage));
            expect(screen.getByText('T')).toBeTruthy();
        });

        it('inicial U', () => {
            mockUser = { id: 1, email: 'user@test.com', role: 'ADMIN' };
            const { unmount } = render(React.createElement(UsuariosPage));
            expect(screen.getByText('U')).toBeTruthy();
            unmount();
        });
    });
});
