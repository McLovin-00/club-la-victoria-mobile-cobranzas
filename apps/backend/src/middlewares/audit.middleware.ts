import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../config/logger';

// Tipos básicos para auditoría
export enum AuditActionType {
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_PASSWORD_CHANGE = 'USER_PASSWORD_CHANGE',
  EMPRESA_CREATE = 'EMPRESA_CREATE',
  EMPRESA_UPDATE = 'EMPRESA_UPDATE',
  EMPRESA_DELETE = 'EMPRESA_DELETE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Utilidad para extraer IP real del cliente
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Utilidad para sanitizar User-Agent
 */
function sanitizeUserAgent(userAgent?: string): string {
  if (!userAgent) return 'unknown';

  // Limitar longitud y caracteres especiales
  return userAgent.slice(0, 500).replace(/[<>]/g, ''); // Remover caracteres potencialmente peligrosos
}

/**
 * Utilidad para extraer información de sesión
 * @internal Exportado solo para testing - no usar en producción
 */
export function _getSessionInfo(req: Request): string | undefined {
  // Extraer del token JWT o header de sesión
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // En un entorno real, decodificarías el token para obtener el session ID
    // Por simplicidad, usamos un hash del token
    return Buffer.from(token).toString('base64').slice(0, 32);
  }

  return (req as any).sessionID || undefined;
}

/**
 * Mapeo de rutas a tipos de acción de auditoría
 */
const _routeActionMap: Record<string, AuditActionType> = {
  'POST:/api/auth/register': AuditActionType.USER_CREATE,
  'POST:/api/auth/login': AuditActionType.USER_LOGIN,
  'POST:/api/auth/logout': AuditActionType.USER_LOGOUT,
  'POST:/api/usuarios': AuditActionType.USER_CREATE,
  'PUT:/api/usuarios': AuditActionType.USER_UPDATE,
  'PATCH:/api/usuarios': AuditActionType.USER_UPDATE,
  'DELETE:/api/usuarios': AuditActionType.USER_DELETE,
  'POST:/api/empresas': AuditActionType.EMPRESA_CREATE,
  'PUT:/api/empresas': AuditActionType.EMPRESA_UPDATE,
  'PATCH:/api/empresas': AuditActionType.EMPRESA_UPDATE,
  'DELETE:/api/empresas': AuditActionType.EMPRESA_DELETE,
  'POST:/api/auth/change-password': AuditActionType.USER_PASSWORD_CHANGE,
};

/**
 * Middleware principal de auditoría (simplificado)
 */
export const auditMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Agregar timestamp para medir performance
    (req as any).startTime = Date.now();

    // Capturar información básica
    const clientIP = getClientIP(req);
    const userAgent = sanitizeUserAgent(req.get('User-Agent'));

    // Log básico de la request
    AppLogger.debug('Request audit', {
      method: req.method,
      path: req.path,
      ip: clientIP,
      userAgent: userAgent.slice(0, 100),
      userId: (req as any).user?.id,
    });

    next();
  };
};

/**
 * Función para registrar acceso denegado
 */
export const auditAccessDenied = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = getClientIP(req);
  const userAgent = sanitizeUserAgent(req.get('User-Agent'));
  const user = (req as any).user;

  // Log del acceso denegado
  AppLogger.warn('Access denied audit', {
    userId: user?.id,
    email: user?.email,
    action: AuditActionType.ACCESS_DENIED,
    path: req.path,
    method: req.method,
    ip: clientIP,
    userAgent: userAgent.slice(0, 100),
    timestamp: new Date().toISOString(),
  });

  // TODO: Implementar almacenamiento en base de datos cuando sea necesario
  // await prisma.audit.create({ ... });

  next();
};

/**
 * Middleware para capturar valores antiguos (placeholder)
 */
export const captureOldValues = (resourceKey: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implementar captura de valores antiguos si es necesario
    AppLogger.debug('Capturing old values', { resourceKey, path: req.path });
    next();
  };
};

/**
 * Función helper para determinar la severidad
 * @internal Exportado solo para testing - no usar en producción
 */
export function _determineSeverity(actionType: AuditActionType, statusCode: number): AuditSeverity {
  if (statusCode >= 500) return AuditSeverity.CRITICAL;
  if (statusCode >= 400) return AuditSeverity.HIGH;
  if (actionType === AuditActionType.USER_DELETE || actionType === AuditActionType.EMPRESA_DELETE) {
    return AuditSeverity.HIGH;
  }
  if (actionType === AuditActionType.USER_PASSWORD_CHANGE) {
    return AuditSeverity.MEDIUM;
  }
  return AuditSeverity.LOW;
}

// Export por defecto
export default {
  auditMiddleware,
  auditAccessDenied,
  captureOldValues,
  AuditActionType,
  AuditResult,
  AuditSeverity,
  _getSessionInfo,
  _determineSeverity,
};
