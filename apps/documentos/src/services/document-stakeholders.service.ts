import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { UserRole } from '../types/roles';

/**
 * Stakeholder (responsable) en la cadena de un documento
 */
export interface DocumentStakeholder {
  role: UserRole;
  userId: number;
  email?: string;
  tenantEmpresaId: number;
  dadorCargaId?: number;
  empresaTransportistaId?: number;
  choferId?: number;
}

/**
 * Servicio para identificar todos los responsables (stakeholders) de un documento
 * Consulta directamente la base de datos compartida (schema platform)
 */
export class DocumentStakeholdersService {
  
  /**
   * Obtener todos los stakeholders de un documento
   */
  static async getDocumentStakeholders(documentId: number): Promise<DocumentStakeholder[]> {
    try {
      const document = await db.getClient().document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          dadorCargaId: true,
          tenantEmpresaId: true,
        },
      });

      if (!document) {
        AppLogger.warn(`Documento ${documentId} no encontrado`);
        return [];
      }

      const stakeholders: DocumentStakeholder[] = [];

      // 1. Admins y SuperAdmins de la plataforma
      const admins = await this.getAdminUsers(document.tenantEmpresaId);
      stakeholders.push(...admins);

      // 2. Dador de Carga (empresa propietaria)
      const dadorStakeholders = await this.getDadorStakeholders(document.dadorCargaId, document.tenantEmpresaId);
      stakeholders.push(...dadorStakeholders);

      // 3. Empresa Transportista (si aplica)
      const transportistaStakeholders = await this.getTransportistaStakeholders(
        document.entityType,
        document.entityId,
        document.dadorCargaId,
        document.tenantEmpresaId
      );
      stakeholders.push(...transportistaStakeholders);

      // 4. Chofer (si el documento le pertenece)
      if (document.entityType === 'CHOFER') {
        const choferStakeholders = await this.getChoferStakeholders(
          document.entityId,
          document.tenantEmpresaId
        );
        stakeholders.push(...choferStakeholders);
      }

      AppLogger.debug(`Stakeholders encontrados para documento ${documentId}: ${stakeholders.length}`);
      return stakeholders;
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders:', error);
      return [];
    }
  }

  /**
   * Obtener admins de la plataforma consultando directamente la BD
   */
  private static async getAdminUsers(tenantEmpresaId: number): Promise<DocumentStakeholder[]> {
    try {
      // Consulta directa al schema platform
      const users = await db.getClient().$queryRaw<Array<{ id: number; email: string; role: string }>>`
        SELECT id, email, role 
        FROM platform.users 
        WHERE empresa_id = ${tenantEmpresaId}
          AND role IN ('SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO')
          AND activo = true
      `;

      return users.map((user) => ({
        role: user.role as UserRole,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo admins desde BD:', error);
      return [];
    }
  }

  /**
   * Obtener stakeholders del Dador de Carga
   */
  private static async getDadorStakeholders(
    dadorCargaId: number,
    tenantEmpresaId: number
  ): Promise<DocumentStakeholder[]> {
    try {
      // Consulta directa al schema platform
      const users = await db.getClient().$queryRaw<Array<{ id: number; email: string }>>`
        SELECT id, email 
        FROM platform.users 
        WHERE empresa_id = ${tenantEmpresaId}
          AND dador_carga_id = ${dadorCargaId}
          AND role = 'DADOR_DE_CARGA'
          AND activo = true
      `;

      return users.map((user) => ({
        role: UserRole.DADOR_DE_CARGA,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        dadorCargaId: dadorCargaId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del dador desde BD:', error);
      return [];
    }
  }

  /**
   * Obtener stakeholders de la Empresa Transportista
   */
  private static async getTransportistaStakeholders(
    entityType: string,
    entityId: number,
    dadorCargaId: number,
    tenantEmpresaId: number
  ): Promise<DocumentStakeholder[]> {
    try {
      let empresaTransportistaId: number | null = null;

      // Determinar la empresa transportista según el tipo de entidad
      if (entityType === 'EMPRESA_TRANSPORTISTA') {
        empresaTransportistaId = entityId;
      } else if (entityType === 'CHOFER') {
        const chofer = await db.getClient().chofer.findFirst({
          where: { id: entityId, dadorCargaId, tenantEmpresaId },
          select: { empresaTransportistaId: true },
        });
        empresaTransportistaId = chofer?.empresaTransportistaId ?? null;
      } else if (entityType === 'CAMION') {
        const camion = await db.getClient().camion.findFirst({
          where: { id: entityId, dadorCargaId, tenantEmpresaId },
          select: { empresaTransportistaId: true },
        });
        empresaTransportistaId = camion?.empresaTransportistaId ?? null;
      } else if (entityType === 'ACOPLADO') {
        const acoplado = await db.getClient().acoplado.findFirst({
          where: { id: entityId, dadorCargaId, tenantEmpresaId },
          select: { empresaTransportistaId: true },
        });
        empresaTransportistaId = acoplado?.empresaTransportistaId ?? null;
      }

      if (!empresaTransportistaId) return [];

      // Consulta directa al schema platform
      const users = await db.getClient().$queryRaw<Array<{ id: number; email: string }>>`
        SELECT id, email 
        FROM platform.users 
        WHERE empresa_id = ${tenantEmpresaId}
          AND empresa_transportista_id = ${empresaTransportistaId}
          AND role = 'TRANSPORTISTA'
          AND activo = true
      `;

      return users.map((user) => ({
        role: UserRole.TRANSPORTISTA,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        empresaTransportistaId: empresaTransportistaId!,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del transportista desde BD:', error);
      return [];
    }
  }

  /**
   * Obtener stakeholders del Chofer
   */
  private static async getChoferStakeholders(
    choferId: number,
    tenantEmpresaId: number
  ): Promise<DocumentStakeholder[]> {
    try {
      // Consulta directa al schema platform
      const users = await db.getClient().$queryRaw<Array<{ id: number; email: string }>>`
        SELECT id, email 
        FROM platform.users 
        WHERE empresa_id = ${tenantEmpresaId}
          AND chofer_id = ${choferId}
          AND role = 'CHOFER'
          AND activo = true
      `;

      return users.map((user) => ({
        role: UserRole.CHOFER,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        choferId: choferId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del chofer desde BD:', error);
      return [];
    }
  }
}
