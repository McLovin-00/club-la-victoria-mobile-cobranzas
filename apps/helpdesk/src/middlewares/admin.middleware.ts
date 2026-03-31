import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AppLogger } from '../config/logger';

/**
 * Roles permitidos para acciones administrativas del helpdesk
 * Solo SUPERADMIN y RESOLVER pueden gestionar tickets
 */
const ADMIN_ROLES = ['SUPERADMIN', 'RESOLVER'];

/**
 * Middleware que verifica si el usuario tiene rol de administrador
 * Debe usarse DESPUÉS de authMiddleware
 */
export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuario no autenticado',
      error: 'UNAUTHORIZED',
    });
    return;
  }

  if (!ADMIN_ROLES.includes(req.user.role)) {
    AppLogger.warn(`Acceso denegado para usuario ${req.user.id} con rol ${req.user.role}`);
    
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador.',
      error: 'FORBIDDEN',
    });
    return;
  }

  next();
};

/**
 * Middleware que verifica si el usuario tiene uno de los roles especificados
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'UNAUTHORIZED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      AppLogger.warn(
        `Acceso denegado para usuario ${req.user.id} con rol ${req.user.role}. Roles permitidos: ${allowedRoles.join(', ')}`
      );
      
      res.status(403).json({
        success: false,
        message: 'Acceso denegado',
        error: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};
