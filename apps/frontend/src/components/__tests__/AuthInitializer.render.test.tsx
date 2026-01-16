import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// We use unstable_mockModule for services and hooks that are hard dependencies
// but we will try to NOT mock react-redux if possible, or mock it consistently.
// Actually, standardizing on unstable_mockModule is safer for ESM.

describe('AuthInitializer Render Test', () => {
    let state: any = {};
    let dispatch = jest.fn();
    let flagsDocumentos = true;
    const ws = { connect: jest.fn(), disconnect: jest.fn() };

    let AuthInitializer: React.FC<{ children: React.ReactNode }>;

    beforeAll(async () => {
        // Mock imports using ESM mocking
        await jest.unstable_mockModule('react-redux', () => ({
            useDispatch: () => dispatch,
            useSelector: (sel: any) => sel(state),
        }));

        await jest.unstable_mockModule('../../hooks/useServiceConfig', () => ({
            useServiceFlags: () => ({ documentos: flagsDocumentos }),
        }));

        await jest.unstable_mockModule('../../services/websocket.service', () => ({
            webSocketService: ws,
        }));

        // Import the component AFTER mocking
        const module = await import('../AuthInitializer');
        AuthInitializer = module.AuthInitializer;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        dispatch = jest.fn();
        flagsDocumentos = true;
        ws.connect.mockReset();
        ws.disconnect.mockReset();
    });

    it('SHOULD hit the file lines', async () => {
        state = { auth: { initialized: false, isAuthenticated: false, token: null } };

        render(
            <MemoryRouter>
                <AuthInitializer>
                    <div data-testid="child">child</div>
                </AuthInitializer>
            </MemoryRouter>
        );

        // This checks if the loader is rendered (since initialized=false)
        // The spinner is a div with class 'animate-spin'
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });
});
