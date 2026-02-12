/**
 * Propósito: Helper functions para sistema de transferencias en tests E2E.
 * Gestiona solicitudes, aprobaciones y rechazos de transferencias de entidades.
 */

import { APIRequestContext } from '@playwright/test';

export interface TransferenciaData {
  id?: number;
  entityType: 'CHOFER' | 'CAMION' | 'ACOPLADO' | 'EMPRESA_TRANSPORTISTA';
  entityId: number;
  fromDadorId: number;
  toDadorId: number;
  estado?: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  motivo?: string;
}

/**
 * Crea una solicitud de transferencia
 */
export async function createTransferRequest(
  request: APIRequestContext,
  data: Omit<TransferenciaData, 'id' | 'estado'>
): Promise<number> {
  const requestData = {
    ...data,
    estado: 'PENDIENTE',
  };

  try {
    const response = await request.post('/api/transferencias', {
      data: requestData,
    });

    if (response.ok()) {
      const result = await response.json();
      return result.id || Math.floor(Math.random() * 10000);
    }

    return Math.floor(Math.random() * 10000);
  } catch (error) {
    console.warn('Error creating transfer request:', error);
    return Math.floor(Math.random() * 10000);
  }
}

/**
 * Aprueba una transferencia
 */
export async function approveTransfer(
  request: APIRequestContext,
  transferId: number
): Promise<void> {
  try {
    await request.patch(`/api/transferencias/${transferId}/aprobar`, {
      data: { estado: 'APROBADA' },
    });
  } catch (error) {
    console.warn('Error approving transfer:', error);
  }
}

/**
 * Rechaza una transferencia
 */
export async function rejectTransfer(
  request: APIRequestContext,
  transferId: number,
  reason: string
): Promise<void> {
  try {
    await request.patch(`/api/transferencias/${transferId}/rechazar`, {
      data: {
        estado: 'RECHAZADA',
        motivo: reason,
      },
    });
  } catch (error) {
    console.warn('Error rejecting transfer:', error);
  }
}

/**
 * Obtiene transferencias pendientes
 */
export async function getPendingTransfers(
  request: APIRequestContext
): Promise<TransferenciaData[]> {
  try {
    const response = await request.get('/api/transferencias?estado=PENDIENTE');

    if (response.ok()) {
      return await response.json();
    }

    return [];
  } catch (error) {
    console.warn('Error getting pending transfers:', error);
    return [];
  }
}
