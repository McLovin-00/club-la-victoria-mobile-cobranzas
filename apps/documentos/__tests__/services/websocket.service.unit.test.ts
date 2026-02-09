import type { Server as HttpServer } from 'http';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ FRONTEND_URLS: 'http://a,http://b' }),
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { decode: jest.fn(() => ({ tenantEmpresaId: 1, empresaId: 2 })) },
}));

jest.mock('../../src/config/auth', () => ({
  DocumentosAuthService: { verifyToken: jest.fn() },
}));

// Minimal fake socket.io server
type MiddlewareFn = (socket: any, next: (err?: any) => void) => void;
type ConnectionHandler = (socket: any) => void;

const emitted: Array<{ room: string; event: string; payload: any }> = [];
let middleware: MiddlewareFn | null = null;
let onConnection: ConnectionHandler | null = null;
let ioClosed = false;

jest.mock('socket.io', () => {
  class FakeIOServer {
    public options: any;
    constructor(_httpServer: HttpServer, options: any) {
      this.options = options;
    }
    use(fn: MiddlewareFn) { middleware = fn; }
    on(evt: string, fn: any) {
      if (evt === 'connection') onConnection = fn;
    }
    to(room: string) {
      return {
        emit: (event: string, payload: any) => {
          emitted.push({ room, event, payload });
        },
      };
    }
    close() { ioClosed = true; }
  }
  return { Server: FakeIOServer };
});

import { DocumentosAuthService } from '../../src/config/auth';
import { WebSocketService } from '../../src/services/websocket.service';

describe('WebSocketService (real)', () => {
  beforeEach(() => {
    emitted.length = 0;
    middleware = null;
    onConnection = null;
    ioClosed = false;
    jest.clearAllMocks();
    (WebSocketService as any).instance = undefined;
  });

  it('initialize configures CORS origins and auth middleware', async () => {
    (DocumentosAuthService.verifyToken as jest.Mock).mockResolvedValueOnce({ userId: 1, email: 'a@b.com', role: 'ADMIN', empresaId: 2 });
    const svc = WebSocketService.getInstance();
    svc.initialize({} as any);
    expect(middleware).toBeTruthy();
    expect(onConnection).toBeTruthy();

    const next = jest.fn();
    const socket: any = { handshake: { auth: { token: 't' }, headers: {} } };
    await middleware!(socket, next);
    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe(1);
    expect(socket.empresaId).toBe(2);
    expect(socket.role).toBe('ADMIN');
  });

  it('auth middleware rejects missing/invalid token', async () => {
    const svc = WebSocketService.getInstance();
    svc.initialize({} as any);

    const next1 = jest.fn();
    await middleware!({ handshake: { auth: {}, headers: {} } }, next1);
    expect(next1.mock.calls[0][0]).toBeInstanceOf(Error);

    (DocumentosAuthService.verifyToken as jest.Mock).mockResolvedValueOnce(null);
    const next2 = jest.fn();
    await middleware!({ handshake: { auth: { token: 't' }, headers: {} } }, next2);
    expect(next2.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('tracks connected clients, joins rooms, and cleans up on disconnect', async () => {
    (DocumentosAuthService.verifyToken as jest.Mock).mockResolvedValueOnce({ userId: 10, email: 'x@y.com', role: 'SUPERADMIN', empresaId: 7 });
    const svc = WebSocketService.getInstance();
    svc.initialize({} as any);

    const next = jest.fn();
    const socket: any = {
      id: 'sid',
      handshake: { auth: { token: 't' }, headers: {} },
      join: jest.fn(),
      on: jest.fn(),
    };
    await middleware!(socket, next);
    expect(next).toHaveBeenCalledWith();

    onConnection!(socket);
    expect(socket.join).toHaveBeenCalledWith('empresa_7');
    expect(socket.join).toHaveBeenCalledWith('superadmin');

    // Trigger disconnect handler registered via socket.on('disconnect', fn)
    const disconnectHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'disconnect')?.[1];
    expect(typeof disconnectHandler).toBe('function');
    disconnectHandler();

    expect(svc.getConnectedClients()).toHaveLength(0);
  });

  it('notify* emits to empresa room + superadmin', () => {
    const svc = WebSocketService.getInstance();
    svc.initialize({} as any);

    svc.notifyDocumentStatusChange({
      documentId: 1,
      empresaId: 9,
      entityType: 'CHOFER',
      entityId: 1,
      oldStatus: 'PENDIENTE',
      newStatus: 'APROBADO',
      templateName: 'X',
      fileName: 'a.pdf',
    });
    svc.notifyDashboardUpdate(9);
    svc.notifyNewDocument({ documentId: 2, empresaId: 9, entityType: 'CHOFER', templateName: 'T', fileName: 'f', uploadedBy: 'u' });
    svc.notifyDocumentApproved({ documentId: 3, empresaId: 9, expiresAt: null });

    expect(emitted.some(e => e.room === 'empresa_9')).toBe(true);
    expect(emitted.some(e => e.room === 'superadmin')).toBe(true);
  });

  it('close shuts down io and clears state', () => {
    const svc = WebSocketService.getInstance();
    svc.initialize({} as any);
    svc.close();
    expect(ioClosed).toBe(true);
  });
});


