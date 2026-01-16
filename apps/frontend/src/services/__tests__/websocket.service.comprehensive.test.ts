/**
 * Tests Comprehensivos para WebSocketService (Frontend)
 * Objetivo: Alcanzar ≥ 90% de cobertura
 * 
 * Estructura:
 * 1. Unit Tests - Métodos públicos (happy path, edge cases, errores)
 * 2. Integration Tests - Flujos completos de eventos
 * 3. Edge Cases - Throttling, reconexión, memory leaks
 */

import { webSocketService } from '../websocket.service';
import { io, Socket } from 'socket.io-client';
import { store } from '../../store/store';
import { documentosApiSlice } from '../../features/documentos/api/documentosApiSlice';
import { showToast } from '../../components/ui/Toast.utils';
import { getRuntimeEnv } from '../../lib/runtimeEnv';

// ============================================================================
// MOCKS
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
            invalidateTags: jest.fn((tags: any) => ({ type: 'invalidate', tags })),
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
// HELPERS
// ============================================================================

const createMockSocket = (): jest.Mocked<Socket> => {
    const eventHandlers = new Map<string, Function>();

    return {
        id: 'mock-socket-id',
        connected: false,
        on: jest.fn((event: string, handler: Function) => {
            eventHandlers.set(event, handler);
            return {} as any;
        }),
        off: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        removeAllListeners: jest.fn(() => {
            eventHandlers.clear();
            return {} as any;
        }),
        // Helper para simular eventos
        _triggerEvent: (event: string, data?: any) => {
            const handler = eventHandlers.get(event);
            if (handler) handler(data);
        },
        _getEventHandlers: () => eventHandlers,
    } as any;
};

describe('WebSocketService - Unit Tests', () => {
    let mockSocket: jest.Mocked<Socket>;
    let mockIo: jest.MockedFunction<typeof io>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Reset singleton state
        (webSocketService as any).socket = null;
        (webSocketService as any).reconnectAttempts = 0;
        (webSocketService as any).isConnecting = false;
        (webSocketService as any).lastNotifications.clear();

        mockSocket = createMockSocket();
        mockIo = io as jest.MockedFunction<typeof io>;
        mockIo.mockReturnValue(mockSocket);
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.clearAllTimers();
        jest.useRealTimers();
        webSocketService.disconnect();
    });

    // ==========================================================================
    // MÉTODO: connect()
    // ==========================================================================

    describe('connect()', () => {
        // Happy Path - Conexión exitosa básica
        it('should create socket connection with provided token', () => {
            const token = 'test-token-123';
            (getRuntimeEnv as jest.Mock).mockReturnValue('wss://test.com');

            webSocketService.connect(token);

            expect(mockIo).toHaveBeenCalledWith('wss://test.com', {
                auth: { token },
                transports: ['polling'],
                timeout: 10000,
                forceNew: true,
                autoConnect: true,
            });
        });

        // Edge Case - Reuso de conexión activa
        it('should NOT create new connection if already connected', () => {
            const token = 'token';
            mockSocket.connected = true;
            (webSocketService as any).socket = mockSocket;

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            webSocketService.connect(token);

            expect(mockIo).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ya conectado'));

            consoleSpy.mockRestore();
        });

        // Edge Case - Evitar conexiones concurrentes
        it('should NOT create new connection if already connecting', () => {
            (webSocketService as any).isConnecting = true;

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            webSocketService.connect('token');

            expect(mockIo).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ya se está conectando'));

            consoleSpy.mockRestore();
        });

        // Happy Path - Auto-construcción de URL cuando no está configurada
        it('should auto-construct WebSocket URL from window.location if not configured', () => {
            (getRuntimeEnv as jest.Mock).mockReturnValue(null);

            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: { protocol: 'https:', host: 'app.example.com' },
                writable: true,
            });

            webSocketService.connect('token');

            expect(mockIo).toHaveBeenCalledWith(
                'wss://app.example.com',
                expect.any(Object)
            );
        });

        // Happy Path - Protocolo ws:// para HTTP
        it('should use ws:// protocol when page is HTTP', () => {
            (getRuntimeEnv as jest.Mock).mockReturnValue(null);

            Object.defineProperty(window, 'location', {
                value: { protocol: 'http:', host: 'localhost:3000' },
                writable: true,
            });

            webSocketService.connect('token');

            expect(mockIo).toHaveBeenCalledWith(
                'ws://localhost:3000',
                expect.any(Object)
            );
        });

        // Error Handling - Captura de excepciones durante creación
        it('should handle errors during socket creation', () => {
            mockIo.mockImplementation(() => {
                throw new Error('Connection failed');
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            webSocketService.connect('token');

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error al crear conexión'),
                expect.any(Error)
            );
            expect((webSocketService as any).isConnecting).toBe(false);

            consoleSpy.mockRestore();
        });

        // Integration - Llamada a setupEventListeners
        it('should call setupEventListeners after creating socket', () => {
            const setupSpy = jest.spyOn(webSocketService as any, 'setupEventListeners');

            webSocketService.connect('token');

            expect(setupSpy).toHaveBeenCalled();
        });

        // Edge Case - Llama disconnect() antes de nueva conexión
        it('should disconnect existing socket before creating new one', () => {
            const oldSocket = createMockSocket();
            (webSocketService as any).socket = oldSocket;

            webSocketService.connect('new-token');

            expect(oldSocket.removeAllListeners).toHaveBeenCalled();
            expect(oldSocket.disconnect).toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // MÉTODO PRIVADO: setupEventListeners()
    // ==========================================================================

    describe('setupEventListeners() - Event Handlers', () => {
        beforeEach(() => {
            webSocketService.connect('token');
        });

        // --- Evento: connect ---
        it('should handle "connect" event successfully', () => {
            mockSocket._triggerEvent('connect');

            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('Conexión en tiempo real establecida'),
                'success',
                2000
            );
            expect((webSocketService as any).isConnecting).toBe(false);
            expect((webSocketService as any).reconnectAttempts).toBe(0);
        });

        // --- Evento: disconnect (server disconnect) ---
        it('should handle "disconnect" from server and trigger reconnect', () => {
            const reconnectSpy = jest.spyOn(webSocketService as any, 'handleReconnect');

            mockSocket._triggerEvent('disconnect', 'io server disconnect');

            expect(reconnectSpy).toHaveBeenCalled();
            expect((webSocketService as any).isConnecting).toBe(false);
        });

        // --- Evento: disconnect (client disconnect) ---
        it('should handle "disconnect" from client WITHOUT reconnect', () => {
            const reconnectSpy = jest.spyOn(webSocketService as any, 'handleReconnect');

            mockSocket._triggerEvent('disconnect', 'client namespace disconnect');

            expect(reconnectSpy).not.toHaveBeenCalled();
        });

        // --- Evento: connect_error ---
        it('should handle "connect_error" and trigger reconnect', () => {
            const reconnectSpy = jest.spyOn(webSocketService as any, 'handleReconnect');
            const error = { message: 'Network error' };

            mockSocket._triggerEvent('connect_error', error);

            expect(reconnectSpy).toHaveBeenCalled();
            expect((webSocketService as any).isConnecting).toBe(false);
        });

        // --- Evento: documentStatusUpdate (Happy Path) ---
        it('should handle "documentStatusUpdate" notification', () => {
            const notification = {
                data: {
                    documentId: 123,
                    empresaId: 10,
                    newStatus: 'APROBADO',
                    oldStatus: 'PENDIENTE',
                    templateName: 'Habilitación',
                    fileName: 'doc.pdf',
                    message: 'Documento aprobado',
                },
            };

            mockSocket._triggerEvent('documentStatusUpdate', notification);

            // Verifica invalidación de cache
            expect(store.dispatch).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'invalidate' })
            );

            // Verifica toast
            expect(showToast).toHaveBeenCalledWith(
                'Documento aprobado',
                'success',
                5000
            );
        });

        // --- Evento: documentStatusUpdate (Duplicado) ---
        it('should ignore duplicate "documentStatusUpdate" notifications', () => {
            const notification = {
                data: {
                    documentId: 123,
                    empresaId: 10,
                    newStatus: 'APROBADO',
                },
            };

            mockSocket._triggerEvent('documentStatusUpdate', notification);
            jest.clearAllMocks();

            // Reenviar inmediatamente (dentro de throttle)
            mockSocket._triggerEvent('documentStatusUpdate', notification);

            expect(store.dispatch).not.toHaveBeenCalled();
            expect(showToast).not.toHaveBeenCalled();
        });

        // --- Evento: dashboardUpdate ---
        it('should handle "dashboardUpdate" notification', () => {
            const notification = { empresaId: 10, timestamp: new Date().toISOString() };

            mockSocket._triggerEvent('dashboardUpdate', notification);

            expect(store.dispatch).toHaveBeenCalledWith(
                documentosApiSlice.util.invalidateTags(['Dashboard'])
            );
        });

        // --- Evento: dashboardUpdate (Duplicado) ---
        it('should ignore duplicate "dashboardUpdate" notifications', () => {
            const notification = { empresaId: 10 };

            mockSocket._triggerEvent('dashboardUpdate', notification);
            jest.clearAllMocks();

            mockSocket._triggerEvent('dashboardUpdate', notification);

            expect(store.dispatch).not.toHaveBeenCalled();
        });

        // --- Evento: newDocument ---
        it('should handle "newDocument" notification', () => {
            const notification = {
                data: {
                    documentId: 456,
                    empresaId: 10,
                    templateName: 'Seguro',
                    fileName: 'seguro.pdf',
                    message: 'Nuevo documento subido',
                },
            };

            mockSocket._triggerEvent('newDocument', notification);

            expect(store.dispatch).toHaveBeenCalled();
            expect(showToast).toHaveBeenCalledWith('Nuevo documento subido', 'default', 4000);
        });

        // --- Evento: newDocument (Mensaje por defecto) ---
        it('should construct default message for "newDocument" if not provided', () => {
            const notification = {
                data: {
                    documentId: 456,
                    empresaId: 10,
                    templateName: 'Poliza',
                    fileName: 'file.pdf',
                },
            };

            mockSocket._triggerEvent('newDocument', notification);

            expect(showToast).toHaveBeenCalledWith(
                'Nuevo documento: Poliza - file.pdf',
                'default',
                4000
            );
        });

        // --- Evento: documentApproved ---
        it('should handle "documentApproved" notification', () => {
            const notification = {
                data: { documentId: 789, empresaId: 10 },
            };

            mockSocket._triggerEvent('documentApproved', notification);

            expect(store.dispatch).toHaveBeenCalledWith(
                documentosApiSlice.util.invalidateTags(['Approval'])
            );
        });

        // --- Evento: documentApproved (Duplicado) ---
        it('should ignore duplicate "documentApproved" notifications', () => {
            const notification = { data: { documentId: 789, empresaId: 10 } };

            mockSocket._triggerEvent('documentApproved', notification);
            jest.clearAllMocks();

            mockSocket._triggerEvent('documentApproved', notification);

            expect(store.dispatch).not.toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // MÉTODO PRIVADO: isDuplicateNotification()
    // ==========================================================================

    describe('isDuplicateNotification()', () => {
        // Happy Path - Primera notificación
        it('should return false for first notification', () => {
            const result = (webSocketService as any).isDuplicateNotification('test-key');
            expect(result).toBe(false);
        });

        // Happy Path - Notificación repetida dentro de throttle
        it('should return true for duplicate within throttle window', () => {
            const key = 'test-key';
            (webSocketService as any).isDuplicateNotification(key);

            // Avanzar 1 segundo (< 2000ms throttle)
            jest.advanceTimersByTime(1000);

            const result = (webSocketService as any).isDuplicateNotification(key);
            expect(result).toBe(true);
        });

        // Edge Case - Notificación repetida FUERA de throttle
        it('should return false for duplicate outside throttle window', () => {
            const key = 'test-key';
            (webSocketService as any).isDuplicateNotification(key);

            // Avanzar 3 segundos (> 2000ms throttle)
            jest.advanceTimersByTime(3000);

            const result = (webSocketService as any).isDuplicateNotification(key);
            expect(result).toBe(false);
        });

        // Edge Case - Memory leak protection (limpieza de cache)
        it('should clean old notifications when cache exceeds 100 items', () => {
            // Agregar 101 notificaciones
            for (let i = 0; i < 101; i++) {
                (webSocketService as any).isDuplicateNotification(`key-${i}`);
            }

            // Avanzar tiempo para que las primeras sean "viejas"
            jest.advanceTimersByTime(5000);

            // Agregar una más para trigger cleanup
            (webSocketService as any).isDuplicateNotification('trigger-cleanup');

            const cacheSize = (webSocketService as any).lastNotifications.size;
            expect(cacheSize).toBeLessThan(102); // Debería haberse limpiado
        });
    });

    // ==========================================================================
    // MÉTODO PRIVADO: handleReconnect()
    // ==========================================================================

    describe('handleReconnect()', () => {
        beforeEach(() => {
            webSocketService.connect('token');
        });

        // Happy Path - Reconexión exitosa después de primer intento
        it('should attempt reconnect after delay', () => {
            (webSocketService as any).handleReconnect();

            expect((webSocketService as any).reconnectAttempts).toBe(1);

            jest.advanceTimersByTime(5000);

            expect(mockSocket.connect).toHaveBeenCalled();
        });

        // Edge Case - Múltiples intentos hasta el límite
        it('should retry up to maxReconnectAttempts', () => {
            for (let i = 0; i < 4; i++) {
                (webSocketService as any).handleReconnect();
                jest.advanceTimersByTime(5000);
            }

            expect((webSocketService as any).reconnectAttempts).toBe(4);
            expect(mockSocket.connect).toHaveBeenCalledTimes(4);
        });

        // Edge Case - Detener reconexión al alcanzar límite
        it('should stop reconnecting after max attempts and show error toast', () => {
            (webSocketService as any).reconnectAttempts = 5;

            (webSocketService as any).handleReconnect();

            expect(showToast).toHaveBeenCalledWith(
                expect.stringContaining('No se pudo restablecer'),
                'error',
                5000
            );
            expect(mockSocket.connect).not.toHaveBeenCalled();
        });
    });

    // ==========================================================================
    // MÉTODO PRIVADO: showStatusChangeNotification()
    // ==========================================================================

    describe('showStatusChangeNotification()', () => {
        // Happy Path - Estado APROBADO
        it('should show success toast for APROBADO status', () => {
            const data = {
                newStatus: 'APROBADO',
                templateName: 'Licencia',
                fileName: 'lic.pdf',
                message: 'Documento aprobado',
            };

            (webSocketService as any).showStatusChangeNotification(data);

            expect(showToast).toHaveBeenCalledWith('Documento aprobado', 'success', 5000);
        });

        // Happy Path - Estado RECHAZADO
        it('should show error toast for RECHAZADO status', () => {
            const data = {
                newStatus: 'RECHAZADO',
                message: 'Documento rechazado',
            };

            (webSocketService as any).showStatusChangeNotification(data);

            expect(showToast).toHaveBeenCalledWith('Documento rechazado', 'error', 5000);
        });

        // Happy Path - Otros estados
        it('should show default toast for other statuses', () => {
            const data = {
                newStatus: 'PENDIENTE',
                message: 'Documento en revisión',
            };

            (webSocketService as any).showStatusChangeNotification(data);

            expect(showToast).toHaveBeenCalledWith('Documento en revisión', 'default', 5000);
        });

        // Edge Case - Mensaje por defecto si no hay message
        it('should construct default message from templateName and fileName', () => {
            const data = {
                newStatus: 'VALIDANDO',
                templateName: 'Seguro',
                fileName: 'seg.pdf',
            };

            (webSocketService as any).showStatusChangeNotification(data);

            expect(showToast).toHaveBeenCalledWith('Seguro - seg.pdf', 'default', 5000);
        });
    });

    // ==========================================================================
    // MÉTODO: disconnect()
    // ==========================================================================

    describe('disconnect()', () => {
        // Happy Path - Desconexión limpia
        it('should properly disconnect and clean up socket', () => {
            webSocketService.connect('token');

            webSocketService.disconnect();

            expect(mockSocket.removeAllListeners).toHaveBeenCalled();
            expect(mockSocket.disconnect).toHaveBeenCalled();
            expect((webSocketService as any).socket).toBeNull();
        });

        // Happy Path - Reset de estado
        it('should reset internal state on disconnect', () => {
            (webSocketService as any).isConnecting = true;
            (webSocketService as any).reconnectAttempts = 3;
            (webSocketService as any).lastNotifications.set('key', Date.now());

            webSocketService.disconnect();

            expect((webSocketService as any).isConnecting).toBe(false);
            expect((webSocketService as any).reconnectAttempts).toBe(0);
            expect((webSocketService as any).lastNotifications.size).toBe(0);
        });

        // Edge Case - Llamar disconnect sin socket activo
        it('should handle disconnect when no socket exists', () => {
            (webSocketService as any).socket = null;

            expect(() => webSocketService.disconnect()).not.toThrow();
        });
    });

    // ==========================================================================
    // MÉTODOS: isConnected(), getSocketId()
    // ==========================================================================

    describe('isConnected()', () => {
        it('should return true when socket is connected', () => {
            mockSocket.connected = true;
            (webSocketService as any).socket = mockSocket;

            expect(webSocketService.isConnected()).toBe(true);
        });

        it('should return false when socket is not connected', () => {
            mockSocket.connected = false;
            (webSocketService as any).socket = mockSocket;

            expect(webSocketService.isConnected()).toBe(false);
        });

        it('should return false when no socket exists', () => {
            (webSocketService as any).socket = null;

            expect(webSocketService.isConnected()).toBe(false);
        });
    });

    describe('getSocketId()', () => {
        it('should return socket ID when socket exists', () => {
            mockSocket.id = 'test-id-123';
            (webSocketService as any).socket = mockSocket;

            expect(webSocketService.getSocketId()).toBe('test-id-123');
        });

        it('should return undefined when no socket exists', () => {
            (webSocketService as any).socket = null;

            expect(webSocketService.getSocketId()).toBeUndefined();
        });
    });

    // ==========================================================================
    // MÉTODOS: on(), off(), emit()
    // ==========================================================================

    describe('on()', () => {
        it('should register event listener on socket', () => {
            (webSocketService as any).socket = mockSocket;
            const callback = jest.fn();

            webSocketService.on('customEvent', callback);

            expect(mockSocket.on).toHaveBeenCalledWith('customEvent', callback);
        });

        it('should handle on() when no socket exists', () => {
            (webSocketService as any).socket = null;

            expect(() => webSocketService.on('event', jest.fn())).not.toThrow();
        });
    });

    describe('off()', () => {
        it('should remove event listener from socket', () => {
            (webSocketService as any).socket = mockSocket;
            const callback = jest.fn();

            webSocketService.off('customEvent', callback);

            expect(mockSocket.off).toHaveBeenCalledWith('customEvent', callback);
        });

        it('should handle off() when no socket exists', () => {
            (webSocketService as any).socket = null;

            expect(() => webSocketService.off('event')).not.toThrow();
        });
    });

    describe('emit()', () => {
        it('should emit event to server with data', () => {
            (webSocketService as any).socket = mockSocket;
            const data = { test: 'data' };

            webSocketService.emit('myEvent', data);

            expect(mockSocket.emit).toHaveBeenCalledWith('myEvent', data);
        });

        it('should emit event without data', () => {
            (webSocketService as any).socket = mockSocket;

            webSocketService.emit('ping');

            expect(mockSocket.emit).toHaveBeenCalledWith('ping', undefined);
        });

        it('should handle emit() when no socket exists', () => {
            (webSocketService as any).socket = null;

            expect(() => webSocketService.emit('event', {})).not.toThrow();
        });
    });

    // ==========================================================================
    // MÉTODO PRIVADO: invalidateDocumentCaches()
    // ==========================================================================

    describe('invalidateDocumentCaches()', () => {
        it('should dispatch invalidateTags with correct tags', () => {
            const empresaId = 42;

            (webSocketService as any).invalidateDocumentCaches(empresaId);

            expect(store.dispatch).toHaveBeenCalledWith(
                documentosApiSlice.util.invalidateTags([
                    'Document',
                    'Dashboard',
                    { type: 'Document', id: empresaId },
                ])
            );
        });
    });
});

// ==============================================================================
// INTEGRATION TESTS - Flujos completos
// ==============================================================================

describe('WebSocketService - Integration Tests', () => {
    let mockSocket: jest.Mocked<Socket>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockSocket = createMockSocket();
        (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSocket);
        (getRuntimeEnv as jest.Mock).mockReturnValue('wss://test.com');
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.clearAllTimers();
        jest.useRealTimers();
        webSocketService.disconnect();
    });

    // Flujo completo: Conexión → Eventos → Desconexión
    it('FLOW: connect → receive notifications → disconnect', () => {
        // 1. Conectar
        webSocketService.connect('token');
        expect(mockSocket.on).toHaveBeenCalled();

        // 2. Simular conexión exitosa
        mockSocket._triggerEvent('connect');
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('Conexión en tiempo real establecida'),
            'success',
            2000
        );

        // 3. Recibir notificación de documento
        const notification = {
            data: {
                documentId: 100,
                empresaId: 5,
                newStatus: 'APROBADO',
                templateName: 'Test',
                fileName: 'test.pdf',
                message: 'OK',
            },
        };
        mockSocket._triggerEvent('documentStatusUpdate', notification);
        expect(store.dispatch).toHaveBeenCalled();

        // 4. Desconectar
        webSocketService.disconnect();
        expect(mockSocket.disconnect).toHaveBeenCalled();
        expect(webSocketService.isConnected()).toBe(false);
    });

    // Flujo de reconexión automática
    it('FLOW: connection error → auto reconnect → success', () => {
        webSocketService.connect('token');

        // 1. Error de conexión
        mockSocket._triggerEvent('connect_error', { message: 'Network failed' });
        expect((webSocketService as any).reconnectAttempts).toBe(1);

        // 2. Esperar intervalo de reconexión
        jest.advanceTimersByTime(5000);
        expect(mockSocket.connect).toHaveBeenCalled();

        // 3. Simular conexión exitosa
        mockSocket._triggerEvent('connect');
        expect((webSocketService as any).reconnectAttempts).toBe(0); // Reset
    });

    // Flujo de throttling de notificaciones
    it('FLOW: multiple rapid notifications → only first processed', () => {
        webSocketService.connect('token');
        mockSocket._triggerEvent('connect');

        const notification = {
            data: { documentId: 1, empresaId: 1, newStatus: 'APROBADO' },
        };

        // Enviar 3 notificaciones iguales rápidamente
        mockSocket._triggerEvent('documentStatusUpdate', notification);
        mockSocket._triggerEvent('documentStatusUpdate', notification);
        mockSocket._triggerEvent('documentStatusUpdate', notification);

        // Solo la primera debería procesarse
        expect(showToast).toHaveBeenCalledTimes(1);
    });

    // Flujo de límite de reconexión
    it('FLOW: persistent connection failure → max retries → stop', () => {
        webSocketService.connect('token');

        // Simular 5 fallos consecutivos
        for (let i = 0; i < 5; i++) {
            mockSocket._triggerEvent('connect_error', { message: 'Error' });
            jest.advanceTimersByTime(5000);
        }

        expect((webSocketService as any).reconnectAttempts).toBe(5);

        // Intento adicional no debería ejecutarse
        jest.clearAllMocks();
        mockSocket._triggerEvent('connect_error', { message: 'Error' });

        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('No se pudo restablecer'),
            'error',
            5000
        );
    });
});

// ==============================================================================
// EDGE CASES ESPECÍFICOS
// ==============================================================================

describe('WebSocketService - Edge Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.clearAllTimers();
        jest.useRealTimers();
        webSocketService.disconnect();
    });

    // Edge: Múltiples llamadas concurrentes a connect
    it('should prevent race conditions from multiple connect() calls', () => {
        const mockSocket = createMockSocket();
        (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSocket);

        webSocketService.connect('token1');
        webSocketService.connect('token2');
        webSocketService.connect('token3');

        // Solo debería crear 1 socket
        expect(io).toHaveBeenCalledTimes(1);
    });

    // Edge: Notificación con datos null/undefined
    it('should handle notification with missing data gracefully', () => {
        const mockSocket = createMockSocket();
        (io as jest.MockedFunction<typeof io>).mockReturnValue(mockSocket);

        webSocketService.connect('token');
        mockSocket._triggerEvent('connect');

        const malformedNotification = {
            data: {
                documentId: null,
                empresaId: undefined,
                // Campos faltantes
            },
        };

        expect(() => {
            mockSocket._triggerEvent('documentStatusUpdate', malformedNotification);
        }).not.toThrow();
    });

    // Edge: Cleanup de más de 100 notificaciones (memory leak protection)
    it('should clean notification cache when exceeding 100 entries', () => {
        // Llenar cache con 110 notificaciones
        for (let i = 0; i < 110; i++) {
            (webSocketService as any).lastNotifications.set(`key-${i}`, Date.now());
        }

        // Trigger cleanup via isDuplicateNotification
        jest.advanceTimersByTime(5000);
        (webSocketService as any).isDuplicateNotification('trigger');

        const finalSize = (webSocketService as any).lastNotifications.size;
        expect(finalSize).toBeLessThanOrEqual(101);
    });
});
