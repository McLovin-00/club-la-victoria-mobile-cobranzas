/**
 * Alcance multi-tenant para Mesa de Ayuda: tickets se asocian a `empresaId` de plataforma.
 */

import type { TicketViewerContext } from '../types';

/** Resultado de qué tickets puede listar un usuario staff en endpoints admin/listado global */
export type StaffTenantScope =
  | { kind: 'all' }
  | { kind: 'own' } // Solo sus propios tickets
  | { kind: 'empresa'; empresaId: number }
  | { kind: 'none' };

/**
 * Resuelve el alcance de tenant para roles que ven el panel (SUPERADMIN / RESOLVER / ADMIN / ADMIN_INTERNO).
 *
 * - SUPERADMIN: Ve TODOS los tickets (acceso global administrativo)
 * - RESOLVER: Ve TODOS los tickets (para resolver de cualquier tenant)
 * - ADMIN / ADMIN_INTERNO: Solo ve SUS PROPIOS tickets (no puede ver de otros usuarios de su empresa)
 */
export function resolveStaffTenantScope(role: string, empresaId?: number | null): StaffTenantScope {
  if (role === 'SUPERADMIN' || role === 'RESOLVER') {
    return { kind: 'all' };
  }
  if (role === 'ADMIN' || role === 'ADMIN_INTERNO') {
    // ADMIN y ADMIN_INTERNO solo ven sus propios tickets, no los de toda la empresa
    return { kind: 'own' };
  }
  return { kind: 'none' };
}

/**
 * Indica si el usuario puede ver el detalle del ticket (listado admin o creador).
 * 
 * - SUPERADMIN: Ve TODOS los tickets
 * - RESOLVER: Ve TODOS los tickets (para resolver de cualquier tenant)
 * - ADMIN / ADMIN_INTERNO: Solo ve SUS PROPIOS tickets
 * - Cualquier usuario: Ve sus propios tickets
 */
export function ticketCanBeViewedBy(
  ticket: { createdBy: number; empresaId: number | null },
  viewer: TicketViewerContext
): boolean {
  // SUPERADMIN y RESOLVER pueden ver TODOS los tickets
  if (viewer.role === 'SUPERADMIN' || viewer.role === 'RESOLVER') {
    return true;
  }
  // Cualquier usuario puede ver sus propios tickets
  if (ticket.createdBy === viewer.userId) {
    return true;
  }
  // ADMIN y ADMIN_INTERNO ya no pueden ver tickets de otros usuarios de su empresa
  // Solo ven sus propios tickets (ya cubierto arriba)
  return false;
}
