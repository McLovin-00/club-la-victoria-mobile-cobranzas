/**
 * Propósito: Helper functions para gestión de notificaciones en tests E2E.
 * Permite crear notificaciones de prueba para diferentes escenarios.
 */

import { APIRequestContext } from '@playwright/test';

export type NotificationType =
  | 'DOCUMENTO_RECHAZADO'
  | 'DOCUMENTO_POR_VENCER'
  | 'TRANSFERENCIA_APROBADA'
  | 'TRANSFERENCIA_RECHAZADA';

export interface NotificationData {
  id?: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  read?: boolean;
  relatedId?: number;
}

/**
 * Crea una notificación de documento rechazado
 */
export async function createDocRejectedNotification(
  request: APIRequestContext,
  userId: number,
  docId: number
): Promise<number> {
  const notification: Omit<NotificationData, 'id'> = {
    userId,
    type: 'DOCUMENTO_RECHAZADO',
    title: 'Documento Rechazado',
    message: `El documento #${docId} fue rechazado. Por favor, revise los motivos.`,
    read: false,
    relatedId: docId,
  };

  return await createNotification(request, notification);
}

/**
 * Crea una notificación de documento por vencer
 */
export async function createDocExpiringNotification(
  request: APIRequestContext,
  userId: number,
  docId: number,
  daysLeft: number
): Promise<number> {
  const notification: Omit<NotificationData, 'id'> = {
    userId,
    type: 'DOCUMENTO_POR_VENCER',
    title: 'Documento por Vencer',
    message: `El documento #${docId} vence en ${daysLeft} días.`,
    read: false,
    relatedId: docId,
  };

  return await createNotification(request, notification);
}

/**
 * Crea una notificación de transferencia aprobada
 */
export async function createTransferApprovedNotification(
  request: APIRequestContext,
  userId: number,
  transferId: number
): Promise<number> {
  const notification: Omit<NotificationData, 'id'> = {
    userId,
    type: 'TRANSFERENCIA_APROBADA',
    title: 'Transferencia Aprobada',
    message: `Su solicitud de transferencia #${transferId} fue aprobada.`,
    read: false,
    relatedId: transferId,
  };

  return await createNotification(request, notification);
}

/**
 * Función genérica para crear notificaciones
 */
async function createNotification(
  request: APIRequestContext,
  data: Omit<NotificationData, 'id'>
): Promise<number> {
  try {
    const response = await request.post('/api/notifications', {
      data,
    });

    if (response.ok()) {
      const result = await response.json();
      return result.id || Math.floor(Math.random() * 10000);
    }

    return Math.floor(Math.random() * 10000);
  } catch (error) {
    console.warn('Error creating notification:', error);
    return Math.floor(Math.random() * 10000);
  }
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsRead(
  request: APIRequestContext,
  notificationId: number
): Promise<void> {
  try {
    await request.patch(`/api/notifications/${notificationId}`, {
      data: { read: true },
    });
  } catch (error) {
    console.warn('Error marking notification as read:', error);
  }
}
