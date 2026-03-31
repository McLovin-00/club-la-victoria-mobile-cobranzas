import { useState, useEffect, useRef, useCallback } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import {
  useGetUserNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} from '../../features/documentos/api/documentosApiSlice';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

// Iconos por tipo de notificación
const getNotificationIcon = (type: string): string => {
  const icons: Record<string, string> = {
    DOCUMENT_APPROVED: '✅',
    DOCUMENT_REJECTED: '❌',
    DOCUMENT_EXPIRING: '🟠',
    DOCUMENT_EXPIRING_URGENT: '🔴',
    DOCUMENT_EXPIRED: '⏰',
    DOCUMENT_UPLOADED: '📤',
    DOCUMENT_MISSING: '📋',
    EQUIPO_COMPLETE: '✅',
    EQUIPO_INCOMPLETE: '⚠️',
    EQUIPO_ESTADO_ACTUALIZADO: '🔄',
    EQUIPO_BLOQUEADO: '🚫',
    TRANSFERENCIA_SOLICITADA: '🔀',
    TRANSFERENCIA_APROBADA: '✅',
    TRANSFERENCIA_RECHAZADA: '❌',
    NUEVO_REQUISITO_CLIENTE: '📋',
    HELPDESK_NEW_TICKET: '🎫',
    HELPDESK_NEW_RESPONSE: '💬',
    HELPDESK_TICKET_CLOSED: '✅',
    HELPDESK_TICKET_REOPENED: '♻️',
    SYSTEM_ALERT: '🔔',
  };
  return icons[type] || '🔔';
};

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadCount = useRef<number>(0);

  const { data: unreadCount = 0, refetch: refetchCount } = useGetUnreadNotificationsCountQuery(undefined, {
    pollingInterval: 30000, // Poll cada 30 segundos
  });
  const { data: notificationsData } = useGetUserNotificationsQuery(
    { page: 1, limit: 10, unreadOnly: false },
    { skip: !isOpen }
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = notificationsData?.data ?? [];

  // Efecto para animación cuando llegan nuevas notificaciones
  useEffect(() => {
    if (unreadCount > prevUnreadCount.current && prevUnreadCount.current > 0) {
      // Hay nuevas notificaciones, podríamos agregar sonido aquí si se desea
      console.log('🔔 Nueva notificación recibida');
    }
    prevUnreadCount.current = unreadCount;
  }, [unreadCount]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      // Si se está abriendo, refetch se hará automáticamente cuando skip cambie a false
      return !prev;
    });
  }, []);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        refetchCount();
      } catch {
        // Error ya logueado por RTK Query
      }
    }

    if (notification.link) {
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      refetchCount();
    } catch {
      // Error ya logueado por RTK Query
    }
  };

  const handleDelete = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await deleteNotification(notificationId);
      refetchCount();
      // RTK Query invalida automáticamente los datos por los tags
    } catch {
      // Error ya logueado por RTK Query
    }
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500',
          badge: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-800',
          label: '🔴 Urgente',
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-400',
          badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-800',
          label: '🟠 Alta',
        };
      case 'normal':
        return {
          bg: '',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800',
          label: '🔵 Normal',
        };
      case 'low':
        return {
          bg: '',
          badge: 'bg-muted text-muted-foreground border-border',
          label: '⚪ Baja',
        };
      default:
        return {
          bg: '',
          badge: 'bg-muted text-muted-foreground border-border',
          label: priority,
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de campana */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          unreadCount > 0 
            ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30' 
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6 animate-[pulse_2s_ease-in-out_infinite]" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Badge con contador */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-lg animate-[bounce_1s_ease-in-out_1]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-card rounded-xl shadow-2xl border border-border z-50 max-h-[70vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/30 dark:to-card">
            <div className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-foreground">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <BellIcon className="h-16 w-16 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">No hay notificaciones</p>
                <p className="text-muted-foreground/70 text-sm mt-1">Te avisaremos cuando haya novedades</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification: any) => {
                  const priorityStyles = getPriorityStyles(notification.priority);
                  const icon = getNotificationIcon(notification.type);
                  
                  return (
                    <li
                      key={notification.id}
                      className={`relative hover:bg-accent cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      } ${priorityStyles.bg}`}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notification)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="px-4 py-3">
                        {notification.link ? (
                          <Link to={notification.link} className="block">
                            <NotificationContent
                              notification={notification}
                              icon={icon}
                              priorityStyles={priorityStyles}
                              handleDelete={handleDelete}
                            />
                          </Link>
                        ) : (
                          <NotificationContent
                            notification={notification}
                            icon={icon}
                            priorityStyles={priorityStyles}
                            handleDelete={handleDelete}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/50">
              <Link
                to="/notificaciones"
                className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface NotificationContentProps {
  notification: any;
  icon: string;
  priorityStyles: { bg: string; badge: string; label: string };
  handleDelete: (id: number, e: React.MouseEvent) => void;
}

const NotificationContent = ({ notification, icon, priorityStyles, handleDelete }: NotificationContentProps) => (
  <div className="flex items-start gap-3">
    {/* Icono */}
    <div className="flex-shrink-0 text-2xl mt-0.5">
      {icon}
    </div>
    
    {/* Contenido */}
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-sm font-semibold truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
        </div>
        
        {/* Botón eliminar */}
        <button
          onClick={(e) => handleDelete(notification.id, e)}
          className="flex-shrink-0 p-1 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
          aria-label="Eliminar notificación"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Footer con prioridad y tiempo */}
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityStyles.badge}`}>
          {priorityStyles.label}
        </span>
        <span className="text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
        </span>
      </div>
    </div>
  </div>
);
