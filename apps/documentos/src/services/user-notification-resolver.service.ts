import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import type { EntityType } from '.prisma/documentos';

// ============================================================================
// UserNotificationResolverService
// Resuelve la cadena jerárquica de notificaciones:
// Chofer → Transportista → Dador de Carga
// ============================================================================

export interface NotificationRecipient {
  userId: number;
  email: string;
  role: string;
  nombre: string | null;
  apellido: string | null;
  reason: 'direct' | 'transportista_of_chofer' | 'dador_of_transportista' | 'dador_of_chofer' | 'admin_interno';
}

interface PlatformUser {
  id: number;
  email: string;
  role: string;
  nombre: string | null;
  apellido: string | null;
  empresa_id: number | null;
  dador_carga_id: number | null;
  empresa_transportista_id: number | null;
  chofer_id: number | null;
  activo: boolean;
}

export class UserNotificationResolverService {
  /**
   * Consulta usuarios desde el schema platform
   */
  private static async queryPlatformUsers(
    conditions: string,
    params: any[]
  ): Promise<PlatformUser[]> {
    try {
      const query = `
        SELECT 
          id, email, role, nombre, apellido, 
          empresa_id, dador_carga_id, empresa_transportista_id, chofer_id, activo
        FROM platform.platform_users
        WHERE activo = true AND ${conditions}
      `;

      const users = await prisma.$queryRawUnsafe<PlatformUser[]>(query, ...params);
      return users;
    } catch (error) {
      AppLogger.error('Error consultando platform_users:', error);
      return [];
    }
  }

  /**
   * Obtiene usuarios Admin Interno del tenant
   */
  static async getAdminInternosForTenant(tenantEmpresaId: number): Promise<NotificationRecipient[]> {
    const users = await this.queryPlatformUsers(
      `empresa_id = $1 AND role = 'ADMIN_INTERNO'`,
      [tenantEmpresaId]
    );

    return users.map(u => ({
      userId: u.id,
      email: u.email,
      role: u.role,
      nombre: u.nombre,
      apellido: u.apellido,
      reason: 'admin_interno' as const,
    }));
  }

  /**
   * Dado un choferId, resuelve toda la cadena: chofer + transportista + dador
   */
  static async resolveFromChofer(
    tenantEmpresaId: number,
    choferId: number
  ): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];

    // 1. Buscar usuario con rol CHOFER asociado a este choferId
    const choferUsers = await this.queryPlatformUsers(
      `empresa_id = $1 AND chofer_id = $2 AND role = 'CHOFER'`,
      [tenantEmpresaId, choferId]
    );

    for (const u of choferUsers) {
      recipients.push({
        userId: u.id,
        email: u.email,
        role: u.role,
        nombre: u.nombre,
        apellido: u.apellido,
        reason: 'direct',
      });
    }

    // 2. Obtener datos del chofer para saber su transportista y dador
    const chofer = await prisma.chofer.findUnique({
      where: { id: choferId },
      select: {
        empresaTransportistaId: true,
        dadorCargaId: true,
      },
    });

    if (!chofer) {
      AppLogger.warn(`Chofer ${choferId} no encontrado en documentos`);
      return recipients;
    }

    // 3. Si tiene transportista, notificar al transportista
    if (chofer.empresaTransportistaId) {
      const transportistaRecipients = await this.resolveFromTransportista(
        tenantEmpresaId,
        chofer.empresaTransportistaId,
        true
      );

      for (const r of transportistaRecipients) {
        if (!recipients.find(ex => ex.userId === r.userId)) {
          recipients.push({
            ...r,
            reason: 'transportista_of_chofer',
          });
        }
      }
    }

    // 4. Notificar al dador de carga
    const dadorRecipients = await this.resolveFromDador(tenantEmpresaId, chofer.dadorCargaId);
    for (const r of dadorRecipients) {
      if (!recipients.find(ex => ex.userId === r.userId)) {
        recipients.push({
          ...r,
          reason: 'dador_of_chofer',
        });
      }
    }

    return recipients;
  }

  /**
   * Dado un empresaTransportistaId, resuelve: transportista + dador
   */
  static async resolveFromTransportista(
    tenantEmpresaId: number,
    empresaTransportistaId: number,
    skipDador = false
  ): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];

    const transportistaUsers = await this.queryPlatformUsers(
      `empresa_id = $1 AND empresa_transportista_id = $2 AND role = 'TRANSPORTISTA'`,
      [tenantEmpresaId, empresaTransportistaId]
    );

    for (const u of transportistaUsers) {
      recipients.push({
        userId: u.id,
        email: u.email,
        role: u.role,
        nombre: u.nombre,
        apellido: u.apellido,
        reason: 'direct',
      });
    }

    if (skipDador) {
      return recipients;
    }

    const empresa = await prisma.empresaTransportista.findUnique({
      where: { id: empresaTransportistaId },
      select: { dadorCargaId: true },
    });

    if (empresa?.dadorCargaId) {
      const dadorRecipients = await this.resolveFromDador(tenantEmpresaId, empresa.dadorCargaId);
      for (const r of dadorRecipients) {
        if (!recipients.find(ex => ex.userId === r.userId)) {
          recipients.push({
            ...r,
            reason: 'dador_of_transportista',
          });
        }
      }
    }

    return recipients;
  }

  /**
   * Dado un dadorCargaId, resuelve usuarios DADOR_DE_CARGA
   */
  static async resolveFromDador(
    tenantEmpresaId: number,
    dadorCargaId: number
  ): Promise<NotificationRecipient[]> {
    const users = await this.queryPlatformUsers(
      `empresa_id = $1 AND dador_carga_id = $2 AND role = 'DADOR_DE_CARGA'`,
      [tenantEmpresaId, dadorCargaId]
    );

    return users.map(u => ({
      userId: u.id,
      email: u.email,
      role: u.role,
      nombre: u.nombre,
      apellido: u.apellido,
      reason: 'direct' as const,
    }));
  }

  /**
   * Resuelve usuarios desde un tipo de entidad genérico
   */
  static async resolveFromEntity(
    tenantEmpresaId: number,
    entityType: EntityType,
    entityId: number
  ): Promise<NotificationRecipient[]> {
    switch (entityType) {
      case 'CHOFER':
        return this.resolveFromChofer(tenantEmpresaId, entityId);

      case 'CAMION':
      case 'ACOPLADO': {
        const vehiculo = entityType === 'CAMION'
          ? await prisma.camion.findUnique({
              where: { id: entityId },
              select: { empresaTransportistaId: true, dadorCargaId: true },
            })
          : await prisma.acoplado.findUnique({
              where: { id: entityId },
              select: { empresaTransportistaId: true, dadorCargaId: true },
            });

        if (!vehiculo) return [];

        const recipients: NotificationRecipient[] = [];

        if (vehiculo.empresaTransportistaId) {
          const transportistaRecipients = await this.resolveFromTransportista(
            tenantEmpresaId,
            vehiculo.empresaTransportistaId
          );
          recipients.push(...transportistaRecipients);
        } else if (vehiculo.dadorCargaId) {
          const dadorRecipients = await this.resolveFromDador(tenantEmpresaId, vehiculo.dadorCargaId);
          recipients.push(...dadorRecipients);
        }

        return recipients;
      }

      case 'EMPRESA_TRANSPORTISTA':
        return this.resolveFromTransportista(tenantEmpresaId, entityId);

      default:
        AppLogger.warn(`EntityType no soportado para resolución: ${entityType}`);
        return [];
    }
  }

  /**
   * Resuelve todos los usuarios relacionados a un equipo
   */
  static async resolveFromEquipo(equipoId: number): Promise<NotificationRecipient[]> {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: {
        tenantEmpresaId: true,
        dadorCargaId: true,
        empresaTransportistaId: true,
        driverId: true,
      },
    });

    if (!equipo) {
      AppLogger.warn(`Equipo ${equipoId} no encontrado`);
      return [];
    }

    const recipients: NotificationRecipient[] = [];
    const addedUserIds = new Set<number>();

    const choferRecipients = await this.resolveFromChofer(equipo.tenantEmpresaId, equipo.driverId);
    for (const r of choferRecipients) {
      if (!addedUserIds.has(r.userId)) {
        addedUserIds.add(r.userId);
        recipients.push(r);
      }
    }

    if (equipo.empresaTransportistaId) {
      const transportistaRecipients = await this.resolveFromTransportista(
        equipo.tenantEmpresaId,
        equipo.empresaTransportistaId
      );
      for (const r of transportistaRecipients) {
        if (!addedUserIds.has(r.userId)) {
          addedUserIds.add(r.userId);
          recipients.push(r);
        }
      }
    }

    const dadorRecipients = await this.resolveFromDador(equipo.tenantEmpresaId, equipo.dadorCargaId);
    for (const r of dadorRecipients) {
      if (!addedUserIds.has(r.userId)) {
        addedUserIds.add(r.userId);
        recipients.push(r);
      }
    }

    return recipients;
  }

  /**
   * Obtiene Admin Internos para notificaciones de transferencia
   */
  static async resolveForTransferencia(tenantEmpresaId: number): Promise<NotificationRecipient[]> {
    return this.getAdminInternosForTenant(tenantEmpresaId);
  }

  /**
   * Resuelve todos los usuarios bajo un dador de carga
   */
  static async resolveAllFromDadorCarga(
    tenantEmpresaId: number,
    dadorCargaId: number
  ): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];
    const addedUserIds = new Set<number>();

    const dadorUsers = await this.resolveFromDador(tenantEmpresaId, dadorCargaId);
    for (const r of dadorUsers) {
      if (!addedUserIds.has(r.userId)) {
        addedUserIds.add(r.userId);
        recipients.push(r);
      }
    }

    const empresas = await prisma.empresaTransportista.findMany({
      where: { tenantEmpresaId, dadorCargaId },
      select: { id: true },
    });

    for (const empresa of empresas) {
      const transportistaUsers = await this.queryPlatformUsers(
        `empresa_id = $1 AND empresa_transportista_id = $2 AND role = 'TRANSPORTISTA'`,
        [tenantEmpresaId, empresa.id]
      );

      for (const u of transportistaUsers) {
        if (!addedUserIds.has(u.id)) {
          addedUserIds.add(u.id);
          recipients.push({
            userId: u.id,
            email: u.email,
            role: u.role,
            nombre: u.nombre,
            apellido: u.apellido,
            reason: 'dador_of_transportista',
          });
        }
      }
    }

    const choferes = await prisma.chofer.findMany({
      where: { tenantEmpresaId, dadorCargaId },
      select: { id: true },
    });

    for (const chofer of choferes) {
      const choferUsers = await this.queryPlatformUsers(
        `empresa_id = $1 AND chofer_id = $2 AND role = 'CHOFER'`,
        [tenantEmpresaId, chofer.id]
      );

      for (const u of choferUsers) {
        if (!addedUserIds.has(u.id)) {
          addedUserIds.add(u.id);
          recipients.push({
            userId: u.id,
            email: u.email,
            role: u.role,
            nombre: u.nombre,
            apellido: u.apellido,
            reason: 'dador_of_chofer',
          });
        }
      }
    }

    return recipients;
  }
}
