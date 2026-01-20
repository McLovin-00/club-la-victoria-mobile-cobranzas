import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import type { DocumentStatus, EntityType } from '.prisma/documentos';

/**
 * StatusService - Sistema de Semáforos
 * Verde/Amarillo/Rojo para entidades
 */

export type SemaforoStatus = 'verde' | 'amarillo' | 'rojo';

export interface EntityStatus {
  entityType: EntityType;
  entityId: number;
  status: SemaforoStatus;
  documentCount: {
    total: number;
    aprobado: number;
    pendiente: number;
    rechazado: number;
    vencido: number;
  };
}

export interface EmpresaStatusSummary {
  empresaId: number; // reutilizado como dadorId
  overallStatus: SemaforoStatus;
  entities: {
    empresa: EntityStatus | null; // dador
    empresasTransportistas: EntityStatus[];
    choferes: EntityStatus[];
    camiones: EntityStatus[];
    acoplados: EntityStatus[];
  };
}

export class StatusService {
  
  /**
   * Calcular estado de una entidad específica
   */
  static calculateEntityStatus(documentCount: {
    total: number;
    aprobado: number;
    pendiente: number;
    rechazado: number;
    vencido: number;
  }): SemaforoStatus {
    
    const { total, aprobado, pendiente: _pendingCount, rechazado, vencido } = documentCount;
    
    if (total === 0) return 'rojo'; // Sin documentos
    
    // Rojo: Documentos vencidos o más del 50% rechazados
    if (vencido > 0 || (rechazado / total) > 0.5) {
      return 'rojo';
    }
    
    // Verde: Todos aprobados
    if (aprobado === total) {
      return 'verde';
    }
    
    // Amarillo: En proceso o algunos rechazados
    return 'amarillo';
  }

  /**
   * Obtener estado de una entidad
   */
  static async getEntityStatus(
    tenantEmpresaId: number,
    empresaId: number,
    entityType: EntityType,
    entityId: number
  ): Promise<EntityStatus | null> {
    try {
      const documents = await db.getClient().document.groupBy({
        by: ['status'],
        where: {
          tenantEmpresaId,
          dadorCargaId: empresaId,
          entityType,
          entityId,
        },
        _count: { status: true },
      });

      const documentCount = {
        total: 0,
        aprobado: 0,
        pendiente: 0,
        rechazado: 0,
        vencido: 0,
      };

      documents.forEach(doc => {
        const count = doc._count.status;
        documentCount.total += count;
        
        switch (doc.status) {
          case 'APROBADO' as DocumentStatus:
            documentCount.aprobado = count;
            break;
          case 'PENDIENTE' as DocumentStatus:
            documentCount.pendiente = count;
            break;
          case 'RECHAZADO' as DocumentStatus:
            documentCount.rechazado = count;
            break;
          case 'VENCIDO' as DocumentStatus:
            documentCount.vencido = count;
            break;
          case 'VALIDANDO' as DocumentStatus:
            documentCount.pendiente += count; // Validando se cuenta como pendiente
            break;
          case 'CLASIFICANDO' as DocumentStatus:
            documentCount.pendiente += count; // Clasificando se cuenta como pendiente
            break;
          case 'PENDIENTE_APROBACION' as DocumentStatus:
            documentCount.pendiente += count; // Pendiente de aprobación humana
            break;
        }
      });

      // Considerar vencidos por fecha aunque aún no se haya actualizado el estado
      try {
        const expiredByDate = await db.getClient().document.count({
          where: {
            tenantEmpresaId,
            dadorCargaId: empresaId,
            entityType,
            entityId,
            expiresAt: { lte: new Date() },
          },
        });
        if (expiredByDate > documentCount.vencido) {
          // Ajustar total manteniendo consistencia básica
          const delta = expiredByDate - documentCount.vencido;
          documentCount.vencido = expiredByDate;
          documentCount.total += delta;
        }
      } catch (_e) {
        AppLogger.debug('No se pudo calcular vencidos por fecha (fallback)', _e as any);
      }

      const status = this.calculateEntityStatus(documentCount);

      return {
        entityType,
        entityId,
        status,
        documentCount,
      };
    } catch (error) {
      AppLogger.error('Error obteniendo estado de entidad:', error);
      return null;
    }
  }

  /**
   * Obtener resumen completo de estado de empresa
   */
  static async getEmpresaStatusSummary(tenantEmpresaId: number, empresaId: number): Promise<EmpresaStatusSummary> {
    try {
      // Obtener todas las entidades con documentos para esta empresa
      const entitiesWithDocs = await db.getClient().document.findMany({
        where: { tenantEmpresaId, dadorCargaId: empresaId },
        select: {
          entityType: true,
          entityId: true,
        },
        distinct: ['entityType', 'entityId'],
      });

      const entities = {
        empresa: null as EntityStatus | null,
        empresasTransportistas: [] as EntityStatus[],
        choferes: [] as EntityStatus[],
        camiones: [] as EntityStatus[],
        acoplados: [] as EntityStatus[],
      };

      // Procesar cada entidad
      for (const entity of entitiesWithDocs) {
        const status = await this.getEntityStatus(
          tenantEmpresaId,
          empresaId,
          entity.entityType,
          entity.entityId
        );

        if (status) {
          switch (entity.entityType as unknown as string) {
            case 'DADOR':
              entities.empresa = status;
              break;
            case 'EMPRESA_TRANSPORTISTA':
              entities.empresasTransportistas.push(status);
              break;
            case 'CHOFER':
              entities.choferes.push(status);
              break;
            case 'CAMION':
              entities.camiones.push(status);
              break;
            case 'ACOPLADO':
              entities.acoplados.push(status);
              break;
          }
        }
      }

      // Calcular estado general de la empresa
      const allStatuses = [
        entities.empresa?.status,
        ...entities.choferes.map(c => c.status),
        ...entities.camiones.map(c => c.status),
        ...entities.acoplados.map(a => a.status),
      ].filter(Boolean) as Array<'verde' | 'amarillo' | 'rojo'>;

      let overallStatus: 'verde' | 'amarillo' | 'rojo' = 'verde';
      
      if (allStatuses.includes('rojo')) {
        overallStatus = 'rojo';
      } else if (allStatuses.includes('amarillo')) {
        overallStatus = 'amarillo';
      }

      return {
        empresaId,
        overallStatus,
        entities,
      };
    } catch (error) {
      AppLogger.error('Error obteniendo resumen de empresa:', error);
      return {
        empresaId,
        overallStatus: 'rojo',
        entities: {
          empresa: null,
          empresasTransportistas: [],
          choferes: [],
          camiones: [],
          acoplados: [],
        },
      };
    }
  }

  /**
   * Obtener resumen global para Superadmin
   */
  static async getGlobalStatusSummary(tenantEmpresaId?: number): Promise<EmpresaStatusSummary[]> {
    try {
      // Obtener todas las empresas con documentos
      const empresasWithDocs = await db.getClient().document.findMany({
        where: tenantEmpresaId ? { tenantEmpresaId } : undefined,
        select: { dadorCargaId: true },
        distinct: ['dadorCargaId'],
      });

      const summaries: EmpresaStatusSummary[] = [];

      for (const empresa of empresasWithDocs) {
        const summary = await this.getEmpresaStatusSummary(tenantEmpresaId ?? (empresa as any).tenantEmpresaId ?? 1, (empresa as any).dadorCargaId);
        summaries.push(summary);
      }

      return summaries;
    } catch (error) {
      AppLogger.error('Error obteniendo resumen global:', error);
      return [];
    }
  }

  /**
   * Obtener entidades con alarmas (estado rojo)
   */
  static async getEntitiesWithAlarms(empresaId?: number): Promise<EntityStatus[]> {
    try {
      let summaries: EmpresaStatusSummary[];
      
      if (empresaId) {
        // requiere tenant; buscar tenant del dador
        const anyDoc = await db.getClient().document.findFirst({ where: { dadorCargaId: empresaId }, select: { tenantEmpresaId: true } });
        const tenant = (anyDoc as any)?.tenantEmpresaId ?? 1;
        summaries = [await this.getEmpresaStatusSummary(tenant, empresaId)];
      } else {
        summaries = await this.getGlobalStatusSummary();
      }

      const alarmedEntities: EntityStatus[] = [];

      summaries.forEach(summary => {
        const { entities } = summary;
        
        // Agregar entidades con estado rojo
        if (entities.empresa?.status === 'rojo') {
          alarmedEntities.push(entities.empresa);
        }
        
        entities.choferes.forEach(chofer => {
          if (chofer.status === 'rojo') {
            alarmedEntities.push(chofer);
          }
        });
        
        entities.camiones.forEach(camion => {
          if (camion.status === 'rojo') {
            alarmedEntities.push(camion);
          }
        });
        
        entities.acoplados.forEach(acoplado => {
          if (acoplado.status === 'rojo') {
            alarmedEntities.push(acoplado);
          }
        });
      });

      return alarmedEntities;
    } catch (error) {
      AppLogger.error('Error obteniendo entidades con alarmas:', error);
      return [];
    }
  }
}