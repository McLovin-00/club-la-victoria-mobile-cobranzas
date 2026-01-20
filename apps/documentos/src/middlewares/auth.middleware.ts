import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/roles';
import { DocumentosAuthService, AuthPayload } from '../config/auth';
import { AppLogger } from '../config/logger';

export interface AuthRequest extends Request {
  user?: AuthPayload;
  tenantId?: number;
}

// URLs que aceptan token en body (descargas via formulario)
const FORM_DOWNLOAD_URLS = [
  '/api/docs/equipos/download/vigentes-form',
  '/api/docs/portal-cliente/equipos/bulk-download-form',
];

/**
 * Extraer token de Authorization header o body (para descargas)
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  // Token en header estándar
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Token en body para descargas via formulario
  if (req.method === 'POST') {
    const tokenFromBody = (req as any).body?.token;
    const url = String((req as any).originalUrl || req.url || '');
    const isFormDownload = FORM_DOWNLOAD_URLS.some(u => url.includes(u));
    if (tokenFromBody && isFormDownload) {
      return String(tokenFromBody);
    }
  }

  return null;
}

/**
 * Middleware de autenticación - Simplicidad y Seguridad
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verificar si el servicio está habilitado
    if (!DocumentosAuthService.isServiceEnabled()) {
      res.status(503).json({
        success: false,
        message: 'Servicio de documentos no disponible',
        code: 'SERVICE_DISABLED',
      });
      return;
    }

    const token = extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const payload = await DocumentosAuthService.verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Adjuntar usuario autenticado a la request
    req.user = payload;

    AppLogger.debug('✅ Usuario autenticado en microservicio documentos', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    next();
  } catch (error) {
    AppLogger.error('💥 Error en autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware de autorización por roles - Elegante y Directo
 */
export const authorize = (allowedRoles: Array<UserRole | string>): any => {
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

      if (!allowedRoles.map(String).includes(String(user.role))) {
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

      next();
    } catch (error) {
      AppLogger.error('💥 Error en autorización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * Resolver de Tenant - Determina req.tenantId
 * - Por defecto usa user.empresaId
 * - SUPERADMIN y ADMIN_INTERNO pueden seleccionar tenant via header 'x-tenant-id' o query 'tenantId'
 */
export const tenantResolver = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado', code: 'NOT_AUTHENTICATED' });
      return;
    }
    let resolvedTenant: number | undefined = undefined;
    
    // SUPERADMIN y ADMIN_INTERNO pueden acceder a cualquier tenant
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_INTERNO') {
      const headerTenant = req.headers['x-tenant-id'];
      const queryTenant = (req.query as any).tenantId;
      const candidate = headerTenant ?? queryTenant ?? user.empresaId;
      if (candidate !== undefined) {
        const parsed = parseInt(String(candidate));
        if (!Number.isNaN(parsed) && parsed > 0) {
          resolvedTenant = parsed;
        }
      }
    } else {
      // Para roles no superadmin/admin_interno, debe venir en el token y ser numérico
      resolvedTenant = typeof (user as any).empresaId === 'number' ? (user as any).empresaId : undefined;
    }
    if (!resolvedTenant) {
      res.status(400).json({ success: false, message: 'Tenant no especificado', code: 'MISSING_TENANT' });
      return;
    }
    req.tenantId = resolvedTenant;
    next();
  } catch (error) {
    AppLogger.error('💥 Error resolviendo tenant:', error);
    res.status(500).json({ success: false, message: 'Error interno', code: 'TENANT_RESOLUTION_ERROR' });
  }
};

/**
 * Middleware de autorización por empresa - Acceso Granular
 */
export const authorizeEmpresa = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const user = req.user;
    const targetEmpresaIdRaw = req.params?.dadorId ?? req.body?.dadorCargaId ?? req.query?.dadorCargaId;
    const targetEmpresaId = Number.parseInt(String(targetEmpresaIdRaw));

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED',
      });
      return;
    }

    if (!targetEmpresaId) {
      res.status(400).json({ success: false, message: 'ID de dador requerido', code: 'MISSING_DADOR_ID' });
      return;
    }

    if (!DocumentosAuthService.hasEmpresaAccess(user, targetEmpresaId)) {
      AppLogger.warn('🚫 Acceso denegado a empresa', {
        userId: user.userId,
        userEmpresaId: user.empresaId,
        targetEmpresaId,
      });

      res.status(403).json({ success: false, message: 'Acceso denegado al dador solicitado', code: 'DADOR_ACCESS_DENIED' });
      return;
    }

    next();
  } catch (error) {
    AppLogger.error('💥 Error en autorización de empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware de validación - Zod con Elegancia
 */
export const validate = (schema: any): any => {
  // No mutar req.query directamente para evitar "Cannot set property query"
  const set = (obj: any, key: string, value: any) => {
    Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
  };
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        AppLogger.warn('⚠️ Validación fallida:', result.error.format());
        
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          code: 'VALIDATION_ERROR',
          errors: result.error.format(),
        });
        return;
      }

      // Reemplazar datos validados
      req.body = result.data.body || req.body;
      if (result.data.query) set(req, 'query', result.data.query);
      if (result.data.params) set(req, 'params', result.data.params);

      next();
    } catch (error) {
      AppLogger.error('💥 Error en validación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};