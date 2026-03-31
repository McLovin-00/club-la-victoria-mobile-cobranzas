import { io, Socket } from 'socket.io-client';
import { store } from '../../../store/store';
import { helpdeskApi } from '../api/helpdeskApi';
import { documentosApiSlice } from '../../documentos/api/documentosApiSlice';
import { getRuntimeEnv } from '../../../lib/runtimeEnv';
import { Logger } from '../../../lib/utils';

class HelpdeskWebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  connect(token: string): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.disconnect();
    this.isConnecting = true;

    const configuredUrl = getRuntimeEnv('VITE_HELPDESK_WS_URL');
    const fallbackUrl = window.location.origin;
    const socketUrl = configuredUrl || fallbackUrl;

    this.socket = io(socketUrl, {
      path: '/helpdesk-socket.io/',
      auth: { token },
      transports: ['polling'],
      timeout: 10000,
      autoConnect: true,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      Logger.debug('Helpdesk WebSocket conectado', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', reason => {
      this.isConnecting = false;
      Logger.debug('Helpdesk WebSocket desconectado', { reason });
    });

    this.socket.on('connect_error', error => {
      this.isConnecting = false;
      Logger.warn('Helpdesk WebSocket error', error);
    });

    this.socket.on('ticketMessage', payload => {
      store.dispatch(
        helpdeskApi.util.invalidateTags([
          { type: 'Ticket', id: 'LIST' },
          { type: 'Ticket', id: payload?.ticketId ?? 'LIST' },
          { type: 'TicketMessage', id: payload?.ticketId ?? 'LIST' },
          'HelpdeskUnread',
        ])
      );
    });

    this.socket.on('ticketStatusChange', payload => {
      store.dispatch(
        helpdeskApi.util.invalidateTags([
          { type: 'Ticket', id: payload?.ticketId ?? 'LIST' },
          { type: 'Ticket', id: 'LIST' },
          'HelpdeskStats',
          'HelpdeskUnread',
        ])
      );
    });

    this.socket.on('ticketPriorityChange', payload => {
      store.dispatch(
        helpdeskApi.util.invalidateTags([
          { type: 'Ticket', id: payload?.ticketId ?? 'LIST' },
          { type: 'Ticket', id: 'LIST' },
        ])
      );
    });

    this.socket.on('notification', () => {
      store.dispatch(documentosApiSlice.util.invalidateTags(['Notifications']));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnecting = false;
  }
}

export const helpdeskWebSocketService = new HelpdeskWebSocketService();
export default helpdeskWebSocketService;
