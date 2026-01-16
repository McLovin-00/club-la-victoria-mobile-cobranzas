
import { webSocketService } from '../src/services/websocket.service';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { DocumentosAuthService } from '../src/config/auth';

// Mock dependencias
jest.mock('../src/config/logger', () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('../src/config/auth', () => ({
    DocumentosAuthService: {
        verifyToken: jest.fn(),
    },
}));

jest.mock('socket.io');

describe('WebSocketService Extended Coverage', () => {
    let mockIo: any;
    let mockSocket: any;
    let middlewareFn: Function;
    let connectionHandler: Function;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock IO instance
        mockIo = {
            use: jest.fn((fn) => middlewareFn = fn),
            on: jest.fn((event, handler) => {
                if (event === 'connection') connectionHandler = handler;
            }),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            close: jest.fn(),
        };

        (SocketIOServer as unknown as jest.Mock).mockReturnValue(mockIo);

        // Setup mock socket
        mockSocket = {
            id: 'socket-1',
            handshake: { auth: { token: 'token' } },
            join: jest.fn(),
            on: jest.fn(),
            emit: jest.fn(),
        };
    });

    afterEach(() => {
        webSocketService.close();
    });

    describe('initialize & auth middleware', () => {
        it('should handle auth middleware error (Uncovered: 71-72)', async () => {
            webSocketService.initialize({} as any); // Trigger creation of IO

            // Mock verifyToken to throw
            (DocumentosAuthService.verifyToken as jest.Mock).mockRejectedValue(new Error('Auth Fail'));

            const next = jest.fn();
            await middlewareFn(mockSocket, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalled();
        });

        it('should handle missing token claims fallback (Uncovered: 65)', async () => {
            webSocketService.initialize({} as any);

            (DocumentosAuthService.verifyToken as jest.Mock).mockResolvedValue({ userId: 1, role: 'USER' });
            jest.spyOn(jwt, 'decode').mockReturnValue({ dadorCargaId: 99 });

            const next = jest.fn();
            await middlewareFn(mockSocket, next);

            expect(mockSocket.empresaId).toBe(99);
        });
    });

    describe('Socket events', () => {
        it('should handle socket error event (Uncovered: 100)', () => {
            webSocketService.initialize({} as any);

            // Trigger connection
            mockSocket.userId = 1; mockSocket.empresaId = 1; mockSocket.role = 'USER';
            connectionHandler(mockSocket);

            // Find error handler
            // socket.on('error', handler)
            const calls = mockSocket.on.mock.calls;
            const errorHandler = calls.find((c: any) => c[0] === 'error')?.[1];

            if (errorHandler) {
                errorHandler(new Error('Socket Error'));
                expect(require('../src/config/logger').AppLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Error en WebSocket'),
                    expect.anything()
                );
            } else {
                throw new Error('Error handler not registered');
            }
        });
    });

    describe('notify methods when not initialized (Uncovered: 122-123)', () => {
        it('should warn if IO not initialized', () => {
            // Ensure IO is null (close it)
            webSocketService.close();
            // instance IO is null now

            webSocketService.notifyDocumentStatusChange({} as any);

            expect(require('../src/config/logger').AppLogger.warn).toHaveBeenCalledWith(
                'WebSocket no inicializado, no se puede enviar notificación'
            );
        });
    });

    describe('getClientCountByEmpresa (Uncovered: 219-226)', () => {
        it('should count clients correctly', () => {
            webSocketService.initialize({} as any);

            // Connect 2 clients for company 1, 1 for company 2
            const s1 = { ...mockSocket, id: 's1', userId: 1, empresaId: 10, role: 'USER', join: jest.fn(), on: jest.fn() };
            const s2 = { ...mockSocket, id: 's2', userId: 2, empresaId: 10, role: 'USER', join: jest.fn(), on: jest.fn() };
            const s3 = { ...mockSocket, id: 's3', userId: 3, empresaId: 20, role: 'USER', join: jest.fn(), on: jest.fn() };

            connectionHandler(s1);
            connectionHandler(s2);
            connectionHandler(s3);

            const counts = webSocketService.getClientCountByEmpresa();
            expect(counts[10]).toBe(2);
            expect(counts[20]).toBe(1);
        });
    });
});
