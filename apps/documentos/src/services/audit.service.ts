import { AppLogger } from '../config/logger';

type AuditPayload = {
  tenantEmpresaId?: number;
  userId?: number | string;
  userRole?: string;
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
  userAgent?: string | null;
  action?: string;
  entityType?: string;
  entityId?: number | string;
  details?: unknown;
};

/**
 * AuditService
 * - Registra acciones relevantes de forma segura.
 * - Intenta persistir en BD si existe el modelo `auditLog`; caso contrario, loggea via Winston.
 */
export class AuditService {
  static async log(event: AuditPayload): Promise<void> {
    try {
      // 1) Log estructurado (siempre)
      AppLogger.info('🧾 AUDIT', event);

      // 2) Intento de persistencia (best-effort, no rompe flujo)
      try {
        const { db } = await import('../config/database');
        const client: any = db.getClient?.();
        if (client?.auditLog?.create) {
          await client.auditLog.create({
            data: {
              tenantEmpresaId: event.tenantEmpresaId ?? null,
              action: event.action ?? `${event.method} ${event.path}`,
              detalles: event as any,
              userId: typeof event.userId === 'number' ? event.userId : null,
              userRole: event.userRole ?? null,
              statusCode: event.statusCode,
              entityType: event.entityType ?? null,
              entityId: typeof event.entityId === 'number' ? event.entityId : null,
            },
          });
        }
      } catch {
        // Silenciar errores de persistencia para no afectar la request
      }
    } catch {
      // No-op: nunca romper por auditoría
    }
  }
}


