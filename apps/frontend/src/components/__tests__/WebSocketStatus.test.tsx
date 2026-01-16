// Tests de `WebSocketStatus`: render según auth + polling con interval para estado/ID (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';

describe('WebSocketStatus', () => {
  let state: any = {};
  let isConnected = jest.fn();
  let getSocketId = jest.fn();

  let WebSocketStatus: React.FC;

  beforeAll(async () => {
    // Evitar side-effects al importar authSlice (lee localStorage).
    (globalThis as any).localStorage.getItem = jest.fn(() => null);

    await jest.unstable_mockModule('react-redux', () => ({
      useSelector: (sel: any) => sel(state),
    }));

    await jest.unstable_mockModule('../../services/websocket.service', () => ({
      webSocketService: {
        isConnected: (...args: any[]) => isConnected(...args),
        getSocketId: (...args: any[]) => getSocketId(...args),
      },
    }));

    ({ WebSocketStatus } = await import('../WebSocketStatus'));
  });

  beforeEach(() => {
    jest.useFakeTimers();
    state = { auth: { isAuthenticated: false } };
    isConnected = jest.fn();
    getSocketId = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('no renderiza nada si no está autenticado', () => {
    state = { auth: { isAuthenticated: false } };
    isConnected.mockReturnValue(false);
    getSocketId.mockReturnValue('');

    const { container } = render(<WebSocketStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra estado conectado + id y luego actualiza por interval', () => {
    state = { auth: { isAuthenticated: true } };

    // Primer check: conectado con id; segundo check: desconectado
    isConnected.mockReturnValueOnce(true).mockReturnValueOnce(false);
    getSocketId.mockReturnValueOnce('abcdef123').mockReturnValueOnce('');

    render(<WebSocketStatus />);

    expect(screen.getByText('Tiempo Real Activo')).toBeInTheDocument();
    expect(screen.getByText('abcdef')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Sin Conexión TR')).toBeInTheDocument();
  });
});


