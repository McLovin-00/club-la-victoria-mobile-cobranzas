import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import { documentosApiSlice } from '../features/documentos/api/documentosApiSlice';
import { showToast } from '../components/ui/Toast.utils';
import { getRuntimeEnv } from '../lib/runtimeEnv';

/**
 * WebSocket Service - Conexión en Tiempo Real
 */
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private isConnecting = false;
  private lastNotifications = new Map<string, number>(); // Para evitar duplicados
  private notificationThrottle = 2000; // 2 segundos entre notificaciones similares

  /**
   * Inicializar conexión WebSocket
   */
  public connect(token: string): void {
    // Si ya hay una conexión activa, no crear otra
    if (this.socket?.connected) {
      console.log('🔗 WebSocket ya conectado, usando conexión existente');
      return;
    }

    // Si ya se está conectando, esperar
    if (this.isConnecting) {
      console.log('🔗 WebSocket ya se está conectando...');
      return;
    }

    // Desconectar cualquier conexión previa
    this.disconnect();

    this.isConnecting = true;

    try {
      console.log('🔗 Creando nueva conexión WebSocket...');
      
      // Determinar URL del WebSocket
      let wsUrl = getRuntimeEnv('VITE_DOCUMENTOS_WS_URL');
      
      // Si no está configurada, construir automáticamente desde el host actual
      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}`;
        console.log('🔗 WebSocket URL construida automáticamente:', wsUrl);
      }
      
      this.socket = io(wsUrl, {
        auth: {
          token,
        },
        // Solo polling - MikroTik no soporta upgrade a WebSocket nativo
        transports: ['polling'],
        timeout: 10000,
        forceNew: true, // Forzar nueva conexión para evitar duplicados
        autoConnect: true,
      });

      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ Error al crear conexión WebSocket:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Limpiar listeners previos para evitar duplicados
    this.socket.removeAllListeners();

    // Evento de conexión exitosa
    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', this.socket?.id);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      showToast(
        'Conexión en tiempo real establecida ✅',
        'success',
        2000
      );
    });

    // Evento de desconexión
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket desconectado:', reason);
      this.isConnecting = false;
      
      if (reason === 'io server disconnect') {
        // Desconexión forzada por el servidor, reconectar
        this.handleReconnect();
      }
    });

    // Evento de error de conexión
    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
      this.isConnecting = false;
      
      // Si el error es de token inválido/expirado, redirigir al login
      if (error.message?.toLowerCase().includes('token') || 
          error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('jwt')) {
        console.warn('🔐 Token inválido o expirado - redirigiendo al login');
        this.disconnect();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=true';
        return;
      }
      
      this.handleReconnect();
    });

    // === EVENTOS DE NEGOCIO ===

    // Cambio de estado de documento
    this.socket.on('documentStatusUpdate', (notification) => {
      const notificationKey = `status-${notification.data.documentId}-${notification.data.newStatus}`;
      
      if (this.isDuplicateNotification(notificationKey)) {
        console.log('🔕 Notificación duplicada ignorada:', notificationKey);
        return;
      }
      
      console.log('📄 Estado de documento actualizado:', notification);
      
      this.invalidateDocumentCaches(notification.data.empresaId);
      
      // Mostrar notificación al usuario
      this.showStatusChangeNotification(notification.data);
    });

    // Actualización del dashboard
    this.socket.on('dashboardUpdate', (notification) => {
      const notificationKey = `dashboard-${notification.empresaId}`;
      
      if (this.isDuplicateNotification(notificationKey)) {
        console.log('🔕 Dashboard update duplicado ignorado:', notificationKey);
        return;
      }
      
      console.log('📊 Dashboard actualizado:', notification);
      
      // Invalidar cache del dashboard
      store.dispatch(
        documentosApiSlice.util.invalidateTags(['Dashboard'])
      );
    });

    // Nuevo documento subido
    this.socket.on('newDocument', (notification) => {
      const notificationKey = `new-doc-${notification.data.documentId}`;
      
      if (this.isDuplicateNotification(notificationKey)) {
        console.log('🔕 Nuevo documento duplicado ignorado:', notificationKey);
        return;
      }
      
      console.log('📤 Nuevo documento subido:', notification);
      
      this.invalidateDocumentCaches(notification.data.empresaId);
      
      // Mostrar notificación
      const message = notification.data?.message || 
                     `Nuevo documento: ${notification.data?.templateName} - ${notification.data?.fileName}`;
      showToast(message, 'default', 4000);
    });

    // Documento aprobado (refrescar vistas y vencimientos)
    this.socket.on('documentApproved', (notification: any) => {
      const key = `doc-approved-${notification?.data?.documentId}`;
      if (this.isDuplicateNotification(key)) return;
      console.log('✅ Documento aprobado:', notification);
      // Invalidar listas afectadas
      this.invalidateDocumentCaches(notification?.data?.empresaId);
      // Invalidar colas de aprobación
      store.dispatch(documentosApiSlice.util.invalidateTags(['Approval']));
    });

    // Nueva notificación interna (campanita)
    this.socket.on('notification', (data: any) => {
      if (data?.type === 'NEW_NOTIFICATION') {
        const notif = data.notification;
        const key = `internal-${notif?.id || Date.now()}`;
        
        if (this.isDuplicateNotification(key)) {
          console.log('🔕 Notificación interna duplicada ignorada:', key);
          return;
        }
        
        console.log('🔔 Nueva notificación interna:', notif);
        
        // Invalidar cache de notificaciones para que se actualice el contador
        store.dispatch(
          documentosApiSlice.util.invalidateTags(['Notifications'])
        );
        
        // Mostrar toast según prioridad
        if (notif?.priority === 'urgent' || notif?.priority === 'high') {
          showToast(
            `${notif.title}: ${notif.message?.slice(0, 100) ?? ''}`,
            notif.priority === 'urgent' ? 'error' : 'default',
            6000
          );
        }
      }
    });
  }

  /**
   * Verificar si una notificación es duplicada
   */
  private isDuplicateNotification(key: string): boolean {
    const now = Date.now();
    const lastTime = this.lastNotifications.get(key);
    
    if (lastTime && (now - lastTime) < this.notificationThrottle) {
      return true; // Es duplicada
    }
    
    // Guardar timestamp de esta notificación
    this.lastNotifications.set(key, now);
    
    // Limpiar notificaciones antiguas para evitar memory leaks
    if (this.lastNotifications.size > 100) {
      const cutoff = now - this.notificationThrottle * 2;
      for (const [k, time] of this.lastNotifications.entries()) {
        if (time < cutoff) {
          this.lastNotifications.delete(k);
        }
      }
    }
    
    return false; // No es duplicada
  }

  /**
   * Manejar reconexión automática
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Máximo de intentos de reconexión alcanzado');
      showToast(
        'No se pudo restablecer la conexión en tiempo real',
        'error',
        5000
      );
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`🔄 Reintentando conexión (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.socket?.connect();
    }, this.reconnectInterval);
  }

  /**
   * Invalidar caches relacionados con documentos
   */
  private invalidateDocumentCaches(empresaId: number): void {
    // Invalidar todos los caches relacionados con documentos
    store.dispatch(
      documentosApiSlice.util.invalidateTags([
        'Document',
        'Dashboard',
        { type: 'Document', id: empresaId },
      ])
    );
  }

  /**
   * Mostrar notificación de cambio de estado
   */
  private showStatusChangeNotification(data: any): void {
    const message = data?.message || `${data?.templateName} - ${data?.fileName}`;

    // Determinar variante según estado
    let variant: 'success' | 'error' | 'default' = 'default';
    if (data.newStatus === 'APROBADO') {
      variant = 'success';
    } else if (data.newStatus === 'RECHAZADO') {
      variant = 'error';
    }

    showToast(message, variant, 5000);
  }

  /**
   * Desconectar WebSocket
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Desconectando WebSocket...');
      
      // Limpiar todos los listeners antes de desconectar
      this.socket.removeAllListeners();
      
      // Desconectar y limpiar
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Reiniciar estado
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Limpiar cache de notificaciones
    this.lastNotifications.clear();
  }

  /**
   * Verificar estado de conexión
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtener ID de la conexión
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Escuchar evento personalizado
   */
  public on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  /**
   * Dejar de escuchar evento
   */
  public off(event: string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }

  /**
   * Emitir evento al servidor
   */
  public emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }
}

// Exportar instancia singleton
export const webSocketService = new WebSocketService();
