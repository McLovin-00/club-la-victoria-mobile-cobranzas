import { NextFunction, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { AuthRequest } from './auth.middleware';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Middleware de auditoría basado en respuesta:
 * - Se engancha al evento 'finish' para registrar status final
 * - Audita solo métodos mutantes
 */
export const auditMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();
  const shouldAudit = MUTATING_METHODS.has(req.method.toUpperCase());

  if (shouldAudit) {
    res.on('finish', () => {
      // Best-effort, asincrónico
      void AuditService.log({
        tenantEmpresaId: req.tenantId,
        userId: req.user?.userId,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        action: `${req.method} ${req.route?.path || req.path}`,
        details: {
          durationMs: Date.now() - startedAt,
          requestId: (req as any).requestId,
        },
      });
    });
  }

  next();
};


