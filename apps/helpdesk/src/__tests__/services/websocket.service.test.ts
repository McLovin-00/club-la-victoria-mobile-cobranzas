import { Server as HttpServer } from 'http';
import { webSocketService } from '../../services/websocket.service';

const mockSocket = {
  join: jest.fn(),
  leave: jest.fn(),
  on: jest.fn(),
  handshake: {
    auth: {},
    headers: {},
  },
};

let capturedMiddleware: Function | null = null;

const mockIo = {
  use: jest.fn((middleware) => {
    capturedMiddleware = middleware;
    const next = jest.fn();
    middleware(mockSocket, next);
  }),
  on: jest.fn((event, handler) => {
    if (event === 'connection') {
      handler(mockSocket);
    }
  }),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  close: jest.fn(),
};

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => mockIo),
}));

const mockJwtVerify = jest.fn().mockReturnValue({ id: 1, email: 'test@test.com', role: 'USER' });

jest.mock('jsonwebtoken', () => ({
  verify: (...args: any[]) => mockJwtVerify(...args),
}));

const mockExistsSync = jest.fn().mockReturnValue(true);
const mockReadFileSync = jest.fn().mockReturnValue('mock-public-key');

jest.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
}));

const mockGetEnvironment = jest.fn().mockReturnValue({
  FRONTEND_URLS: 'http://localhost:8550',
  FRONTEND_URL: 'http://localhost:8550',
  JWT_PUBLIC_KEY: 'mock-public-key',
  JWT_PUBLIC_KEY_PATH: './keys/jwt-dev-public.pem',
});

jest.mock('../../config/environment', () => ({
  getEnvironment: (...args: any[]) => mockGetEnvironment(...args),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WebSocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedMiddleware = null;
    webSocketService.close();
    (mockSocket as any).user = { id: 1, email: 'test@test.com', role: 'USER' };
    (mockSocket as any).handshake = {
      auth: { token: 'valid-token' },
      headers: {},
    };
    mockJwtVerify.mockReturnValue({ id: 1, email: 'test@test.com', role: 'USER' });
    mockGetEnvironment.mockReturnValue({
      FRONTEND_URLS: 'http://localhost:8550',
      FRONTEND_URL: 'http://localhost:8550',
      JWT_PUBLIC_KEY: 'mock-public-key',
      JWT_PUBLIC_KEY_PATH: './keys/jwt-dev-public.pem',
    });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('mock-public-key');
  });

  describe('initialize', () => {
    it('should initialize WebSocket server', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      expect(mockIo.use).toHaveBeenCalled();
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should use FRONTEND_URLS from environment', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);
      expect(mockIo.use).toHaveBeenCalled();
    });

    it('should use FRONTEND_URL when FRONTEND_URLS is not set', () => {
      mockGetEnvironment.mockReturnValueOnce({
        FRONTEND_URLS: undefined,
        FRONTEND_URL: 'http://localhost:3000',
        JWT_PUBLIC_KEY: 'key',
      });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);
      expect(mockIo.use).toHaveBeenCalled();
    });

    it('should use default origin when neither URL is set', () => {
      mockGetEnvironment.mockReturnValueOnce({
        FRONTEND_URLS: undefined,
        FRONTEND_URL: undefined,
        JWT_PUBLIC_KEY: 'key',
      });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);
      expect(mockIo.use).toHaveBeenCalled();
    });

    it('should handle multiple comma-separated origins', () => {
      mockGetEnvironment.mockReturnValueOnce({
        FRONTEND_URLS: 'http://localhost:3000,http://localhost:4000,http://example.com',
        JWT_PUBLIC_KEY: 'key',
      });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);
      expect(mockIo.use).toHaveBeenCalled();
    });

    it('should filter empty origins from comma-separated list', () => {
      mockGetEnvironment.mockReturnValueOnce({
        FRONTEND_URLS: 'http://localhost:3000,, http://localhost:4000',
        JWT_PUBLIC_KEY: 'key',
      });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);
      expect(mockIo.use).toHaveBeenCalled();
    });
  });

  describe('auth middleware', () => {
    it('should reject when no token is provided', () => {
      (mockSocket as any).handshake = {
        auth: {},
        headers: {},
      };
      mockJwtVerify.mockReturnValue({ id: 1, email: 'test@test.com', role: 'USER' });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      expect(mockIo.use).toHaveBeenCalled();
    });

    it('should accept token from authorization header', () => {
      (mockSocket as any).handshake = {
        auth: {},
        headers: { authorization: 'Bearer my-jwt-token' },
      };
      mockJwtVerify.mockReturnValue({ id: 2, email: 'test2@test.com', role: 'ADMIN' });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      expect(mockJwtVerify).toHaveBeenCalled();
    });

    it('should reject on invalid token', () => {
      (mockSocket as any).handshake = {
        auth: { token: 'bad-token' },
        headers: {},
      };
      mockJwtVerify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      expect(mockIo.use).toHaveBeenCalled();
    });

    it('should reject on non-Error thrown', () => {
      (mockSocket as any).handshake = {
        auth: { token: 'bad-token' },
        headers: {},
      };
      mockJwtVerify.mockImplementation(() => {
        throw 'string error';
      });

      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      expect(mockIo.use).toHaveBeenCalled();
    });
  });

  describe('getPublicKey', () => {
    it('should use JWT_PUBLIC_KEY from environment', async () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      expect(mockGetEnvironment).toHaveBeenCalled();
    });

    it('should throw when no key is found anywhere', () => {
      mockGetEnvironment.mockReturnValue({
        JWT_PUBLIC_KEY: undefined,
        JWT_PUBLIC_KEY_PATH: '/nonexistent/path.pem',
        FRONTEND_URLS: 'http://localhost:8550',
      });
      mockExistsSync.mockReturnValue(false);
      mockJwtVerify.mockImplementation(() => {
        throw new Error('JWT public key not found for WebSocket');
      });

      const mockHttpServer = {} as HttpServer;
      expect(() => webSocketService.initialize(mockHttpServer)).not.toThrow();
    });
  });

  describe('joinUserRoom', () => {
    it('should join user to room', () => {
      webSocketService.joinUserRoom(1, mockSocket as any);
      expect(mockSocket.join).toHaveBeenCalledWith('user_1');
    });

    it('should join different users to different rooms', () => {
      webSocketService.joinUserRoom(42, mockSocket as any);
      expect(mockSocket.join).toHaveBeenCalledWith('user_42');
    });
  });

  describe('leaveUserRoom', () => {
    it('should leave user room', () => {
      webSocketService.leaveUserRoom(1, mockSocket as any);
      expect(mockSocket.leave).toHaveBeenCalledWith('user_1');
    });
  });

  describe('emitToUser', () => {
    it('should emit event to user room', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      webSocketService.emitToUser(1, {
        type: 'ticketMessage',
        payload: {
          ticketId: 'ticket-1',
          message: { id: 'msg-1', ticketId: 't1', content: 'test', senderType: 'USER', senderName: 'T', createdAt: new Date() },
        },
      });

      expect(mockIo.to).toHaveBeenCalledWith('user_1');
      expect(mockIo.emit).toHaveBeenCalledWith('ticketMessage', expect.any(Object));
    });

    it('should not emit when io is not initialized', () => {
      webSocketService.close();
      mockIo.to.mockClear();
      mockIo.emit.mockClear();

      expect(() =>
        webSocketService.emitToUser(1, {
          type: 'ticketMessage',
          payload: { ticketId: 't1', message: { id: 'm1', ticketId: 't1', content: 'c', senderType: 'USER', senderName: 'T', createdAt: new Date() } },
        })
      ).not.toThrow();
    });
  });

  describe('emitTicketMessage', () => {
    it('should emit ticket message event', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      webSocketService.emitTicketMessage(
        'ticket-1',
        { id: 'msg-1', ticketId: 't1', content: 'test', senderType: 'USER', senderName: 'T', createdAt: new Date() } as any,
        1
      );

      expect(mockIo.to).toHaveBeenCalledWith('user_1');
    });
  });

  describe('emitStatusChange', () => {
    it('should emit status change event', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      webSocketService.emitStatusChange('ticket-1', 'IN_PROGRESS', 'resolver', 1);
      expect(mockIo.to).toHaveBeenCalledWith('user_1');
    });
  });

  describe('emitPriorityChange', () => {
    it('should emit priority change event', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      webSocketService.emitPriorityChange('ticket-1', 'HIGH', 'HIGH', 1);
      expect(mockIo.to).toHaveBeenCalledWith('user_1');
    });

    it('should emit priority change with undefined confirmedPriority', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      webSocketService.emitPriorityChange('ticket-1', 'NORMAL', undefined, 1);
      expect(mockIo.to).toHaveBeenCalledWith('user_1');
    });
  });

  describe('notifyUser', () => {
    it('should send notification to user', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      webSocketService.notifyUser(1, { message: 'test notification' });
      expect(mockIo.to).toHaveBeenCalledWith('user_1');
      expect(mockIo.emit).toHaveBeenCalledWith('notification', { message: 'test notification' });
    });

    it('should not throw when io is null', () => {
      webSocketService.close();
      expect(() => webSocketService.notifyUser(1, { message: 'test' })).not.toThrow();
    });
  });

  describe('close', () => {
    it('should close WebSocket server', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);
      webSocketService.close();

      expect(mockIo.close).toHaveBeenCalled();
    });

    it('should not throw when closing uninitialized server', () => {
      webSocketService.close();
      webSocketService.close();
    });
  });

  describe('getIO', () => {
    it('should return io instance', () => {
      const mockHttpServer = {} as HttpServer;
      webSocketService.initialize(mockHttpServer);

      expect(webSocketService.getIO()).toBe(mockIo);
    });

    it('should return null when not initialized', () => {
      webSocketService.close();
      expect(webSocketService.getIO()).toBeNull();
    });
  });
});
