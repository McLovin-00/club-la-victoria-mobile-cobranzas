import { prisma } from '../config/database';
import type { DocumentStatus, EntityType } from '.prisma/documentos';

// ============================================================================
// TIPOS
// ============================================================================
export type ComplianceState = 'OK' | 'PROXIMO' | 'FALTANTE';
export type ComplianceStateDetailed = 'VIGENTE' | 'PROXIMO' | 'VENCIDO' | 'PENDIENTE' | 'RECHAZADO' | 'FALTANTE';

export interface RequirementResult {
  templateId: number;
  entityType: EntityType;
  obligatorio: boolean;
  diasAnticipacion: number;
  state: ComplianceState;
  documentId?: number;
  expiresAt?: Date | null;
}

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

export interface EquipoComplianceResult {
  equipoId: number;
  tieneVencidos: boolean;
  tieneFaltantes: boolean;
  tieneProximos: boolean;
  requirements: RequirementResultDetailed[];
}

export interface EquipoInfo {
  id: number;
  tenantEmpresaId: number;
  dadorCargaId: number;
  driverId: number;
  truckId: number;
  trailerId: number | null;
  empresaTransportistaId: number | null;
}

interface Requisito {
  clienteId: number;
  templateId: number;
  entityType: string;
  obligatorio: boolean;
  diasAnticipacion: number;
}

interface DocumentInfo {
  id: number;
  templateId: number;
  entityType: string;
  entityId: number;
  tenantEmpresaId: number;
  dadorCargaId: number | null;
  status: string;
  expiresAt: Date | null;
}

// ============================================================================
// HELPERS DE COMPLIANCE
// ============================================================================
const PENDING_STATUSES = ['PENDIENTE', 'VALIDANDO', 'CLASIFICANDO', 'PENDIENTE_APROBACION'];

function getEntityIdFromEquipo(equipo: EquipoInfo, entityType: string): number | null {
  switch (entityType) {
    case 'EMPRESA_TRANSPORTISTA': return equipo.empresaTransportistaId;
    case 'CHOFER': return equipo.driverId;
    case 'CAMION': return equipo.truckId;
    case 'ACOPLADO': return equipo.trailerId;
    default: return null;
  }
}

function computeDocumentState(
  doc: DocumentInfo | null,
  requisito: Requisito,
  now: number
): { state: ComplianceStateDetailed; flags: { vencido: boolean; faltante: boolean; proximo: boolean } } {
  if (!doc) {
    return { state: 'FALTANTE', flags: { vencido: false, faltante: true, proximo: false } };
  }

  const expiresAt = doc.expiresAt ? new Date(doc.expiresAt).getTime() : null;

  if (doc.status === 'RECHAZADO') {
    return { state: 'RECHAZADO', flags: { vencido: false, faltante: true, proximo: false } };
  }

  if (PENDING_STATUSES.includes(doc.status)) {
    return { state: 'PENDIENTE', flags: { vencido: false, faltante: false, proximo: false } };
  }

  if (doc.status === 'VENCIDO') {
    return { state: 'VENCIDO', flags: { vencido: true, faltante: false, proximo: false } };
  }

  if (doc.status === 'APROBADO') {
    if (expiresAt && expiresAt < now) {
      return { state: 'VENCIDO', flags: { vencido: true, faltante: false, proximo: false } };
    }
    if (expiresAt) {
      const daysLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= requisito.diasAnticipacion) {
        return { state: 'PROXIMO', flags: { vencido: false, faltante: false, proximo: true } };
      }
    }
    return { state: 'VIGENTE', flags: { vencido: false, faltante: false, proximo: false } };
  }

  return { state: 'PENDIENTE', flags: { vencido: false, faltante: false, proximo: false } };
}

function buildDocKey(entityType: string, entityId: number, templateId: number, tenantId: number, dadorId: number | null): string {
  return `${entityType}:${entityId}:${templateId}:${tenantId}:${dadorId}`;
}

function mapDetailedToSimple(r: RequirementResultDetailed): RequirementResult {
  let state: ComplianceState = 'OK';
  if (r.state === 'FALTANTE' || r.state === 'VENCIDO' || r.state === 'PENDIENTE' || r.state === 'RECHAZADO') {
    state = 'FALTANTE';
  } else if (r.state === 'PROXIMO') {
    state = 'PROXIMO';
  }
  return {
    templateId: r.templateId,
    entityType: r.entityType,
    obligatorio: r.obligatorio,
    diasAnticipacion: r.diasAnticipacion,
    state,
    documentId: r.documentId,
    expiresAt: r.expiresAt ?? null,
  };
}

// ============================================================================
// FUNCIONES DE CARGA DE DATOS
// ============================================================================
async function loadEquipoClienteAssignments(equipoIds: number[]): Promise<Map<number, number[]>> {
  const asignaciones = await prisma.equipoCliente.findMany({
    where: { equipoId: { in: equipoIds }, asignadoHasta: null },
    select: { equipoId: true, clienteId: true },
  });

  const map = new Map<number, number[]>();
  for (const a of asignaciones) {
    if (!map.has(a.equipoId)) map.set(a.equipoId, []);
    map.get(a.equipoId)!.push(a.clienteId);
  }
  return map;
}

async function loadRequirements(clienteIds: number[]): Promise<Map<number, Requisito[]>> {
  const requisitos = await prisma.clienteDocumentRequirement.findMany({
    where: { clienteId: { in: clienteIds } },
    select: { clienteId: true, templateId: true, entityType: true, obligatorio: true, diasAnticipacion: true },
  });

  const map = new Map<number, Requisito[]>();
  for (const r of requisitos) {
    if (!map.has(r.clienteId)) map.set(r.clienteId, []);
    map.get(r.clienteId)!.push(r as Requisito);
  }
  return map;
}

async function loadDocuments(
  templateIds: number[],
  entitySets: { choferIds: Set<number>; camionIds: Set<number>; acopladoIds: Set<number>; empresaIds: Set<number> }
): Promise<Map<string, DocumentInfo>> {
  const docs = await prisma.document.findMany({
    where: {
      templateId: { in: templateIds },
      OR: [
        { entityType: 'CHOFER', entityId: { in: [...entitySets.choferIds] } },
        { entityType: 'CAMION', entityId: { in: [...entitySets.camionIds] } },
        { entityType: 'ACOPLADO', entityId: { in: [...entitySets.acopladoIds] } },
        { entityType: 'EMPRESA_TRANSPORTISTA', entityId: { in: [...entitySets.empresaIds] } },
      ],
    },
    select: { id: true, templateId: true, entityType: true, entityId: true, tenantEmpresaId: true, dadorCargaId: true, status: true, expiresAt: true },
    orderBy: { uploadedAt: 'desc' },
  });

  const index = new Map<string, DocumentInfo>();
  for (const doc of docs) {
    const key = buildDocKey(doc.entityType, doc.entityId, doc.templateId, doc.tenantEmpresaId, doc.dadorCargaId);
    if (!index.has(key)) {
      index.set(key, doc as DocumentInfo);
    }
  }
  return index;
}

// ============================================================================
// FUNCIONES DE EVALUACIÓN
// ============================================================================
function consolidateRequirements(clienteIds: number[], requisitosPorCliente: Map<number, Requisito[]>): Map<string, Requisito> {
  const consolidated = new Map<string, Requisito>();

  for (const cId of clienteIds) {
    const reqs = requisitosPorCliente.get(cId) || [];
    for (const r of reqs) {
      const key = `${r.templateId}:${r.entityType}`;
      const existing = consolidated.get(key);

      if (!existing) {
        consolidated.set(key, r);
      } else if (r.obligatorio && !existing.obligatorio) {
        consolidated.set(key, r);
      } else if (r.diasAnticipacion > existing.diasAnticipacion) {
        consolidated.set(key, { ...existing, diasAnticipacion: r.diasAnticipacion });
      }
    }
  }

  return consolidated;
}

function evaluateSingleEquipo(
  equipo: EquipoInfo,
  requisitos: Map<string, Requisito>,
  docIndex: Map<string, DocumentInfo>,
  now: number
): EquipoComplianceResult {
  const requirements: RequirementResultDetailed[] = [];
  let tieneVencidos = false;
  let tieneFaltantes = false;
  let tieneProximos = false;

  for (const [, r] of requisitos) {
    const entityId = getEntityIdFromEquipo(equipo, r.entityType);

    if (!entityId) {
      requirements.push({
        templateId: r.templateId,
        entityType: r.entityType as EntityType,
        obligatorio: r.obligatorio,
        diasAnticipacion: r.diasAnticipacion,
        state: 'FALTANTE',
      });
      tieneFaltantes = true;
      continue;
    }

    const docKey = buildDocKey(r.entityType, entityId, r.templateId, equipo.tenantEmpresaId, equipo.dadorCargaId);
    const doc = docIndex.get(docKey) || null;
    const { state, flags } = computeDocumentState(doc, r, now);

    if (flags.vencido) tieneVencidos = true;
    if (flags.faltante) tieneFaltantes = true;
    if (flags.proximo) tieneProximos = true;

    requirements.push({
      templateId: r.templateId,
      entityType: r.entityType as EntityType,
      obligatorio: r.obligatorio,
      diasAnticipacion: r.diasAnticipacion,
      state,
      documentId: doc?.id,
      documentStatus: doc?.status as DocumentStatus,
      expiresAt: doc?.expiresAt ?? null,
    });
  }

  return { equipoId: equipo.id, tieneVencidos, tieneFaltantes, tieneProximos, requirements };
}

// ============================================================================
// SERVICIO PRINCIPAL
// ============================================================================
export class ComplianceService {
  /**
   * Método legado (usado por rutas existentes)
   */
  static async evaluateEquipoCliente(equipoId: number, clienteId: number): Promise<RequirementResult[]> {
    const detailed = await this.evaluateEquipoClienteDetailed(equipoId, clienteId);
    return detailed.map(mapDetailedToSimple);
  }

  /**
   * Evaluación detallada de un equipo para un cliente
   */
  static async evaluateEquipoClienteDetailed(equipoId: number, clienteId: number): Promise<RequirementResultDetailed[]> {
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
    if (!equipo) return [];

    const requisitos = await prisma.clienteDocumentRequirement.findMany({
      where: { clienteId },
      select: { templateId: true, entityType: true, obligatorio: true, diasAnticipacion: true },
    });

    const results: RequirementResultDetailed[] = [];
    const now = Date.now();

    for (const r of requisitos) {
      const entityId = getEntityIdFromEquipo(equipo as any, r.entityType);

      if (!entityId) {
        results.push({
          templateId: r.templateId,
          entityType: r.entityType as EntityType,
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
        },
        orderBy: { uploadedAt: 'desc' },
      });

      const { state } = computeDocumentState(doc as any, r as Requisito, now);

      results.push({
        templateId: r.templateId,
        entityType: r.entityType as EntityType,
        obligatorio: r.obligatorio,
        diasAnticipacion: r.diasAnticipacion,
        state,
        documentId: doc?.id,
        documentStatus: doc?.status as DocumentStatus,
        expiresAt: doc?.expiresAt ?? null,
      });
    }

    return results;
  }

  /**
   * BATCH COMPLIANCE: Evalúa múltiples equipos en una sola operación.
   * Optimizado para reducir queries de N*M a ~5 queries totales.
   */
  static async evaluateBatchEquiposCliente(
    equipos: EquipoInfo[],
    clienteId?: number
  ): Promise<Map<number, EquipoComplianceResult>> {
    const results = new Map<number, EquipoComplianceResult>();
    if (equipos.length === 0) return results;

    const batchStartTime = Date.now();

    // 1. Cargar asignaciones de equipos a clientes
    let equipoClientesMap: Map<number, number[]>;
    let allClienteIds: number[];

    if (clienteId) {
      equipoClientesMap = new Map(equipos.map(eq => [eq.id, [clienteId]]));
      allClienteIds = [clienteId];
    } else {
      equipoClientesMap = await loadEquipoClienteAssignments(equipos.map(e => e.id));
      allClienteIds = [...new Set([...equipoClientesMap.values()].flat())];
      // Equipos sin clientes asignados
      for (const eq of equipos) {
        if (!equipoClientesMap.has(eq.id)) equipoClientesMap.set(eq.id, []);
      }
    }

    // 2. Cargar requisitos de clientes
    const requisitosPorCliente = await loadRequirements(allClienteIds);

    // Si no hay requisitos, todos los equipos están "vigentes"
    if ([...requisitosPorCliente.values()].flat().length === 0) {
      for (const eq of equipos) {
        results.set(eq.id, { equipoId: eq.id, tieneVencidos: false, tieneFaltantes: false, tieneProximos: false, requirements: [] });
      }
      return results;
    }

    // 3. Recolectar entidades únicas
    const entitySets = { choferIds: new Set<number>(), camionIds: new Set<number>(), acopladoIds: new Set<number>(), empresaIds: new Set<number>() };
    for (const eq of equipos) {
      if (eq.driverId) entitySets.choferIds.add(eq.driverId);
      if (eq.truckId) entitySets.camionIds.add(eq.truckId);
      if (eq.trailerId) entitySets.acopladoIds.add(eq.trailerId);
      if (eq.empresaTransportistaId) entitySets.empresaIds.add(eq.empresaTransportistaId);
    }

    // 4. Cargar documentos
    const allReqs = [...requisitosPorCliente.values()].flat();
    const templateIds = [...new Set(allReqs.map(r => r.templateId))];
    const docIndex = await loadDocuments(templateIds, entitySets);

    // 5. Evaluar cada equipo
    const now = Date.now();
    for (const eq of equipos) {
      const clientesDelEquipo = equipoClientesMap.get(eq.id) || [];
      const requisitos = consolidateRequirements(clientesDelEquipo, requisitosPorCliente);
      const result = evaluateSingleEquipo(eq, requisitos, docIndex, now);
      results.set(eq.id, result);
    }

    AppLogger.debug(`[Compliance.evaluateBatch] clienteId=${clienteId ?? 'ALL'} equipos=${equipos.length} time=${Date.now() - batchStartTime}ms`);
    return results;
  }
}
