/**
 * Smoke tests para UsuariosPage.lazy - Simplificado
 */
import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react';

// Mock de Logger
jest.unstable_mockModule('../../lib/utils', () => ({
    Logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

// Mock de UI components
jest.unstable_mockModule('../../components/ui/card', () => ({
    Card: ({ children }: any) => React.createElement('div', {}, children),
}));

jest.unstable_mockModule('../../components/ui/button', () => ({
    Button: ({ children }: any) => React.createElement('button', {}, children),
}));

jest.unstable_mockModule('../../components/ui/spinner', () => ({
    Spinner: () => React.createElement('div', {}, 'Loading...'),
}));

// Mock de heroicons
jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
    ExclamationTriangleIcon: () => React.createElement('svg', {}),
    ArrowPathIcon: () => React.createElement('svg', {}),
}));

// Mock de react-error-boundary
jest.unstable_mockModule('react-error-boundary', () => ({
    ErrorBoundary: ({ children }: any) => React.createElement('div', { 'data-testid': 'error-boundary' }, children),
}));

// Mock del componente UsuariosPage
jest.unstable_mockModule('../UsuariosPage', () => ({
    default: () => React.createElement('div', { 'data-testid': 'usuarios-page' }, 'UsuariosPage'),
}));

// Mock de usersApiSlice
jest.unstable_mockModule('../../features/users/api/usersApiSlice', () => ({
    usersApiSlice: { util: { prefetch: jest.fn() } },
}));

const { UsuariosPageLazy, usePreloadUsuarios, usePrefetchUsuariosData } = await import('../UsuariosPage.lazy');

describe('UsuariosPage.lazy (smoke)', () => {
    it('renderiza', () => {
        const { container } = render(React.createElement(UsuariosPageLazy));
        expect(container).toBeTruthy();
    });

    it('hooks funcionan', () => {
        const T1 = () => { usePreloadUsuarios(); return null; };
        const T2 = () => { usePrefetchUsuariosData(); return null; };

        render(React.createElement(T1));
        render(React.createElement(T2));

        expect(true).toBe(true);
    });

    it('exports correctos', () => {
        expect(typeof UsuariosPageLazy).toBe('function');
        expect(typeof usePreloadUsuarios).toBe('function');
        expect(typeof usePrefetchUsuariosData).toBe('function');
    });
});
