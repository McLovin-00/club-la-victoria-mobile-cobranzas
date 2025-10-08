import { prisma } from '../config/database';
import type { EntityType } from '.prisma/documentos';

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

export class ComplianceService {
  static async evaluateEquipoCliente(equipoId: number, clienteId: number) {
    // Cargar equipo
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
    if (!equipo) return [] as RequirementResult[];

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

    // Resolver documentos más recientes aprobados por entidad
    const results: RequirementResult[] = [];

    for (const r of requisitos) {
      const entityId =
        r.entityType === 'CHOFER' ? equipo.driverId :
        r.entityType === 'CAMION' ? equipo.truckId :
        r.entityType === 'ACOPLADO' ? equipo.trailerId ?? 0 : 0;

      if (r.entityType === 'ACOPLADO' && !equipo.trailerId) {
        // Cliente exige acoplado pero el equipo no tiene → faltante
        results.push({
          templateId: r.templateId,
          entityType: r.entityType as any,
          obligatorio: r.obligatorio,
          diasAnticipacion: r.diasAnticipacion,
          state: 'FALTANTE',
        });
        continue;
      }

      const doc = await prisma.document.findFirst({
        where: {
          templateId: r.templateId,
          entityType: r.entityType as any,
          entityId,
          tenantEmpresaId: (equipo as any).tenantEmpresaId,
          dadorCargaId: (equipo as any).dadorCargaId,
          status: 'APROBADO' as any,
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

      const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null;
      let state: ComplianceState = 'OK';
      if (expiresAt) {
        const msLeft = expiresAt.getTime() - Date.now();
        const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) state = 'FALTANTE';
        else if (daysLeft <= r.diasAnticipacion) state = 'PROXIMO';
      }

      results.push({
        templateId: r.templateId,
        entityType: r.entityType as any,
        obligatorio: r.obligatorio,
        diasAnticipacion: r.diasAnticipacion,
        state,
        documentId: doc.id,
        expiresAt: doc.expiresAt,
      });
    }

    return results;
  }
}


