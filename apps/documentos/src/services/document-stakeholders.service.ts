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

      // 1. Admins y SuperAdmins de la plataforma (backend)
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
          document.dadorCargaId,
          document.tenantEmpresaId
        );
        stakeholders.push(...choferStakeholders);
      }

      return stakeholders;
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders:', error);
      return [];
    }
  }

  /**
   * Obtener admins de la plataforma
   */
  private static async getAdminUsers(tenantEmpresaId: number): Promise<DocumentStakeholder[]> {
    try {
      // Consultar al backend principal para obtener admins
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(`${backendUrl}/api/users?role=ADMIN,SUPERADMIN,ADMIN_INTERNO&empresaId=${tenantEmpresaId}`, {
        headers: {
          'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
        },
      });

      if (!response.ok) {
        AppLogger.warn(`Error fetching admin users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: user.role as UserRole,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo admins:', error);
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
      // Obtener usuarios del rol DADOR_DE_CARGA asociados a este dador desde el backend principal
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(
        `${backendUrl}/api/users?role=DADOR_DE_CARGA&empresaId=${tenantEmpresaId}&dadorCargaId=${dadorCargaId}`,
        {
          headers: {
            'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }
      );

      if (!response.ok) {
        AppLogger.warn(`Error fetching dador users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: UserRole.DADOR_DE_CARGA,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        dadorCargaId: dadorCargaId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del dador:', error);
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

      // Obtener usuarios del rol TRANSPORTISTA asociados a esta empresa desde el backend principal
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(
        `${backendUrl}/api/users?role=TRANSPORTISTA&empresaId=${tenantEmpresaId}&empresaTransportistaId=${empresaTransportistaId}`,
        {
          headers: {
            'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }
      );

      if (!response.ok) {
        AppLogger.warn(`Error fetching transportista users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: UserRole.TRANSPORTISTA,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        empresaTransportistaId: empresaTransportistaId!,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del transportista:', error);
      return [];
    }
  }

  /**
   * Obtener stakeholders del Chofer
   */
  private static async getChoferStakeholders(
    choferId: number,
    dadorCargaId: number,
    tenantEmpresaId: number
  ): Promise<DocumentStakeholder[]> {
    try {
      // Obtener usuarios del rol CHOFER asociados a este chofer desde el backend principal
      const backendUrl = process.env.BACKEND_API_URL || 'http://backend:3000';
      const response = await fetch(
        `${backendUrl}/api/users?role=CHOFER&empresaId=${tenantEmpresaId}&choferId=${choferId}`,
        {
          headers: {
            'X-Internal-Service': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }
      );

      if (!response.ok) {
        AppLogger.warn(`Error fetching chofer users: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const users = data?.data ?? [];

      return users.map((user: any) => ({
        role: UserRole.CHOFER,
        userId: user.id,
        email: user.email,
        tenantEmpresaId: tenantEmpresaId,
        choferId: choferId,
      }));
    } catch (error) {
      AppLogger.error('Error obteniendo stakeholders del chofer:', error);
      return [];
    }
  }
}
