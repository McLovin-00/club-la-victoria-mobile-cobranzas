import { prisma } from '../config/database';
import type { DocumentStatus, EntityType } from '.prisma/documentos';

export type ComplianceState = 'OK' | 'PROXIMO' | 'FALTANTE';

export interface RequirementResult {
  templateId: number;
  entityType: EntityType;
  obligatorio: boolean;
  diasAnticipacion: number;
  state: ComplianceState;
  documentId?: number;
  expiresAt?: Date | null;
}

// Estados detallados para sprint 3
export type ComplianceStateDetailed = 'VIGENTE' | 'PROXIMO' | 'VENCIDO' | 'PENDIENTE' | 'RECHAZADO' | 'FALTANTE';

export interface RequirementResultDetailed {
  templateId: number;
  entityType: EntityType;
  obligatorio: boolean;
  diasAnticipacion: number;
  state: ComplianceStateDetailed;
  documentId?: number;
  documentStatus?: DocumentStatus;
  expiresAt?: Date | null;
}

export class ComplianceService {
  // Método legado (usado por rutas existentes)
  static async evaluateEquipoCliente(equipoId: number, clienteId: number) {
    const detailed = await this.evaluateEquipoClienteDetailed(equipoId, clienteId);
    // Mapear a estados simples
    const simple: RequirementResult[] = detailed.map((r) => {
      let state: ComplianceState = 'OK';
      if (r.state === 'FALTANTE') state = 'FALTANTE';
      else if (r.state === 'PROXIMO') state = 'PROXIMO';
      else if (r.state === 'VENCIDO' || r.state === 'PENDIENTE' || r.state === 'RECHAZADO') state = 'FALTANTE';
      else state = 'OK';
      return {
        templateId: r.templateId,
        entityType: r.entityType,
        obligatorio: r.obligatorio,
        diasAnticipacion: r.diasAnticipacion,
        state,
        documentId: r.documentId,
        expiresAt: r.expiresAt ?? null,
      };
    });
    return simple;
  }

  // Nuevo método detallado
  static async evaluateEquipoClienteDetailed(equipoId: number, clienteId: number): Promise<RequirementResultDetailed[]> {
    // Cargar equipo
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
    if (!equipo) return [] as RequirementResultDetailed[];

    // Cargar requisitos del cliente por entidad
    const requisitos = await prisma.clienteDocumentRequirement.findMany({
      where: { clienteId },
      select: {
        id: true,
        templateId: true,
        entityType: true,
        obligatorio: true,
        diasAnticipacion: true,
      },
    });

    const results: RequirementResultDetailed[] = [];
    for (const r of requisitos) {
      const entityId =
        r.entityType === 'CHOFER' ? (equipo as any).driverId :
        r.entityType === 'CAMION' ? (equipo as any).truckId :
        r.entityType === 'ACOPLADO' ? ((equipo as any).trailerId ?? 0) : 0;

      if (r.entityType === 'ACOPLADO' && !(equipo as any).trailerId) {
        results.push({
          templateId: r.templateId,
          entityType: r.entityType as any,
          obligatorio: r.obligatorio,
          diasAnticipacion: r.diasAnticipacion,
          state: 'FALTANTE',
        });
        continue;
      }

      // Buscar último documento (cualquier estado)
      const doc = await prisma.document.findFirst({
        where: {
          templateId: r.templateId,
          entityType: r.entityType as any,
          entityId,
          tenantEmpresaId: (equipo as any).tenantEmpresaId,
          dadorCargaId: (equipo as any).dadorCargaId,
        },
        orderBy: { uploadedAt: 'desc' },
      });

      if (!doc) {
        results.push({
          templateId: r.templateId,
          entityType: r.entityType as any,
          obligatorio: r.obligatorio,
          diasAnticipacion: r.diasAnticipacion,
          state: 'FALTANTE',
        });
        continue;
      }

      // Determinar estado detallado
      const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null;
      const now = Date.now();
      let state: ComplianceStateDetailed = 'VIGENTE';
      if (doc.status === 'RECHAZADO') state = 'RECHAZADO';
      else if (doc.status === 'PENDIENTE' || doc.status === 'VALIDANDO' || doc.status === 'CLASIFICANDO' || doc.status === 'PENDIENTE_APROBACION') state = 'PENDIENTE';
      else if (doc.status === 'APROBADO') {
        if (expiresAt && expiresAt.getTime() < now) state = 'VENCIDO';
        else if (expiresAt) {
          const daysLeft = Math.floor((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24));
          state = daysLeft <= r.diasAnticipacion ? 'PROXIMO' : 'VIGENTE';
        } else {
          state = 'VIGENTE';
        }
      } else if (doc.status === 'VENCIDO') {
        state = 'VENCIDO';
      } else {
        // Cualquier otro caso desconocido: considerar pendiente
        state = 'PENDIENTE';
      }

      results.push({
        templateId: r.templateId,
        entityType: r.entityType as any,
        obligatorio: r.obligatorio,
        diasAnticipacion: r.diasAnticipacion,
        state,
        documentId: (doc as any).id,
        documentStatus: (doc as any).status,
        expiresAt: (doc as any).expiresAt ?? null,
      });
    }
    return results;
  }
}


