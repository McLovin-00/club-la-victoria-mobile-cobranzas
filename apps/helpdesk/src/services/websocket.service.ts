import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import { AuthenticatedUser, WebSocketEvent, TicketStatus,
  TicketPriority } from '../types';

class WebSocketService {
  private io: SocketIOServer | null = null;
  private publicKey: string | null = null;

  initialize(httpServer: HttpServer): void {
    const env = getEnvironment();

    const corsOrigins = (
      env.FRONTEND_URLS ||
      env.FRONTEND_URL ||
      'http://localhost:8550'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigins,
        credentials: true,
      },
      path: '/helpdesk-socket.io/',
    });

    // Middleware de autenticación JWT en handshake
    this.io.use((socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Token requerido'));
        }

        const pubKey = this.getPublicKey();
        const decoded = jwt.verify(token, pubKey, {
          algorithms: ['RS256'],
        }) as AuthenticatedUser;

        (socket as any).user = decoded;
        next();
      } catch (error) {
        AppLogger.warn('WebSocket auth failed:', { error: error instanceof Error ? error.message : error });
        next(new Error('Autenticación fallida'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user as AuthenticatedUser;
      AppLogger.debug(`WebSocket conectado: usuario ${user.id}`);

      // Unir al usuario a su room personal
      this.joinUserRoom(user.id, socket);

      // Manejar desconexión
      socket.on('disconnect', () => {
        AppLogger.debug(`WebSocket desconectado: usuario ${user.id}`);
      });
    });

    AppLogger.info('✅ WebSocket Service inicializado');
  }

  private getPublicKey(): string {
    if (this.publicKey) return this.publicKey;

    const env = getEnvironment();

    if (env.JWT_PUBLIC_KEY) {
      this.publicKey = env.JWT_PUBLIC_KEY;
      return this.publicKey;
    }

    if (env.JWT_PUBLIC_KEY_PATH) {
      const keyPath = path.resolve(process.cwd(), env.JWT_PUBLIC_KEY_PATH);
      if (fs.existsSync(keyPath)) {
        this.publicKey = fs.readFileSync(keyPath, 'utf8');
        return this.publicKey;
      }
    }

    const defaultPaths = [
      path.resolve(process.cwd(), 'keys/jwt-dev-public.pem'),
      path.resolve(process.cwd(), '../../keys/jwt-dev-public.pem'),
      path.resolve(__dirname, '../../../keys/jwt-dev-public.pem'),
    ];

    for (const keyPath of defaultPaths) {
      if (fs.existsSync(keyPath)) {
        this.publicKey = fs.readFileSync(keyPath, 'utf8');
        return this.publicKey;
      }
    }

    throw new Error('JWT public key not found for WebSocket');
  }

  joinUserRoom(userId: number, socket: Socket): void {
    const roomName = `user_${userId}`;
    socket.join(roomName);
    AppLogger.debug(`Usuario ${userId} unido a room ${roomName}`);
  }

  leaveUserRoom(userId: number, socket: Socket): void {
    const roomName = `user_${userId}`;
    socket.leave(roomName);
    AppLogger.debug(`Usuario ${userId} salió de room ${roomName}`);
  }

  emitToUser(userId: number, event: WebSocketEvent): void {
    if (!this.io) {
      AppLogger.warn('WebSocket no inicializado');
      return;
    }

    const roomName = `user_${userId}`;
    this.io.to(roomName).emit(event.type, event.payload);
    AppLogger.debug(`Evento ${event.type} enviado a usuario ${userId}`);
  }

  emitTicketMessage(ticketId: string, message: any, userId: number): void {
    this.emitToUser(userId, {
      type: 'ticketMessage',
      payload: { ticketId, message },
    });
  }

  emitStatusChange(ticketId: string, status: string,
    changedBy: string, userId: number): void {
    this.emitToUser(userId, {
      type: 'ticketStatusChange',
      payload: { ticketId, status: status as TicketStatus, changedBy, changedAt: new Date() },
    });
  }

  emitPriorityChange(ticketId: string,
    priority: string, confirmedPriority: string | undefined, userId: number): void {
    this.emitToUser(userId, {
      type: 'ticketPriorityChange',
      payload: { ticketId, priority: priority as TicketPriority, confirmedPriority: confirmedPriority as TicketPriority | undefined },
    });
  }

  notifyUser(userId: number, data: unknown): void {
    if (!this.io) {
      return;
    }

    const roomName = `user_${userId}`;
    this.io.to(roomName).emit('notification', data);
  }

  close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      AppLogger.info('🔌 WebSocket Server cerrado');
    }
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const webSocketService = new WebSocketService();
