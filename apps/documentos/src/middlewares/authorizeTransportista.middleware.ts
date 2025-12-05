import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppLogger } from '../config/logger';
import { UserRole } from '../types/roles';

/**
 * Autoriza y auto-filtra a TRANSPORTISTA/CHOFER a su propio alcance.
 * - Inyecta empresaTransportistaId o choferId/choferDniNorm cuando existan en el token/metadata.
 * - Si se intenta forzar un filtro distinto, deniega.
 * - Otros roles: no modifica.
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
      next();
      return;
    }

    // Buscar en metadata (legacy) o directamente en user (nuevo formato JWT)
    const meta = (user as any).metadata || {};
    const empresaTransportistaId: number | undefined =
      typeof meta.empresaTransportistaId === 'number' ? meta.empresaTransportistaId :
      typeof user.empresaTransportistaId === 'number' ? user.empresaTransportistaId : undefined;
    const choferId: number | undefined = 
      typeof meta.choferId === 'number' ? meta.choferId :
      typeof user.choferId === 'number' ? user.choferId : undefined;
    const choferDniNorm: string | undefined =
      typeof meta.choferDniNorm === 'string' ? String(meta.choferDniNorm) :
      typeof user.choferDniNorm === 'string' ? String(user.choferDniNorm) : undefined;

    if (!empresaTransportistaId && !choferId && !choferDniNorm) {
      AppLogger.warn('Transportista/Chofer sin metadata de alcance');
      res.status(403).json({ success: false, message: 'Alcance de transportista no definido', code: 'TRANSPORT_SCOPE_MISSING' });
      return;
    }

    const set = (obj: any, key: string, value: any) => {
      Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
    };
    const q: any = { ...(req.query as any) };

    // Verificar overrides indebidos
    if (empresaTransportistaId) {
      const incoming = q.empresaTransportistaId ?? (req.body as any)?.empresaTransportistaId;
      if (incoming !== undefined && Number(incoming) !== empresaTransportistaId) {
        res.status(403).json({ success: false, message: 'Acceso denegado a empresa transportista indicada', code: 'TRANSPORT_ACCESS_DENIED' });
        return;
      }
      q.empresaTransportistaId = String(empresaTransportistaId);
    }
    if (choferId) {
      const incoming = q.choferId ?? (req.body as any)?.choferId;
      if (incoming !== undefined && Number(incoming) !== choferId) {
        res.status(403).json({ success: false, message: 'Acceso denegado a chofer indicado', code: 'DRIVER_ACCESS_DENIED' });
        return;
      }
      q.choferId = String(choferId);
    }
    if (choferDniNorm) {
      const incoming = q.choferDniNorm ?? (req.body as any)?.choferDniNorm;
      if (incoming !== undefined && String(incoming) !== choferDniNorm) {
        res.status(403).json({ success: false, message: 'Acceso denegado al DNI indicado', code: 'DRIVER_ACCESS_DENIED' });
        return;
      }
      q.choferDniNorm = choferDniNorm;
    }

    set(req, 'query', q);
    next();
  } catch (error) {
    AppLogger.error('Error en authorizeTransportista:', error);
    res.status(500).json({ success: false, message: 'Error interno', code: 'INTERNAL_ERROR' });
  }
}


