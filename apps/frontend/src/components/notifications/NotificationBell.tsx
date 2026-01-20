import { useState, useEffect, useRef } from 'react';
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

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0, refetch: refetchCount } = useGetUnreadNotificationsCountQuery();
  const { data: notificationsData, refetch: refetchNotifications } = useGetUserNotificationsQuery(
    { page: 1, limit: 10, unreadOnly: false },
    { skip: !isOpen }
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = notificationsData?.data ?? [];

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

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
      refetchCount();
      refetchNotifications();
    }

    if (notification.link) {
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    refetchCount();
    refetchNotifications();
  };

  const handleDelete = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
    refetchCount();
    refetchNotifications();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'normal':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'low':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="Notificaciones"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6 text-blue-600 animate-pulse" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {notifications.map((notification: any) => (
                  <li
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notification.link ? (
                      <Link to={notification.link} className="block">
                        <NotificationContent
                          notification={notification}
                          getPriorityColor={getPriorityColor}
                          handleDelete={handleDelete}
                        />
                      </Link>
                    ) : (
                      <NotificationContent
                        notification={notification}
                        getPriorityColor={getPriorityColor}
                        handleDelete={handleDelete}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <Link
                to="/notificaciones"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium block text-center"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
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
  getPriorityColor: (priority: string) => string;
  handleDelete: (id: number, e: React.MouseEvent) => void;
}

const NotificationContent = ({ notification, getPriorityColor, handleDelete }: NotificationContentProps) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h4 className={`text-sm font-semibold ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
          {notification.title}
        </h4>
        {!notification.read && (
          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
        )}
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-1">{notification.message}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(notification.priority)}`}>
          {notification.priority === 'urgent' && '🔴 Urgente'}
          {notification.priority === 'high' && '🟠 Alta'}
          {notification.priority === 'normal' && '🔵 Normal'}
          {notification.priority === 'low' && '⚪ Baja'}
        </span>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
        </span>
      </div>
    </div>
    <button
      onClick={(e) => handleDelete(notification.id, e)}
      className="text-gray-400 hover:text-red-600 flex-shrink-0 p-1"
      aria-label="Eliminar notificación"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);
