import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { render, act } from '@testing-library/react';

// Mocks minimos
jest.unstable_mockModule('../../lib/utils', () => ({ Logger: { error: jest.fn(), debug: jest.fn(), log: jest.fn(), warn: jest.fn() } }));
jest.unstable_mockModule('../../components/ui/card', () => ({ Card: () => null }));
jest.unstable_mockModule('../../components/ui/button', () => ({ Button: () => null }));
jest.unstable_mockModule('../../components/ui/spinner', () => ({ Spinner: () => null }));
jest.unstable_mockModule('@heroicons/react/24/outline', () => ({ ExclamationTriangleIcon: () => null, ArrowPathIcon: () => null }));
jest.unstable_mockModule('react-error-boundary', () => ({ ErrorBoundary: ({ children }: any) => children }));

// Mocks de functionalidad
const prefetchMock = jest.fn();
jest.unstable_mockModule('../../features/users/api/usersApiSlice', () => ({
    usersApiSlice: { util: { prefetch: prefetchMock } },
}));

jest.unstable_mockModule('../UsuariosPage', () => ({ default: () => null }));
jest.unstable_mockModule('../../features/users/components/UserTable.lazy', () => ({ default: () => null }));

const { usePreloadUsuarios, usePrefetchUsuariosData } = await import('../UsuariosPage.lazy');

describe('UsuariosPage.lazy Hooks Coverage', () => {
    it('usePrefetchUsuariosData llama a prefetch despues de 500ms', async () => {
        jest.useFakeTimers();
        const TestComp = () => {
            usePrefetchUsuariosData();
            return null;
        };
        render(React.createElement(TestComp));

        // Esperar flush de promesas (dynamic imports)
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        act(() => {
            jest.advanceTimersByTime(500);
        });

        expect(prefetchMock).toHaveBeenCalledWith('getUsuarios', undefined, { force: false });
        jest.useRealTimers();
    });

    it('usePreloadUsuarios triggers timeout (coverage)', async () => {
        jest.useFakeTimers();
        const TestComp = () => {
            usePreloadUsuarios();
            return null;
        };
        render(React.createElement(TestComp));

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        await act(async () => {
            jest.advanceTimersByTime(100);
            jest.useRealTimers();
            await new Promise(resolve => setTimeout(resolve, 10));
        });
    });
});
