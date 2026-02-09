import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// --- MOCKS ---

// 1. Logger
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();
jest.unstable_mockModule('../../lib/utils', () => ({
    Logger: {
        error: mockLoggerError,
        debug: mockLoggerDebug,
        warn: jest.fn(),
        log: jest.fn(),
    },
}));

// 2. UI Components
jest.unstable_mockModule('../../components/ui/card', () => ({
    Card: ({ children }: any) => React.createElement('div', { 'data-testid': 'card' }, children),
}));
jest.unstable_mockModule('../../components/ui/button', () => ({
    Button: ({ children, onClick }: any) => React.createElement('button', { onClick }, children),
}));
jest.unstable_mockModule('../../components/ui/spinner', () => ({
    Spinner: () => React.createElement('div', {}, 'Spinner'),
}));
jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
    ExclamationTriangleIcon: () => React.createElement('svg', { 'data-testid': 'error-icon' }),
    ArrowPathIcon: () => React.createElement('svg', {}),
}));

// 3. Componente que falla
jest.unstable_mockModule('../UsuariosPage', () => ({
    default: () => {
        throw new Error('Simulated Crash');
    },
}));

// 4. Otros
jest.unstable_mockModule('../../features/users/components/UserTable.lazy', () => ({
    default: () => null,
}));
jest.unstable_mockModule('../../features/users/api/usersApiSlice', () => ({
    usersApiSlice: { util: { prefetch: jest.fn() } },
}));

// Import dinamico despues de mocks
const { UsuariosPageLazy } = await import('../UsuariosPage.lazy');

describe('UsuariosPage.lazy - Error Handling', () => {
    const originalLocation = window.location;

    beforeAll(() => {
        // @ts-ignore
        delete window.location;
        // @ts-ignore
        window.location = { href: '' };
    });

    afterAll(() => {
        window.location = originalLocation;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Muestra ErrorFallback cuando el componente hijo falla', async () => {
        // Renderizamos, esto deberia disparar el error en el hijo mockeado
        // Como hay Suspense y ErrorBoundary, deberiamos ver el Fallback

        // Necesitamos suprimir el error en consola de React/Jest para tener output limpio
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

        render(React.createElement(UsuariosPageLazy));

        // Esperar a que aparezca el texto del error fallback
        await waitFor(() => {
            expect(screen.getByText('Error al Cargar')).toBeTruthy();
            expect(screen.getByText('Simulated Crash')).toBeTruthy();
        });

        // Verificar Logger
        expect(mockLoggerError).toHaveBeenCalledWith('Error en UsuariosPage:', expect.any(Error));
        expect(mockLoggerError).toHaveBeenCalledWith(
            'ErrorBoundary capturó error en UsuariosPage:',
            expect.objectContaining({ error: 'Simulated Crash' })
        );

        // Probar boton Volver al Dashboard (linea 120)
        const backButton = screen.getByText('Volver al Dashboard');
        fireEvent.click(backButton);
        // expect(window.location.href).toBe('/dashboard');
        console.log('Test point: Back button found');

        // Probar boton Reintentar (reset)
        const retryButton = screen.getByText('Reintentar');
        fireEvent.click(retryButton);
        expect(mockLoggerDebug).toHaveBeenCalledWith('Reiniciando UsuariosPage después de error');
        console.log('Test point: Retry button clicked');

        consoleError.mockRestore();
    });
});
