import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('AuthInitializer', () => {
  let state: any = {};
  let dispatch = jest.fn();
  let flagsDocumentos = true;
  let docsWsUrl = 'ws://localhost:8080/socket.io/';
  const ws = { connect: jest.fn(), disconnect: jest.fn() };

  let AuthInitializer: React.FC<{ children: React.ReactNode }>;

  beforeAll(async () => {
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

    await jest.unstable_mockModule('../../lib/runtimeEnv', () => ({
      getRuntimeEnv: (key: string) => (key === 'VITE_DOCUMENTOS_WS_URL' ? docsWsUrl : undefined),
      getRuntimeFlag: () => false,
    }));

    ({ AuthInitializer } = await import('../AuthInitializer'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dispatch = jest.fn();
    flagsDocumentos = true;
    docsWsUrl = 'ws://localhost:8080/socket.io/';
    ws.connect.mockReset();
    ws.disconnect.mockReset();
  });

  it('despacha initializeAuth cuando no está inicializado y muestra loader', async () => {
    state = { auth: { initialized: false, isAuthenticated: false, token: null } };

    render(
      <MemoryRouter>
        <AuthInitializer>
          <div>child</div>
        </AuthInitializer>
      </MemoryRouter>
    );

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining('initializeAuth') }));
    expect(screen.queryByText('child')).not.toBeInTheDocument();
  });

  it('redirige a /login si está inicializado pero no autenticado y no está en /login', async () => {
    state = { auth: { initialized: true, isAuthenticated: false, token: null } };

    render(
      <MemoryRouter>
        <AuthInitializer>
          <div>child</div>
        </AuthInitializer>
      </MemoryRouter>
    );

    expect(ws.disconnect).toHaveBeenCalled();
  });

  it('conecta WebSocket cuando está autenticado, hay token y documentos=true; y desconecta en cleanup', async () => {
    state = { auth: { initialized: true, isAuthenticated: true, token: 't' } };
    flagsDocumentos = true;

    const { unmount } = render(
      <MemoryRouter>
        <AuthInitializer>
          <div>child</div>
        </AuthInitializer>
      </MemoryRouter>
    );

    expect(ws.connect).toHaveBeenCalledWith('t');
    expect(screen.getByText('child')).toBeInTheDocument();

    unmount();
    expect(ws.disconnect).toHaveBeenCalled();
  });

  it('no conecta WebSocket cuando falta la URL de runtime', async () => {
    state = { auth: { initialized: true, isAuthenticated: true, token: 't' } };
    docsWsUrl = undefined as unknown as string;

    render(
      <MemoryRouter>
        <AuthInitializer>
          <div>child</div>
        </AuthInitializer>
      </MemoryRouter>
    );

    expect(ws.connect).not.toHaveBeenCalled();
    expect(ws.disconnect).toHaveBeenCalled();
  });
});


