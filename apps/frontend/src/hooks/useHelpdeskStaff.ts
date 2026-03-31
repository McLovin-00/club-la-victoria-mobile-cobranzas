/**
 * Indica si el usuario actual actúa como personal de mesa de ayuda (listado tenant + stats + respuestas resolver).
 */

import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/features/auth/authSlice';

const HELPDESK_STAFF_ROLES = new Set(['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'RESOLVER']);

export function useIsHelpdeskStaff(): boolean {
  const user = useSelector(selectCurrentUser);
  return user?.role != null && HELPDESK_STAFF_ROLES.has(user.role);
}

/**
 * Indica si el usuario puede crear tickets.
 * RESOLVER no puede crear tickets, solo responderlos.
 */
export function useCanCreateTickets(): boolean {
  const user = useSelector(selectCurrentUser);
  if (!user?.role) return false;
  // Cualquier usuario que no sea RESOLVER puede crear tickets
  return user.role !== 'RESOLVER';
}
