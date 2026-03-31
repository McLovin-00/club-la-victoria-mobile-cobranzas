/**
 * Construye el contexto de visibilidad de tickets a partir del request autenticado.
 */

import type { AuthenticatedRequest } from '../middlewares/auth.middleware';
import type { TicketViewerContext } from '../types';

/**
 * Arma `TicketViewerContext` para reglas multi-tenant y de rol.
 */
export function buildTicketViewerContext(req: AuthenticatedRequest): TicketViewerContext {
  if (!req.user) {
    throw new Error('Usuario no autenticado');
  }
  return {
    userId: req.user.id,
    role: req.user.role,
    empresaId: req.user.empresaId ?? null,
  };
}
