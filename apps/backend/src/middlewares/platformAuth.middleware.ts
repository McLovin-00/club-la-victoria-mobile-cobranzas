import { Request, Response, NextFunction } from 'express';
import { PlatformAuthService, AuthPayload } from '../services/platformAuth.service';
import { AppLogger } from '../config/logger';
import { UserRole } from '@prisma/client';
import { prismaService } from '../config/prisma';

export interface AuthRequest extends Request {
  user?: AuthPayload;
  tenantId?: number | null;
}

/**
 * Middleware para autenticar usuarios de plataforma
 */
export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Intentar obtener token de diferentes fuentes
    let token: string | undefined;

    // 1. Header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Cookie (fallback)
    if (!token) {
      token = req.cookies?.platformToken;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Verificar token
    const payload = await PlatformAuthService.verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Adjuntar información del usuario a la request
    req.user = payload;
    // Compatibilidad con controladores antiguos que usan req.platformUser
    // @deprecated Usar req.user en lugar de req.platformUser
    (req as any).platformUser = payload;

    AppLogger.debug('✅ Usuario de plataforma autenticado', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    next();
  } catch (_error) {
    AppLogger.error('💥 Error en autenticación de plataforma:', _error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware para autorizar roles específicos
 */
export const authorizeRoles = (allowedRoles: (UserRole | string)[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED',
        });
        return;
      }

      AppLogger.debug('Verificando rol', {
        userId: user.userId,
        userRole: user.role,
        allowedRoles: allowedRoles,
      });
      
      if (!allowedRoles.includes(user.role)) {
        AppLogger.warn('🚫 Acceso denegado por rol', {
          userId: user.userId,
          userRole: user.role,
          requiredRoles: allowedRoles,
        });

        res.status(403).json({
          success: false,
          message: 'Permisos insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS',
        });
        return;
      }

      AppLogger.debug('✅ Autorización por rol exitosa', {
        userId: user.userId,
        role: user.role,
      });

      next();
    } catch (_error) {
      AppLogger.error('💥 Error en autorización de plataforma:', _error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Middleware para autorizar acceso a empresa específica
 */
export const authorizeEmpresaAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const user = req.user;
    const targetEmpresaId = parseInt(req.params.empresaId || req.body.empresaId || req.query.empresaId as string);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    // Superadmin tiene acceso a todas las empresas
    if (user.role === UserRole.SUPERADMIN) {
      next();
      return;
    }

    // Admin y user solo pueden acceder a su propia empresa
    if (user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR) {
      if (!user.empresaId) {
        res.status(403).json({
          success: false,
          message: 'Usuario no asociado a ninguna empresa',
          code: 'NO_EMPRESA_ASSIGNED',
        });
        return;
      }

      if (targetEmpresaId && user.empresaId !== targetEmpresaId) {
        AppLogger.warn('🚫 Intento de acceso a empresa no autorizada', {
          userId: user.userId,
          userEmpresaId: user.empresaId,
          targetEmpresaId,
        });

        res.status(403).json({
          success: false,
          message: 'Acceso denegado a la empresa solicitada',
          code: 'EMPRESA_ACCESS_DENIED',
        });
        return;
      }
    }

    next();
  } catch (_error) {
    AppLogger.error('💥 Error en autorización de empresa:', _error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware para resolver el tenant (empresa) activo según el rol
 * - SUPERADMIN: puede seleccionar vía header `x-empresa-id` o query/body `empresaId`
 * - ADMIN/OPERATOR: se fuerza al `empresaId` del token
 */
export const tenantResolver = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const user = req.user;
    let resolved: number | null = null;

    if (!user) {
      req.tenantId = null;
      return next();
    }

    if (user.role === UserRole.SUPERADMIN) {
      const fromHeader = (req.headers['x-empresa-id'] as string | undefined)?.toString();
      const fromQuery = (req.query.empresaId as string | undefined)?.toString();
      const fromBody = (req.body?.empresaId as string | number | undefined)?.toString();
      const chosen = fromHeader || fromQuery || fromBody;
      if (chosen) {
        const parsed = parseInt(chosen, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          resolved = parsed;
        }
      }
      // Si no hay selección, queda null (contexto global)
    } else {
      // Admin/Operator: usar empresa del token
      resolved = user.empresaId ?? null;
    }

    req.tenantId = resolved;
    next();
  } catch (_error) {
    // No bloquear flujo por resolución de tenant
    req.tenantId = null;
    next();
  }
};

/**
 * Middleware opcional para autenticación (no falla si no hay token)
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Intentar obtener token
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      token = req.cookies?.platformToken;
    }

    if (token) {
      // Verificar token si existe
      const payload = await PlatformAuthService.verifyToken(token);
      if (payload) {
        req.user = payload;
        AppLogger.debug('✅ Autenticación opcional exitosa', {
          userId: payload.userId,
        });
      }
    }

    // Continuar independientemente del resultado
    next();
  } catch (_error) {
    AppLogger.warn('⚠️ Error en autenticación opcional:', _error);
    // Continuar sin autenticación
    next();
  }
};

/**
 * Middleware para logging de acciones de usuarios de plataforma
 */
export const logAction = (action: string, details?: Record<string, any>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    
    if (user) {
      const logDetails = {
        userId: user.userId,
        email: user.email,
        role: user.role,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        ...details,
      };

      AppLogger.info(`🔍 Acción de usuario de plataforma: ${action}`, logDetails);

      try {
        const prisma = prismaService.getClient();
        const instanciaId = req.params.instanceId ? parseInt(req.params.instanceId, 10) : 1; // Default a 1 si no se provee

        const auditData: any = {
          accion: action,
          platformAdminId: user.userId,
          instanciaId: instanciaId,
          detalles: logDetails,
        };

        await prisma.auditLog.create({
          data: auditData,
        });
      } catch (dbError) {
        AppLogger.error('💥 Error al guardar en AuditLog:', {
          error: dbError,
          action: action,
        });
      }
    }

    next();
  };
}; 