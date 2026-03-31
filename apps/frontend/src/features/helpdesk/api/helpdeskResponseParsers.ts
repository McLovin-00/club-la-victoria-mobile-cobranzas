/**
 * Funciones puras para adaptar respuestas JSON del microservicio Helpdesk
 * (`{ success, data, pagination? }`) a los tipos consumidos por la UI.
 */

import type { Ticket, TicketMessage, PaginatedTicketsResponse } from '../types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Extrae `data` de respuestas estándar del helpdesk; si no viene envuelto, devuelve el valor tal cual.
 */
export function unwrapHelpdeskData<T>(response: unknown): T {
  if (isRecord(response) && 'data' in response) {
    return response.data as T;
  }
  return response as T;
}

/**
 * Lista paginada: el backend envía `data` + `pagination` en el mismo nivel.
 */
export function parsePaginatedTicketsResponse(response: unknown): PaginatedTicketsResponse {
  const root = isRecord(response) ? response : {};
  const pagination = isRecord(root.pagination) ? root.pagination : {};
  const list = Array.isArray(root.data) ? root.data : [];
  return {
    data: list as Ticket[],
    total: typeof pagination.total === 'number' ? pagination.total : 0,
    page: typeof pagination.page === 'number' ? pagination.page : 1,
    limit: typeof pagination.limit === 'number' ? pagination.limit : 20,
    totalPages: typeof pagination.totalPages === 'number' ? pagination.totalPages : 1,
  };
}

export function parseMessagesResponse(response: unknown): { data: TicketMessage[]; total: number } {
  const root = isRecord(response) ? response : {};
  const pagination = isRecord(root.pagination) ? root.pagination : {};
  const list = Array.isArray(root.data) ? root.data : [];
  return {
    data: list as TicketMessage[],
    total: typeof pagination.total === 'number' ? pagination.total : 0,
  };
}
