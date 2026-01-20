import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppLogger } from '../config/logger';
import { UserRole } from '../types/roles';

/**
 * Auto-filtra requests por dadorCargaId cuando el usuario es DADOR_DE_CARGA.
 * - Inyecta req.query.dadorCargaId si no está presente.
 * - Si viene uno diferente al del usuario, deniega con 403.
 * - Para otros roles, no hace nada.
 */
export function autoFilterByDador(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const user = req.user as any;
    if (!user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'NOT_AUTHENTICATED' });
      return;
    }
    if (String(user.role) !== UserRole.DADOR_DE_CARGA) {
      next();
      return;
    }

    // Extraer dadorCargaId de metadata o directamente del user
    let userDadorId: number | undefined;
    if (typeof user?.metadata?.dadorCargaId === 'number') {
      userDadorId = user.metadata.dadorCargaId;
    } else if (typeof user?.dadorCargaId === 'number') {
      userDadorId = user.dadorCargaId;
    }

    if (!userDadorId) {
      AppLogger.warn('Dador sin dadorCargaId en token/metadata');
      res.status(403).json({ success: false, message: 'Dador sin alcance definido', code: 'DADOR_SCOPE_MISSING' });
      return;
    }

    const incoming = req.query?.dadorCargaId ?? req.body?.dadorCargaId ?? req.params?.dadorId;
    if (incoming !== undefined && Number(incoming) !== userDadorId) {
      AppLogger.warn('Intento de acceso a dador ajeno', { userDadorId, incoming });
      res.status(403).json({ success: false, message: 'Acceso denegado a dador indicado', code: 'DADOR_ACCESS_DENIED' });
      return;
    }

    // Definir dadorCargaId en query para estándar aguas abajo
    const set = (obj: any, key: string, value: any) => {
      Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
    };
    if (!(req.query as any).dadorCargaId) {
      set(req, 'query', { ...(req.query as any), dadorCargaId: String(userDadorId) });
    }

    next();
  } catch (error) {
    AppLogger.error('Error en autoFilterByDador:', error);
    res.status(500).json({ success: false, message: 'Error interno', code: 'INTERNAL_ERROR' });
  }
}


