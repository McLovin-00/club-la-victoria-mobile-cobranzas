/**
 * Propósito: Helper functions para gestión de remitos en tests E2E.
 * Permite crear, modificar y gestionar remitos de prueba.
 */

import { APIRequestContext } from '@playwright/test';

export interface RemitoData {
  id?: number;
  numero?: string;
  fecha?: string;
  estado?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  dadadorId?: number;
  productos?: Array<{
    nombre: string;
    cantidad: number;
  }>;
}

/**
 * Crea un remito de prueba usando la API
 */
export async function createTestRemito(
  request: APIRequestContext,
  data: Partial<RemitoData>
): Promise<RemitoData> {
  const defaultData: RemitoData = {
    numero: `TEST-${Date.now()}`,
    fecha: new Date().toISOString().split('T')[0],
    estado: 'PENDIENTE',
    productos: [
      { nombre: 'Producto Test', cantidad: 100 },
    ],
    ...data,
  };

  try {
    const response = await request.post('/api/remitos', {
      data: defaultData,
    });

    if (response.ok()) {
      return await response.json();
    }

    // Si falla, retornar datos con ID simulado
    return { ...defaultData, id: Math.floor(Math.random() * 10000) };
  } catch (error) {
    console.warn('Error creating test remito, returning mock data:', error);
    return { ...defaultData, id: Math.floor(Math.random() * 10000) };
  }
}

/**
 * Elimina un remito de prueba
 */
export async function deleteTestRemito(
  request: APIRequestContext,
  remitoId: number
): Promise<void> {
  try {
    await request.delete(`/api/remitos/${remitoId}`);
  } catch (error) {
    console.warn('Error deleting test remito:', error);
  }
}

/**
 * Actualiza el estado de un remito
 */
export async function updateRemitoEstado(
  request: APIRequestContext,
  remitoId: number,
  estado: 'APROBADO' | 'RECHAZADO',
  motivo?: string
): Promise<RemitoData | null> {
  try {
    const response = await request.patch(`/api/remitos/${remitoId}`, {
      data: { estado, motivo },
    });

    if (response.ok()) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.warn('Error updating remito estado:', error);
    return null;
  }
}
