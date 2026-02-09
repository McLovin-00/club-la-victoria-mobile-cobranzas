/**
 * Tests completos para NotificationBell
 * Cubre todos los paths y ramas para alcanzar >= 90% de cobertura
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AllProviders } from '../../../test-utils/testWrappers';

describe('NotificationBell - Component Coverage', () => {
  let NotificationBell: React.FC;

  // Estado global para los mocks
  let mockUnreadCount = 0;
  let mockNotifications: unknown[] = [];
  let mockMarkAsRead = jest.fn().mockResolvedValue({});
  let mockMarkAllAsRead = jest.fn().mockResolvedValue({});
  let mockDeleteNotification = jest.fn().mockResolvedValue({});
  let mockRefetchCount = jest.fn();
  let mockRefetchNotifications = jest.fn();

  beforeAll(async () => {
    (globalThis as any).localStorage.getItem = jest.fn(() => 'token-x');

    await jest.unstable_mockModule('../../../features/documentos/api/documentosApiSlice', () => ({
      useGetUnreadNotificationsCountQuery: () => ({
        data: mockUnreadCount,
        refetch: mockRefetchCount,
      }),
      useGetUserNotificationsQuery: (_args: unknown, options: { skip?: boolean }) => ({
        data: { data: mockNotifications },
        refetch: mockRefetchNotifications,
      }),
      useMarkNotificationAsReadMutation: () => [mockMarkAsRead],
      useMarkAllNotificationsAsReadMutation: () => [mockMarkAllAsRead],
      useDeleteNotificationMutation: () => [mockDeleteNotification],
    }));

    ({ NotificationBell } = await import('../NotificationBell'));
  });

  beforeEach(() => {
    // Resetear mocks antes de cada test
    mockUnreadCount = 0;
    mockNotifications = [];
    mockMarkAsRead = jest.fn().mockResolvedValue({});
    mockMarkAllAsRead = jest.fn().mockResolvedValue({});
    mockDeleteNotification = jest.fn().mockResolvedValue({});
    mockRefetchCount = jest.fn();
    mockRefetchNotifications = jest.fn();
  });

  const renderWithNotifications = async (unreadCount: number, notifications: unknown[]) => {
    mockUnreadCount = unreadCount;
    mockNotifications = notifications;
    return render(<NotificationBell />, { wrapper: AllProviders });
  };

  describe('renderizado del bell', () => {
    it('debe renderizar el bell sin notificaciones sin leer', async () => {
      const { container } = await renderWithNotifications(0, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      expect(bell).toBeInTheDocument();
    });

    it('debe mostrar el bell cuando hay notificaciones sin leer', async () => {
      const { container } = await renderWithNotifications(5, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      expect(bell).toBeInTheDocument();

      const svg = bell?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('debe mostrar el badge con contador cuando hay notificaciones sin leer', async () => {
      const { container } = await renderWithNotifications(3, []);

      const badge = container.querySelector('span[class*="bg-red-600"]');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('3');
    });

    it('debe mostrar "99+" cuando hay más de 99 notificaciones sin leer', async () => {
      const { container } = await renderWithNotifications(150, []);

      const badge = container.querySelector('span[class*="bg-red-600"]');
      expect(badge?.textContent).toBe('99+');
    });

    it('no debe mostrar badge cuando no hay notificaciones sin leer', async () => {
      const { container } = await renderWithNotifications(0, []);

      const badge = container.querySelector('span[class*="bg-red-600"]');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('apertura y cierre del dropdown', () => {
    it('debe abrir el dropdown al hacer clic en el bell', async () => {
      const { container } = await renderWithNotifications(0, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('div[class*="bg-white"]');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('debe cerrar el dropdown al hacer clic nuevamente en el bell', async () => {
      const { container } = await renderWithNotifications(0, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');

      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('div[class*="shadow-xl"]');
        expect(dropdown).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('div[class*="shadow-xl"]');
        expect(dropdown).not.toBeInTheDocument();
      });
    });

    it('debe cerrar el dropdown al hacer clic fuera del componente', async () => {
      const { container } = await renderWithNotifications(0, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      // Simular clic fuera del componente
      await act(async () => {
        const outsideClick = new MouseEvent('mousedown', { bubbles: true });
        Object.defineProperty(outsideClick, 'target', {
          writable: false,
          value: document.body,
        });
        document.dispatchEvent(outsideClick);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('div[class*="shadow-xl"]');
        expect(dropdown).not.toBeInTheDocument();
      });
    });
  });

  describe('renderizado de notificaciones', () => {
    it('debe mostrar mensaje de "No hay notificaciones" cuando la lista está vacía', async () => {
      const { container } = await renderWithNotifications(0, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('No hay notificaciones')).toBeInTheDocument();
      });
    });

    it('debe renderizar lista de notificaciones cuando hay datos', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Nueva notificación',
          message: 'Mensaje de prueba',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('Nueva notificación')).toBeInTheDocument();
        expect(screen.getByText('Mensaje de prueba')).toBeInTheDocument();
      });
    });

    it('debe mostrar el botón "Marcar todas como leídas" cuando hay notificaciones', async () => {
      const mockNotifications = [
        { id: 1, title: 'Test', message: 'Test', priority: 'normal', read: false, createdAt: new Date().toISOString() },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('Marcar todas como leídas')).toBeInTheDocument();
      });
    });

    it('no debe mostrar el botón "Marcar todas como leídas" cuando no hay notificaciones', async () => {
      const { container } = await renderWithNotifications(0, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.queryByText('Marcar todas como leídas')).not.toBeInTheDocument();
      });
    });

    it('debe mostrar el footer con "Ver todas las notificaciones" cuando hay notificaciones', async () => {
      const mockNotifications = [
        { id: 1, title: 'Test', message: 'Test', priority: 'normal', read: false, createdAt: new Date().toISOString() },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('Ver todas las notificaciones')).toBeInTheDocument();
      });
    });

    it('no debe mostrar el footer cuando no hay notificaciones', async () => {
      const { container } = await renderWithNotifications(0, []);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.queryByText('Ver todas las notificaciones')).not.toBeInTheDocument();
      });
    });
  });

  describe('función getPriorityColor', () => {
    it('debe aplicar estilo correcto para prioridad urgent', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Urgente',
          message: 'Mensaje urgente',
          priority: 'urgent',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('🔴 Urgente')).toBeInTheDocument();
        const priorityBadge = container.querySelector('span[class*="bg-red-100"]');
        expect(priorityBadge).toBeInTheDocument();
      });
    });

    it('debe aplicar estilo correcto para prioridad high', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Alta',
          message: 'Mensaje de alta prioridad',
          priority: 'high',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('🟠 Alta')).toBeInTheDocument();
        const priorityBadge = container.querySelector('span[class*="bg-orange-100"]');
        expect(priorityBadge).toBeInTheDocument();
      });
    });

    it('debe aplicar estilo correcto para prioridad normal', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Normal',
          message: 'Mensaje normal',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('🔵 Normal')).toBeInTheDocument();
        const priorityBadge = container.querySelector('span[class*="bg-blue-100"]');
        expect(priorityBadge).toBeInTheDocument();
      });
    });

    it('debe aplicar estilo correcto para prioridad low', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Baja',
          message: 'Mensaje de baja prioridad',
          priority: 'low',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('⚪ Baja')).toBeInTheDocument();
        const priorityBadge = container.querySelector('span[class*="bg-gray-100"]');
        expect(priorityBadge).toBeInTheDocument();
      });
    });

    it('debe aplicar estilo por defecto para prioridad desconocida', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Desconocida',
          message: 'Mensaje con prioridad desconocida',
          priority: 'unknown',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const priorityBadge = container.querySelector('span[class*="bg-gray-100"]');
        expect(priorityBadge).toBeInTheDocument();
      });
    });
  });

  describe('interacción con notificaciones', () => {
    it('debe marcar como leída al hacer clic en una notificación no leída', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'No leída',
          message: 'Mensaje no leído',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      const notificationItem = await waitFor(() => container.querySelector('li[class*="cursor-pointer"]'));
      await act(async () => {
        fireEvent.click(notificationItem!);
      });

      await waitFor(() => {
        expect(mockMarkAsRead).toHaveBeenCalledWith(1);
      });
    });

    it('no debe marcar como leída si ya está leída', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Leída',
          message: 'Mensaje ya leído',
          priority: 'normal',
          read: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(0, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      const notificationItem = await waitFor(() => container.querySelector('li[class*="cursor-pointer"]'));
      await act(async () => {
        fireEvent.click(notificationItem!);
      });

      await waitFor(() => {
        expect(mockMarkAsRead).not.toHaveBeenCalled();
      });
    });

    it('debe cerrar el dropdown al hacer clic en una notificación con link', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Con link',
          message: 'Mensaje con link',
          priority: 'normal',
          read: false,
          link: '/documentos',
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      const linkElement = await waitFor(() => container.querySelector('a[href="/documentos"]'));
      await act(async () => {
        fireEvent.click(linkElement!, { bubbles: true });
      });

      await waitFor(() => {
        const dropdown = container.querySelector('div[class*="shadow-xl"]');
        expect(dropdown).not.toBeInTheDocument();
      });
    });

    it('no debe cerrar el dropdown al hacer clic en una notificación sin link', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Sin link',
          message: 'Mensaje sin link',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      const notificationItem = await waitFor(() => container.querySelector('li[class*="cursor-pointer"]'));
      await act(async () => {
        fireEvent.click(notificationItem!);
      });

      await waitFor(() => {
        const dropdown = container.querySelector('div[class*="shadow-xl"]');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('debe cerrar el dropdown al hacer clic en "Ver todas las notificaciones"', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Test',
          message: 'Test',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      const linkElement = await waitFor(() => screen.getByText('Ver todas las notificaciones').closest('a'));
      await act(async () => {
        fireEvent.click(linkElement!, { bubbles: true });
      });

      await waitFor(() => {
        const dropdown = container.querySelector('div[class*="shadow-xl"]');
        expect(dropdown).not.toBeInTheDocument();
      });
    });

    it('debe marcar todas como leídas al hacer clic en el botón correspondiente', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Test',
          message: 'Test',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      const markAllButton = await waitFor(() => screen.getByText('Marcar todas como leídas'));
      await act(async () => {
        fireEvent.click(markAllButton);
      });

      await waitFor(() => {
        expect(mockMarkAllAsRead).toHaveBeenCalled();
      });
    });

    it('debe eliminar notificación al hacer clic en el botón de eliminar', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Test',
          message: 'Test',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      const deleteButton = await waitFor(() => {
        const buttons = container.querySelectorAll('button[aria-label="Eliminar notificación"]');
        return buttons[0];
      });
      await act(async () => {
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockDeleteNotification).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('estilos de notificaciones leídas/no leídas', () => {
    it('debe aplicar fondo azul para notificaciones no leídas', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'No leída',
          message: 'Mensaje no leído',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const li = container.querySelector('li[class*="bg-blue-50"]');
        expect(li).toBeInTheDocument();
      });
    });

    it('no debe aplicar fondo azul para notificaciones leídas', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Leída',
          message: 'Mensaje leído',
          priority: 'normal',
          read: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(0, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const li = container.querySelector('li[class*="bg-blue-50"]');
        expect(li).not.toBeInTheDocument();
      });
    });

    it('debe mostrar indicador azul para notificaciones no leídas', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'No leída',
          message: 'Mensaje no leído',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const dot = container.querySelector('span[class*="bg-blue-600"][class*="rounded-full"]');
        expect(dot).toBeInTheDocument();
      });
    });

    it('no debe mostrar indicador azul para notificaciones leídas', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Leída',
          message: 'Mensaje leído',
          priority: 'normal',
          read: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(0, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        const dots = container.querySelectorAll('span[class*="bg-blue-600"][class*="rounded-full"]');
        expect(dots.length).toBe(0);
      });
    });
  });

  describe('múltiples notificaciones', () => {
    it('debe renderizar múltiples notificaciones', async () => {
      const mockNotifications = [
        {
          id: 1,
          title: 'Notificación 1',
          message: 'Mensaje 1',
          priority: 'urgent',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          title: 'Notificación 2',
          message: 'Mensaje 2',
          priority: 'high',
          read: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 3,
          title: 'Notificación 3',
          message: 'Mensaje 3',
          priority: 'normal',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(2, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('Notificación 1')).toBeInTheDocument();
        expect(screen.getByText('Notificación 2')).toBeInTheDocument();
        expect(screen.getByText('Notificación 3')).toBeInTheDocument();
      });
    });
  });

  describe('manejo de fechas relativas', () => {
    it('debe mostrar fecha relativa formateada', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const mockNotifications = [
        {
          id: 1,
          title: 'Antigua',
          message: 'Mensaje antiguo',
          priority: 'normal',
          read: false,
          createdAt: pastDate.toISOString(),
        },
      ];

      const { container } = await renderWithNotifications(1, mockNotifications);

      const bell = container.querySelector('button[aria-label="Notificaciones"]');
      await act(async () => {
        fireEvent.click(bell!);
      });

      await waitFor(() => {
        expect(screen.getByText('Antigua')).toBeInTheDocument();
        const timeElement = container.querySelector('span[class*="text-gray-500"]');
        expect(timeElement?.textContent).toMatch(/hace/);
      });
    });
  });
});
