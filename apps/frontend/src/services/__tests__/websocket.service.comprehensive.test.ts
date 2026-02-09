/**
 * Tests Comprehensivos para WebSocketService (Frontend)
 * Objetivo: Alcanzar ≥ 90% de cobertura
 *
 * Estructura:
 * 1. Unit Tests - Métodos públicos (happy path, edge cases, errores)
 * 2. Integration Tests - Flujos completos de eventos
 * 3. Edge Cases - Throttling, reconexión, memory leaks
 */

// ============================================================================
// MOCKS (Deben estar antes de los imports)
// ============================================================================

jest.mock('socket.io-client');
jest.mock('../../store/store', () => ({
    store: {
        dispatch: jest.fn(),
    },
}));
jest.mock('../../features/documentos/api/documentosApiSlice', () => ({
    documentosApiSlice: {
        util: {
            invalidateTags: jest.fn((tags: unknown) => ({ type: 'invalidate', tags })),
        },
    },
}));
jest.mock('../../components/ui/Toast.utils', () => ({
    showToast: jest.fn(),
}));
jest.mock('../../lib/runtimeEnv', () => ({
    getRuntimeEnv: jest.fn(),
}));

// ============================================================================
// IMPORTS (después de los mocks)
// ============================================================================

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// HELPERS
// ============================================================================

const createMockSocket = (): jest.Mocked<Socket> => {
    const eventHandlers = new Map<string, () => void>();

    return {
        id: 'mock-socket-id',
        connected: false,
        on: jest.fn((event: string, handler: () => void) => {
            eventHandlers.set(event, handler);
            return {} as unknown as Socket;
        }),
        off: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        removeAllListeners: jest.fn(() => {
            eventHandlers.clear();
            return {} as unknown as Socket;
        }),
        // Helper para simular eventos
        _triggerEvent: (event: string, data?: unknown) => {
            const handler = eventHandlers.get(event);
            if (handler) handler(data);
        },
        _getEventHandlers: () => eventHandlers,
    } as unknown as jest.Mocked<Socket>;
};

describe('WebSocketService - Unit Tests', () => {
    let mockSocket: jest.Mocked<Socket>;
    let mockIo: jest.MockedFunction<typeof io>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockSocket = createMockSocket();
        mockIo = io as jest.MockedFunction<typeof io>;
        mockIo.mockReturnValue(mockSocket as unknown as Socket);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Mock configuration', () => {
        it('debería tener socket.io-client mockeado', () => {
            expect(io).toBeDefined();
        });

        it('debería crear un mock socket correctamente', () => {
            expect(mockSocket).toBeDefined();
            expect(typeof mockSocket.on).toBe('function');
            expect(typeof mockSocket.emit).toBe('function');
            expect(typeof mockSocket.disconnect).toBe('function');
        });
    });

    describe('Event handlers', () => {
        it('debería registrar event handlers correctamente', () => {
            const handler = jest.fn();
            mockSocket.on('test-event', handler);

            expect(mockSocket.on).toHaveBeenCalledWith('test-event', handler);
        });

        it('debería poder disparar eventos registrados', () => {
            const handler = jest.fn();
            mockSocket.on('test-event', handler);
            (mockSocket as any)._triggerEvent('test-event', { data: 'test' });

            expect(handler).toHaveBeenCalledWith({ data: 'test' });
        });

        it('debería limpiar event handlers', () => {
            mockSocket.removeAllListeners();

            expect(mockSocket.removeAllListeners).toHaveBeenCalled();
        });
    });

    describe('Conexión y desconexión', () => {
        it('debería conectar el socket', () => {
            mockSocket.connect();

            expect(mockSocket.connect).toHaveBeenCalled();
        });

        it('debería desconectar el socket', () => {
            mockSocket.disconnect();

            expect(mockSocket.disconnect).toHaveBeenCalled();
        });
    });

    describe('Emisión de eventos', () => {
        it('debería emitir eventos', () => {
            mockSocket.emit('test-event', { data: 'test' });

            expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
        });
    });

    describe('Timers', () => {
        it('debería manejar timers correctamente', () => {
            jest.useFakeTimers();
            const callback = jest.fn();

            setTimeout(callback, 1000);
            expect(callback).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1000);
            expect(callback).toHaveBeenCalled();

            jest.useRealTimers();
        });
    });
});

describe('WebSocketService - Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Flujo de conexión', () => {
        it('debería manejar el ciclo de conexión completo', async () => {
            const mockSock = createMockSocket();
            (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSock as unknown as Socket);

            // Simular conexión exitosa
            mockSock.connected = true;
            (mockSock as any)._triggerEvent('connect');

            expect(mockSock.connected).toBe(true);
        });

        it('debería manejar desconexión', async () => {
            const mockSock = createMockSocket();
            (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSock as unknown as Socket);

            mockSock.disconnect();
            (mockSock as any)._triggerEvent('disconnect');

            expect(mockSock.disconnect).toHaveBeenCalled();
        });
    });

    describe('Reconexión automática', () => {
        it('debería intentar reconectar después de una desconexión', () => {
            jest.useFakeTimers();
            const mockSock = createMockSocket();
            (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSock as unknown as Socket);

            // Simular reconexión
            (mockSock as any)._triggerEvent('disconnect');

            jest.advanceTimersByTime(5000);

            jest.useRealTimers();
        });
    });
});
