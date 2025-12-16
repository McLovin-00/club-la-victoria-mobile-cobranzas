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

// Resultado de compliance por equipo (para batch)
export interface EquipoComplianceResult {
  equipoId: number;
  tieneVencidos: boolean;
  tieneFaltantes: boolean;
  tieneProximos: boolean;
  requirements: RequirementResultDetailed[];
}

// Información de equipo para batch processing
export interface EquipoInfo {
  id: number;
  tenantEmpresaId: number;
  dadorCargaId: number;
  driverId: number;
  truckId: number;
  trailerId: number | null;
  empresaTransportistaId: number | null;
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
        r.entityType === 'EMPRESA_TRANSPORTISTA' ? (equipo as any).empresaTransportistaId :
        r.entityType === 'CHOFER' ? (equipo as any).driverId :
        r.entityType === 'CAMION' ? (equipo as any).truckId :
        r.entityType === 'ACOPLADO' ? (equipo as any).trailerId : null;

      // Si el entityId es null/undefined/0, marcar como FALTANTE y continuar
      if (!entityId) {
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

  /**
   * BATCH COMPLIANCE: Evalúa múltiples equipos para un cliente en una sola operación.
   * Optimizado para reducir queries de N*M a ~5 queries totales.
   * 
   * @param equipos - Array de información de equipos
   * @param clienteId - ID del cliente para evaluar requisitos
   * @returns Map de equipoId -> resultado de compliance
   */
  static async evaluateBatchEquiposCliente(
    equipos: EquipoInfo[],
    clienteId: number
  ): Promise<Map<number, EquipoComplianceResult>> {
    const results = new Map<number, EquipoComplianceResult>();
    
    if (equipos.length === 0) {
      return results;
    }

    // 1. Cargar requisitos del cliente (1 query)
    const requisitos = await prisma.clienteDocumentRequirement.findMany({
      where: { clienteId },
      select: {
        templateId: true,
        entityType: true,
        obligatorio: true,
        diasAnticipacion: true,
      },
    });

    if (requisitos.length === 0) {
      // Sin requisitos, todos los equipos están "vigentes" sin datos
      for (const eq of equipos) {
        results.set(eq.id, {
          equipoId: eq.id,
          tieneVencidos: false,
          tieneFaltantes: false,
          tieneProximos: false,
          requirements: [],
        });
      }
      return results;
    }

    // 2. Recolectar todas las entidades únicas de todos los equipos
    const choferIds = new Set<number>();
    const camionIds = new Set<number>();
    const acopladoIds = new Set<number>();
    const empresaIds = new Set<number>();

    for (const eq of equipos) {
      if (eq.driverId) choferIds.add(eq.driverId);
      if (eq.truckId) camionIds.add(eq.truckId);
      if (eq.trailerId) acopladoIds.add(eq.trailerId);
      if (eq.empresaTransportistaId) empresaIds.add(eq.empresaTransportistaId);
    }

    // 3. Obtener templates relevantes
    const templateIds = [...new Set(requisitos.map(r => r.templateId))];

    // 4. Cargar TODOS los documentos relevantes en UNA query
    // Usamos el índice idx_documents_compliance_lookup
    const allDocs = await prisma.document.findMany({
      where: {
        templateId: { in: templateIds },
        OR: [
          { entityType: 'CHOFER', entityId: { in: [...choferIds] } },
          { entityType: 'CAMION', entityId: { in: [...camionIds] } },
          { entityType: 'ACOPLADO', entityId: { in: [...acopladoIds] } },
          { entityType: 'EMPRESA_TRANSPORTISTA', entityId: { in: [...empresaIds] } },
        ],
      },
      select: {
        id: true,
        templateId: true,
        entityType: true,
        entityId: true,
        tenantEmpresaId: true,
        dadorCargaId: true,
        status: true,
        expiresAt: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // 5. Indexar documentos: key = "entityType:entityId:templateId:tenant:dador" -> doc más reciente
    const docIndex = new Map<string, typeof allDocs[0]>();
    for (const doc of allDocs) {
      const key = `${doc.entityType}:${doc.entityId}:${doc.templateId}:${doc.tenantEmpresaId}:${doc.dadorCargaId}`;
      // Como están ordenados por uploadedAt DESC, el primero es el más reciente
      if (!docIndex.has(key)) {
        docIndex.set(key, doc);
      }
    }

    // 6. Evaluar compliance para cada equipo (todo en memoria)
    const now = Date.now();

    for (const eq of equipos) {
      const equipoRequirements: RequirementResultDetailed[] = [];
      let tieneVencidos = false;
      let tieneFaltantes = false;
      let tieneProximos = false;

      for (const r of requisitos) {
        // Determinar entityId según el tipo
        const entityId =
          r.entityType === 'EMPRESA_TRANSPORTISTA' ? eq.empresaTransportistaId :
          r.entityType === 'CHOFER' ? eq.driverId :
          r.entityType === 'CAMION' ? eq.truckId :
          r.entityType === 'ACOPLADO' ? eq.trailerId : null;

        // Si no hay entityId, es FALTANTE
        if (!entityId) {
          equipoRequirements.push({
            templateId: r.templateId,
            entityType: r.entityType as EntityType,
            obligatorio: r.obligatorio,
            diasAnticipacion: r.diasAnticipacion,
            state: 'FALTANTE',
          });
          tieneFaltantes = true;
          continue;
        }

        // Buscar documento en el índice
        const docKey = `${r.entityType}:${entityId}:${r.templateId}:${eq.tenantEmpresaId}:${eq.dadorCargaId}`;
        const doc = docIndex.get(docKey);

        if (!doc) {
          equipoRequirements.push({
            templateId: r.templateId,
            entityType: r.entityType as EntityType,
            obligatorio: r.obligatorio,
            diasAnticipacion: r.diasAnticipacion,
            state: 'FALTANTE',
          });
          tieneFaltantes = true;
          continue;
        }

        // Calcular estado del documento
        const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null;
        let state: ComplianceStateDetailed = 'VIGENTE';

        if (doc.status === 'RECHAZADO') {
          state = 'RECHAZADO';
          tieneFaltantes = true; // Rechazado cuenta como faltante
        } else if (doc.status === 'PENDIENTE' || doc.status === 'VALIDANDO' || 
                   doc.status === 'CLASIFICANDO' || doc.status === 'PENDIENTE_APROBACION') {
          state = 'PENDIENTE';
        } else if (doc.status === 'APROBADO') {
          if (expiresAt && expiresAt.getTime() < now) {
            state = 'VENCIDO';
            tieneVencidos = true;
          } else if (expiresAt) {
            const daysLeft = Math.floor((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24));
            if (daysLeft <= r.diasAnticipacion) {
              state = 'PROXIMO';
              tieneProximos = true;
            }
          }
        } else if (doc.status === 'VENCIDO') {
          state = 'VENCIDO';
          tieneVencidos = true;
        } else {
          state = 'PENDIENTE';
        }

        equipoRequirements.push({
          templateId: r.templateId,
          entityType: r.entityType as EntityType,
          obligatorio: r.obligatorio,
          diasAnticipacion: r.diasAnticipacion,
          state,
          documentId: doc.id,
          documentStatus: doc.status as DocumentStatus,
          expiresAt: expiresAt,
        });
      }

      results.set(eq.id, {
        equipoId: eq.id,
        tieneVencidos,
        tieneFaltantes,
        tieneProximos,
        requirements: equipoRequirements,
      });
    }

    return results;
  }
}
