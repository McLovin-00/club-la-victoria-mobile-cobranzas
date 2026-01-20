import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppLogger } from '../config/logger';
import { UserRole } from '../types/roles';

// ============================================================================
// HELPERS
// ============================================================================

interface TransportScope {
  empresaTransportistaId?: number;
  choferId?: number;
  choferDniNorm?: string;
}

/** Extrae número de metadata o user */
function getNumberFromUserOrMeta(user: any, meta: any, key: string): number | undefined {
  if (typeof meta[key] === 'number') return meta[key];
  if (typeof user[key] === 'number') return user[key];
  return undefined;
}

/** Extrae string de metadata o user */
function getStringFromUserOrMeta(user: any, meta: any, key: string): string | undefined {
  if (typeof meta[key] === 'string') return meta[key];
  if (typeof user[key] === 'string') return user[key];
  return undefined;
}

/** Extrae scope de transportista del token */
function extractTransportScope(user: any): TransportScope {
  const meta = user.metadata || {};
  return {
    empresaTransportistaId: getNumberFromUserOrMeta(user, meta, 'empresaTransportistaId'),
    choferId: getNumberFromUserOrMeta(user, meta, 'choferId'),
    choferDniNorm: getStringFromUserOrMeta(user, meta, 'choferDniNorm'),
  };
}

/** Verifica si hay override indebido de un campo numérico */
function checkNumericOverride(query: any, body: any, key: string, allowed: number): string | null {
  const incoming = query[key] ?? body?.[key];
  if (incoming !== undefined && Number(incoming) !== allowed) {
    return key;
  }
  return null;
}

/** Verifica si hay override indebido de un campo string */
function checkStringOverride(query: any, body: any, key: string, allowed: string): string | null {
  const incoming = query[key] ?? body?.[key];
  if (incoming !== undefined && String(incoming) !== allowed) {
    return key;
  }
  return null;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Autoriza y auto-filtra a TRANSPORTISTA/CHOFER a su propio alcance.
 */
export function authorizeTransportista(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'NOT_AUTHENTICATED' });
      return;
    }

    const role = String(user.role);
    if (role !== UserRole.TRANSPORTISTA && role !== UserRole.CHOFER) {
      return next();
    }

    const scope = extractTransportScope(user);
    if (!scope.empresaTransportistaId && !scope.choferId && !scope.choferDniNorm) {
      AppLogger.warn('Transportista/Chofer sin metadata de alcance');
      res.status(403).json({ success: false, message: 'Alcance de transportista no definido', code: 'TRANSPORT_SCOPE_MISSING' });
      return;
    }

    const q: any = { ...req.query };
    const body = req.body;

    // Verificar overrides
    if (scope.empresaTransportistaId && checkNumericOverride(q, body, 'empresaTransportistaId', scope.empresaTransportistaId)) {
      res.status(403).json({ success: false, message: 'Acceso denegado a empresa transportista indicada', code: 'TRANSPORT_ACCESS_DENIED' });
      return;
    }
    if (scope.choferId && checkNumericOverride(q, body, 'choferId', scope.choferId)) {
      res.status(403).json({ success: false, message: 'Acceso denegado a chofer indicado', code: 'DRIVER_ACCESS_DENIED' });
      return;
    }
    if (scope.choferDniNorm && checkStringOverride(q, body, 'choferDniNorm', scope.choferDniNorm)) {
      res.status(403).json({ success: false, message: 'Acceso denegado al DNI indicado', code: 'DRIVER_ACCESS_DENIED' });
      return;
    }

    // Inyectar scope en query
    if (scope.empresaTransportistaId) q.empresaTransportistaId = String(scope.empresaTransportistaId);
    if (scope.choferId) q.choferId = String(scope.choferId);
    if (scope.choferDniNorm) q.choferDniNorm = scope.choferDniNorm;

    Object.defineProperty(req, 'query', { value: q, writable: true, enumerable: true, configurable: true });
    next();
  } catch (error) {
    AppLogger.error('Error en authorizeTransportista:', error);
    res.status(500).json({ success: false, message: 'Error interno', code: 'INTERNAL_ERROR' });
  }
}


