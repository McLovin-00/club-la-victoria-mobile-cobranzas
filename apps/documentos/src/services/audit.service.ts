import { AppLogger } from '../config/logger';

type AuditPayload = {
  tenantEmpresaId?: number;
  userId?: number | string;
  userEmail?: string;
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

type EquipoAuditPayload = {
  equipoId: number;
  usuarioId: number;
  accion: 'CREAR' | 'EDITAR' | 'ELIMINAR' | 'TRANSFERIR' | 'AGREGAR_CLIENTE' | 'QUITAR_CLIENTE';
  campoModificado?: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  motivo?: string;
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
              accion: event.action ?? `${event.method} ${event.path}`,
              method: event.method,
              path: event.path,
              detalles: event as any,
              userId: typeof event.userId === 'number' ? event.userId : null,
              userEmail: event.userEmail ?? null,
              userRole: event.userRole ?? null,
              statusCode: event.statusCode,
              entityType: event.entityType ?? null,
              entityId: typeof event.entityId === 'number' ? event.entityId : null,
            },
          });
        }
      } catch (err) {
        // Log warning para diagnóstico, sin romper el flujo
        AppLogger.warn('⚠️ Audit persistence failed', { error: err instanceof Error ? err.message : err });
      }
    } catch {
      // No-op: nunca romper por auditoría
    }
  }

  /**
   * Registra cambios específicos de equipos
   */
  static async logEquipoChange(event: EquipoAuditPayload): Promise<void> {
    try {
      AppLogger.info('🧾 EQUIPO_AUDIT', event);

      const { db } = await import('../config/database');
      const client: any = db.getClient?.();
      if (client?.equipoAuditLog?.create) {
        await client.equipoAuditLog.create({
          data: {
            equipoId: event.equipoId,
            usuarioId: event.usuarioId,
            accion: event.accion,
            campoModificado: event.campoModificado ?? null,
            valorAnterior: event.valorAnterior ? JSON.stringify(event.valorAnterior) : null,
            valorNuevo: event.valorNuevo ? JSON.stringify(event.valorNuevo) : null,
            motivo: event.motivo ?? null,
          },
        });
      }
    } catch (err) {
      AppLogger.error('Error registrando auditoría de equipo', { error: err, event });
    }
  }

  /**
   * Obtiene historial de cambios de un equipo
   */
  static async getEquipoHistory(equipoId: number): Promise<unknown[]> {
    try {
      const { db } = await import('../config/database');
      const client: any = db.getClient?.();
      if (client?.equipoAuditLog?.findMany) {
        return await client.equipoAuditLog.findMany({
          where: { equipoId },
          orderBy: { createdAt: 'desc' },
        });
      }
      return [];
    } catch {
      return [];
    }
  }
}


