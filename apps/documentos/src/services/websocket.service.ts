import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { AppLogger } from '../config/logger';
import jwt from 'jsonwebtoken';
import { getEnvironment } from '../config/environment';
import { DocumentosAuthService } from '../config/auth';

/**
 * WebSocket Service - Notificaciones en Tiempo Real
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;
  private connectedClients = new Map<string, any>();

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initialize(httpServer: HttpServer): void {
    const env = getEnvironment();
    const origins = (env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:8550')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: origins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Middleware de autenticación para WebSocket
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Token de autenticación requerido'));
        }

        // Verificación centralizada (RS256)
        const payload = await DocumentosAuthService.verifyToken(token);
        if (!payload) {
          return next(new Error('Token inválido'));
        }

        // Alinear claims mínimos garantizados
        (socket as any).userId = payload.userId as number;
        (socket as any).empresaId = (payload.empresaId ?? null) as number | null;
        (socket as any).role = payload.role as string;

        // Claims opcionales (solo lectura, para compatibilidad)
        const decoded: any = jwt.decode(token) || {};
        (socket as any).tenantEmpresaId = decoded.tenantEmpresaId ?? null;
        if ((socket as any).empresaId == null) {
          (socket as any).empresaId = decoded.empresaId ?? decoded.dadorCargaId ?? null;
        }
        
        AppLogger.info(`Cliente WebSocket autenticado: ${payload.email} (${payload.role})`);
        next();
      } catch (error) {
        AppLogger.error('Error en autenticación WebSocket:', error);
        next(new Error('Token inválido'));
      }
    });

    this.io.on('connection', (socket: any) => {
      const clientInfo = {
        userId: socket.userId,
        empresaId: socket.empresaId,
        role: socket.role,
        connectedAt: new Date(),
      };

      this.connectedClients.set(socket.id, clientInfo);
      
      AppLogger.info(`Cliente conectado: ${socket.id} (Empresa: ${socket.empresaId})`);

      // Unir al cliente a salas específicas
      socket.join(`empresa_${socket.empresaId}`);
      if (socket.role === 'SUPERADMIN') {
        socket.join('superadmin');
      }

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
        AppLogger.info(`Cliente desconectado: ${socket.id}`);
      });

      socket.on('error', (error: any) => {
        AppLogger.error(`Error en WebSocket ${socket.id}:`, error);
      });
    });

    AppLogger.info('WebSocket Server inicializado correctamente');
  }

  /**
   * Notificar cambio de estado de documento a usuarios relevantes
   */
  public notifyDocumentStatusChange(data: {
    documentId: number;
    empresaId: number;
    entityType: string;
    entityId: number;
    oldStatus: string;
    newStatus: string;
    templateName: string;
    fileName: string;
    validationNotes?: string;
  }): void {
    if (!this.io) {
      AppLogger.warn('WebSocket no inicializado, no se puede enviar notificación');
      return;
    }

    const notification = {
      type: 'DOCUMENT_STATUS_CHANGED',
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        message: this.getStatusChangeMessage(data.oldStatus, data.newStatus, data.templateName),
      },
    };

    // Enviar a todos los usuarios de la empresa
    this.io.to(`empresa_${data.empresaId}`).emit('documentStatusUpdate', notification);
    
    // Enviar también a superadmins
    this.io.to('superadmin').emit('documentStatusUpdate', notification);

    AppLogger.info(`Notificación WebSocket enviada - Doc ${data.documentId}: ${data.oldStatus} -> ${data.newStatus}`);
  }

  /**
   * Notificar estadísticas generales del dashboard
   */
  public notifyDashboardUpdate(empresaId: number): void {
    if (!this.io) return;

    const notification = {
      type: 'DASHBOARD_UPDATE',
      timestamp: new Date().toISOString(),
      empresaId,
    };

    this.io.to(`empresa_${empresaId}`).emit('dashboardUpdate', notification);
    this.io.to('superadmin').emit('dashboardUpdate', notification);

    AppLogger.debug(`Dashboard update enviado para empresa ${empresaId}`);
  }

  /**
   * Notificar nuevo documento subido
   */
  public notifyNewDocument(data: {
    documentId: number;
    empresaId: number;
    entityType: string;
    templateName: string;
    fileName: string;
    uploadedBy: string;
  }): void {
    if (!this.io) return;

    const notification = {
      type: 'NEW_DOCUMENT_UPLOADED',
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        message: `Nuevo documento subido: ${data.templateName} (${data.fileName})`,
      },
    };

    this.io.to(`empresa_${data.empresaId}`).emit('newDocument', notification);
    this.io.to('superadmin').emit('newDocument', notification);

    AppLogger.info(`Notificación nuevo documento - ID ${data.documentId}`);
  }

  /**
   * Notificar documento aprobado (para refrescar listados y vencimientos)
   */
  public notifyDocumentApproved(data: { documentId: number; empresaId: number; expiresAt?: string | null }): void {
    if (!this.io) return;

    const notification = {
      type: 'DOCUMENT_APPROVED',
      timestamp: new Date().toISOString(),
      data,
    };

    this.io.to(`empresa_${data.empresaId}`).emit('documentApproved', notification);
    this.io.to('superadmin').emit('documentApproved', notification);

    AppLogger.info(`Notificación documento aprobado - ID ${data.documentId}`);
  }

  /**
   * Obtener información de clientes conectados
   */
  public getConnectedClients(): any[] {
    return Array.from(this.connectedClients.values());
  }

  /**
   * Obtener conteo de clientes por empresa
   */
  public getClientCountByEmpresa(): Record<number, number> {
    const counts: Record<number, number> = {};
    
    for (const client of this.connectedClients.values()) {
      const empresaId = client.empresaId;
      counts[empresaId] = (counts[empresaId] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Generar mensaje amigable para cambios de estado
   */
  private getStatusChangeMessage(oldStatus: string, newStatus: string, templateName: string): string {
    const statusMessages: Record<string, string> = {
      PENDIENTE: 'pendiente de revisión',
      VALIDANDO: 'siendo validado',
      APROBADO: 'aprobado',
      RECHAZADO: 'rechazado',
      VENCIDO: 'vencido',
    };

    const oldMsg = statusMessages[oldStatus] || oldStatus.toLowerCase();
    const newMsg = statusMessages[newStatus] || newStatus.toLowerCase();

    return `Documento ${templateName} cambió de ${oldMsg} a ${newMsg}`;
  }

  /**
   * Cerrar el servidor WebSocket
   */
  public close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.connectedClients.clear();
      AppLogger.info('WebSocket Server cerrado');
    }
  }
}

// Exportar instancia singleton
export const webSocketService = WebSocketService.getInstance();
