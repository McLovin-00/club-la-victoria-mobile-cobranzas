import { prisma } from '../config/database';
import { createError } from '../middlewares/error.middleware';
import { AuditService } from './audit.service';
import { DocumentArchiveService } from './document-archive.service';
import { ComplianceService, EquipoInfo } from './compliance.service';
import { AppLogger } from '../config/logger';

function normalizeDni(dni: string): string {
  return (dni || '').replace(/\D+/g, '');
}

function normalizePlate(plate: string): string {
  return (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ============================================================================
// HELPERS PARA CREACIÓN DE EQUIPOS - Reducción de complejidad cognitiva
// ============================================================================

/**
 * Valida que la empresa transportista pertenezca al dador
 */
async function validateEmpresaTransportista(
  empresaTransportistaId: number | null | undefined,
  tenantEmpresaId: number,
  dadorCargaId: number
): Promise<void> {
  if (!empresaTransportistaId) return;
  
  const empresa = await prisma.empresaTransportista.findFirst({
    where: { id: empresaTransportistaId, tenantEmpresaId },
    select: { dadorCargaId: true }
  });
  
  if (!empresa || empresa.dadorCargaId !== dadorCargaId) {
    throw createError('La empresa transportista no pertenece al dador del equipo', 409, 'EMPRESA_MISMATCH');
  }
}

/**
 * Valida empresa transportista para un equipo existente (por ID de equipo)
 */
async function validateEmpresaTransportistaForEquipo(equipoId: number, empresaTransportistaId: number): Promise<void> {
  const equipo = await prisma.equipo.findUnique({ 
    where: { id: equipoId }, 
    select: { dadorCargaId: true, tenantEmpresaId: true } 
  });
  if (!equipo) throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
  await validateEmpresaTransportista(empresaTransportistaId, equipo.tenantEmpresaId, equipo.dadorCargaId);
}

/**
 * Busca conflictos de componentes en equipos activos
 */
async function findComponentConflicts(
  tenantEmpresaId: number,
  dniNorm: string,
  truckNorm: string,
  trailerNorm: string | null
): Promise<{ conflicts: string[]; driverEquipoId: number | null; truckEquipoId: number | null; trailerEquipoId: number | null }> {
  const conflicts: string[] = [];
  let driverEquipoId: number | null = null;
  let truckEquipoId: number | null = null;
  let trailerEquipoId: number | null = null;

  const driverInUse = await prisma.equipo.findFirst({
    where: { tenantEmpresaId, driverDniNorm: dniNorm, validTo: null }
  });
  if (driverInUse) {
    conflicts.push(`Chofer en equipo #${driverInUse.id}`);
    driverEquipoId = driverInUse.id;
  }

  const truckInUse = await prisma.equipo.findFirst({
    where: { tenantEmpresaId, truckPlateNorm: truckNorm, validTo: null }
  });
  if (truckInUse) {
    conflicts.push(`Camión en equipo #${truckInUse.id}`);
    truckEquipoId = truckInUse.id;
  }

  if (trailerNorm) {
    const trailerInUse = await prisma.equipo.findFirst({
      where: { tenantEmpresaId, trailerPlateNorm: trailerNorm, validTo: null }
    });
    if (trailerInUse) {
      conflicts.push(`Acoplado en equipo #${trailerInUse.id}`);
      trailerEquipoId = trailerInUse.id;
    }
  }

  return { conflicts, driverEquipoId, truckEquipoId, trailerEquipoId };
}

/**
 * Resuelve conflictos de componentes cerrando/desasociando equipos existentes
 */
async function resolveComponentConflicts(
  tenantEmpresaId: number,
  dniNorm: string,
  truckNorm: string,
  trailerNorm: string | null
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const now = new Date();

    const driverRows = await tx.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM "documentos"."equipo" WHERE "tenant_empresa_id" = $1 AND "driver_dni_norm" = $2 AND "valid_to" IS NULL FOR UPDATE`,
      tenantEmpresaId, dniNorm
    );
    for (const row of driverRows) {
      await tx.equipo.update({ where: { id: row.id }, data: { validTo: now, estado: 'finalizada' as any } });
      await tx.equipoHistory.create({ data: { equipoId: row.id, action: 'close', component: 'driver', originEquipoId: null, payload: { reason: 'forceMove' } as any } });
    }

    const truckRows = await tx.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM "documentos"."equipo" WHERE "tenant_empresa_id" = $1 AND "truck_plate_norm" = $2 AND "valid_to" IS NULL FOR UPDATE`,
      tenantEmpresaId, truckNorm
    );
    for (const row of truckRows) {
      await tx.equipo.update({ where: { id: row.id }, data: { validTo: now, estado: 'finalizada' as any } });
      await tx.equipoHistory.create({ data: { equipoId: row.id, action: 'close', component: 'truck', originEquipoId: null, payload: { reason: 'forceMove' } as any } });
    }

    if (trailerNorm) {
      const trailerRows = await tx.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM "documentos"."equipo" WHERE "tenant_empresa_id" = $1 AND "trailer_plate_norm" = $2 AND "valid_to" IS NULL FOR UPDATE`,
        tenantEmpresaId, trailerNorm
      );
      for (const row of trailerRows) {
        await tx.equipo.update({ where: { id: row.id }, data: { trailerId: null, trailerPlateNorm: null } });
        await tx.equipoHistory.create({ data: { equipoId: row.id, action: 'detach', component: 'trailer', originEquipoId: null, payload: { reason: 'forceMove' } as any } });
      }
    }
  });
}

/**
 * Acciones async no-críticas post-creación (fire-and-forget)
 * El historial se registra dentro de la transacción de creación.
 */
function onEquipoCreatedAsync(
  equipo: { id: number },
  tenantEmpresaId: number,
): void {
  (async () => {
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(tenantEmpresaId, equipo.id, 15 * 60 * 1000);
    } catch { /* non-critical */ }

    try {
      const { SystemConfigService } = await import('./system-config.service');
      const defIdStr = await SystemConfigService.getConfig(`tenant:${tenantEmpresaId}:defaults.defaultClienteId`);
      const defId = defIdStr ? Number(defIdStr) : NaN;
      if (!Number.isNaN(defId)) {
        await EquipoService.associateCliente(tenantEmpresaId, equipo.id, defId, new Date());
      }
    } catch { /* non-critical */ }
  })();
}

// ============================================================================

interface EquipoEntityIds {
  driverId: number;
  truckId: number;
  trailerId: number | null;
  empresaTransportistaId: number | null;
}

/**
 * Obtiene el entityId según el entityType
 */
function getEntityIdForType(entityType: string, equipo: EquipoEntityIds): number | null {
  switch (entityType) {
    case 'CHOFER': return equipo.driverId;
    case 'CAMION': return equipo.truckId;
    case 'ACOPLADO': return equipo.trailerId;
    case 'EMPRESA_TRANSPORTISTA': return equipo.empresaTransportistaId;
    default: return null;
  }
}

type DocEstadoRequisito = 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO' | 'PENDIENTE' | 'RECHAZADO';

/**
 * Determina el estado de un documento para requisitos
 */
function determinarEstadoDocumento(
  doc: { status: string; expiresAt: Date | null }, 
  diasAnticipacion: number
): DocEstadoRequisito {
  const now = new Date();
  const expires = doc.expiresAt ? new Date(doc.expiresAt) : null;
  const estaVencidoPorFecha = expires && expires < now;

  if (doc.status === 'VENCIDO' || estaVencidoPorFecha) return 'VENCIDO';
  if (doc.status === 'RECHAZADO') return 'RECHAZADO';
  if (doc.status !== 'APROBADO') return 'PENDIENTE';
  
  if (expires) {
    const diasRestantes = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= diasAnticipacion) return 'PROXIMO_VENCER';
  }
  
  return 'VIGENTE';
}

type RequisitoConsolidado = {
  templateId: number;
  templateName: string;
  entityType: string;
  obligatorio: boolean;
  diasAnticipacion: number;
  requeridoPor: Array<{ clienteId: number; clienteName: string }>;
};

function consolidarRequisitos(requisitos: Array<{
  templateId: number; entityType: string; obligatorio: boolean; diasAnticipacion: number;
  template: { name: string };
  plantillaRequisito: { cliente: { id: number; razonSocial: string } };
}>): Map<string, RequisitoConsolidado> {
  const mapa = new Map<string, RequisitoConsolidado>();

  for (const req of requisitos) {
    const key = `${req.templateId}-${req.entityType}`;
    if (!mapa.has(key)) {
      mapa.set(key, {
        templateId: req.templateId,
        templateName: req.template.name,
        entityType: req.entityType,
        obligatorio: req.obligatorio,
        diasAnticipacion: req.diasAnticipacion,
        requeridoPor: [],
      });
    }
    const item = mapa.get(key)!;
    item.requeridoPor.push({
      clienteId: req.plantillaRequisito.cliente.id,
      clienteName: req.plantillaRequisito.cliente.razonSocial,
    });
    if (req.obligatorio) item.obligatorio = true;
    if (req.diasAnticipacion > item.diasAnticipacion) {
      item.diasAnticipacion = req.diasAnticipacion;
    }
  }

  return mapa;
}

async function enriquecerConDocumentos(
  consolidado: Map<string, RequisitoConsolidado>,
  equipo: EquipoEntityIds
) {
  const resultado = [];
  for (const [, req] of consolidado) {
    const entityId = getEntityIdForType(req.entityType, equipo);
    const documentoActual = entityId
      ? await buscarDocumentoActual(req.entityType, entityId, req.templateId, req.diasAnticipacion)
      : null;
    resultado.push({ ...req, entityId, documentoActual, estado: documentoActual?.estado ?? 'FALTANTE' });
  }
  return resultado;
}

async function buscarDocumentoActual(
  entityType: string, entityId: number, templateId: number, diasAnticipacion: number
): Promise<{ id: number; status: string; expiresAt: Date | null; estado: string } | null> {
  const doc = await prisma.document.findFirst({
    where: { entityType: entityType as any, entityId, templateId, archived: false },
    orderBy: { uploadedAt: 'desc' },
  });
  if (!doc) return null;
  const estado = determinarEstadoDocumento(doc, diasAnticipacion);
  return { id: doc.id, status: doc.status, expiresAt: doc.expiresAt, estado };
}

// ============================================================================
// HELPERS PARA FILTROS DE EQUIPO
// ============================================================================

interface EquipoFilterParams {
  tenantEmpresaId: number;
  dadorCargaId?: number;
  empresaTransportistaId?: number;
  choferId?: number;
  activo?: boolean | 'all';
  search?: string;
  dni?: string;
  truckPlate?: string;
  trailerPlate?: string;
}

/** Construye el where clause para búsqueda de equipos */
function buildEquipoWhereClause(filters: EquipoFilterParams): any {
  const where: any = { tenantEmpresaId: filters.tenantEmpresaId };
  
  if (filters.dadorCargaId) where.dadorCargaId = filters.dadorCargaId;
  if (filters.empresaTransportistaId) where.empresaTransportistaId = filters.empresaTransportistaId;
  if (filters.choferId) where.driverId = filters.choferId;
  if (filters.activo !== 'all' && filters.activo !== undefined) where.activo = filters.activo;
  
  const orConditions: any[] = [];
  
  if (filters.search) {
    const searchValues = filters.search.split('|').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (searchValues.length > 0) {
      orConditions.push(
        { driverDniNorm: { in: searchValues } },
        { truckPlateNorm: { in: searchValues } },
        { trailerPlateNorm: { in: searchValues } }
      );
    }
  }
  
  if (filters.dni) {
    orConditions.push({ driverDniNorm: { contains: normalizeDni(filters.dni) } });
  }
  if (filters.truckPlate) {
    orConditions.push({ truckPlateNorm: { contains: normalizePlate(filters.truckPlate) } });
  }
  if (filters.trailerPlate) {
    orConditions.push({ trailerPlateNorm: { contains: normalizePlate(filters.trailerPlate) } });
  }
  
  if (orConditions.length > 0) where.OR = orConditions;
  
  return where;
}

// ============================================================================
// HELPERS PARA ALTA COMPLETA
// ============================================================================

interface AltaCompletaContext {
  tenantEmpresaId: number;
  dadorCargaId: number;
}

/** Valida CUIT y obtiene o crea empresa transportista */
async function getOrCreateEmpresaTransportista(
  tx: any, ctx: AltaCompletaContext, cuitRaw: string, nombre: string
): Promise<any> {
  const cuit = cuitRaw.replace(/\D+/g, '');
  if (!cuit || cuit.length !== 11) {
    throw createError('CUIT inválido (debe tener 11 dígitos)', 400, 'CUIT_INVALIDO');
  }

  let empresa = await tx.empresaTransportista.findFirst({
    where: { tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId, cuit },
  });

  if (!empresa) {
    empresa = await tx.empresaTransportista.create({
      data: {
        tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId, cuit,
        razonSocial: nombre.trim() || `Empresa ${cuit}`, activo: true,
      } as any,
    });
  }
  return empresa;
}

/** 
 * Valida DNI y obtiene o crea chofer.
 * - Si existe y está huérfano (sin equipo activo): lo reutiliza
 * - Si existe y está en uso por otro equipo activo: error
 * - Si no existe: lo crea
 */
async function getOrCreateChofer(
  tx: any, ctx: AltaCompletaContext, dniRaw: string, nombre?: string, apellido?: string, phones?: string[]
): Promise<any> {
  const dni = normalizeDni(dniRaw);
  if (!dni || dni.length < 6) {
    throw createError('DNI inválido (mínimo 6 dígitos)', 400, 'DNI_INVALIDO');
  }

  const existe = await tx.chofer.findFirst({
    where: { tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId, dniNorm: dni },
  });

  if (existe) {
    // Verificar si está en uso por algún equipo activo
    const enUso = await tx.equipo.findFirst({
      where: { driverId: existe.id, validTo: null },
    });

    if (enUso) {
      throw createError(
        `El chofer con DNI ${dniRaw} ya está asignado al equipo #${enUso.id}. No se puede duplicar.`,
        409,
        'CHOFER_EN_USO'
      );
    }

    // Chofer existe pero está huérfano, reutilizarlo (actualizar datos si se proporcionaron)
    return tx.chofer.update({
      where: { id: existe.id },
      data: {
        nombre: nombre?.trim() || existe.nombre,
        apellido: apellido?.trim() || existe.apellido,
        phones: phones ?? existe.phones,
        activo: true,
      },
    });
  }

  return tx.chofer.create({
    data: {
      tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId,
      dni, dniNorm: dni, nombre: nombre?.trim() || undefined, apellido: apellido?.trim() || undefined,
      phones: phones ?? [], activo: true,
    },
  });
}

/** 
 * Valida patente y obtiene o crea camión.
 * - Si existe y está huérfano (sin equipo activo): lo reutiliza
 * - Si existe y está en uso por otro equipo activo: error
 * - Si no existe: lo crea
 */
async function getOrCreateCamion(
  tx: any, ctx: AltaCompletaContext, patenteRaw: string, marca?: string, modelo?: string
): Promise<any> {
  const patente = normalizePlate(patenteRaw);
  if (!patente || patente.length < 5) {
    throw createError('Patente de camión inválida (mínimo 5 caracteres)', 400, 'PATENTE_CAMION_INVALIDA');
  }

  const existe = await tx.camion.findFirst({
    where: { tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId, patenteNorm: patente },
  });

  if (existe) {
    // Verificar si está en uso por algún equipo activo
    const enUso = await tx.equipo.findFirst({
      where: { truckId: existe.id, validTo: null },
    });

    if (enUso) {
      throw createError(
        `El camión con patente ${patenteRaw} ya está asignado al equipo #${enUso.id}. No se puede duplicar.`,
        409,
        'CAMION_EN_USO'
      );
    }

    // Camión existe pero está huérfano, reutilizarlo (actualizar datos si se proporcionaron)
    return tx.camion.update({
      where: { id: existe.id },
      data: {
        marca: marca?.trim() || existe.marca,
        modelo: modelo?.trim() || existe.modelo,
        activo: true,
      },
    });
  }

  return tx.camion.create({
    data: {
      tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId,
      patente, patenteNorm: patente, marca: marca?.trim() || undefined, modelo: modelo?.trim() || undefined, activo: true,
    },
  });
}

/** 
 * Valida patente y obtiene o crea acoplado.
 * - Si existe y está huérfano (sin equipo activo): lo reutiliza
 * - Si existe y está en uso por otro equipo activo: error
 * - Si no existe: lo crea
 * Retorna null si no hay patente
 */
async function getOrCreateAcoplado(
  tx: any, ctx: AltaCompletaContext, patenteRaw: string | null | undefined, tipo?: string
): Promise<any | null> {
  if (!patenteRaw?.trim()) return null;

  const patente = normalizePlate(patenteRaw);
  if (patente.length < 5) {
    throw createError('Patente de acoplado inválida (mínimo 5 caracteres)', 400, 'PATENTE_ACOPLADO_INVALIDA');
  }

  const existe = await tx.acoplado.findFirst({
    where: { tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId, patenteNorm: patente },
  });

  if (existe) {
    // Verificar si está en uso por algún equipo activo
    const enUso = await tx.equipo.findFirst({
      where: { trailerId: existe.id, validTo: null },
    });

    if (enUso) {
      throw createError(
        `El acoplado con patente ${patenteRaw} ya está asignado al equipo #${enUso.id}. No se puede duplicar.`,
        409,
        'ACOPLADO_EN_USO'
      );
    }

    // Acoplado existe pero está huérfano, reutilizarlo (actualizar datos si se proporcionaron)
    return tx.acoplado.update({
      where: { id: existe.id },
      data: {
        tipo: tipo?.trim() || existe.tipo,
        activo: true,
      },
    });
  }

  return tx.acoplado.create({
    data: {
      tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId,
      patente, patenteNorm: patente, tipo: tipo?.trim() || undefined, activo: true,
    },
  });
}

// ============================================================================
// HELPERS PARA ATTACH COMPONENTS
// ============================================================================
// Tipo reservado para futuras extensiones de componentes
type _ComponentType = 'driver' | 'truck' | 'trailer';

interface ResolveResult {
  id: number;
  normValue?: string;
  originEquipoId: number | null;
}

async function resolveDriver(
  tenantEmpresaId: number,
  dadorCargaId: number,
  equipoId: number,
  driverId?: number,
  driverDni?: string
): Promise<ResolveResult | null> {
  if (!driverId && !driverDni) return null;
  
  let id = driverId;
  if (!id && driverDni) {
    const dniNorm = normalizeDni(driverDni);
    const ch = await prisma.chofer.findFirst({ where: { tenantEmpresaId, dadorCargaId, dniNorm } });
    if (!ch) throw new Error('Chofer no encontrado');
    id = ch.id;
  }
  
  const originEquipoId = await closeOriginEquipo(tenantEmpresaId, equipoId, 'driverId', id!);
  return { id: id!, normValue: driverDni ? normalizeDni(driverDni) : undefined, originEquipoId };
}

async function resolveTruck(
  tenantEmpresaId: number,
  dadorCargaId: number,
  equipoId: number,
  truckId?: number,
  truckPlate?: string
): Promise<ResolveResult | null> {
  if (!truckId && !truckPlate) return null;
  
  let id = truckId;
  if (!id && truckPlate) {
    const pat = normalizePlate(truckPlate);
    const tr = await prisma.camion.findFirst({ where: { tenantEmpresaId, dadorCargaId, patenteNorm: pat } });
    if (!tr) throw new Error('Camión no encontrado');
    id = tr.id;
  }
  
  const originEquipoId = await closeOriginEquipo(tenantEmpresaId, equipoId, 'truckId', id!);
  return { id: id!, normValue: truckPlate ? normalizePlate(truckPlate) : undefined, originEquipoId };
}

async function resolveTrailer(
  tenantEmpresaId: number,
  dadorCargaId: number,
  equipoId: number,
  trailerId?: number,
  trailerPlate?: string
): Promise<ResolveResult | null> {
  if (!trailerId && !trailerPlate) return null;
  
  let id = trailerId ?? null;
  if (!id && trailerPlate) {
    const pat = normalizePlate(trailerPlate);
    const ac = await prisma.acoplado.findFirst({ where: { tenantEmpresaId, dadorCargaId, patenteNorm: pat } });
    if (!ac) throw new Error('Acoplado no encontrado');
    id = ac.id;
  }
  
  let originEquipoId: number | null = null;
  if (id) {
    originEquipoId = await detachTrailerFromOrigin(tenantEmpresaId, equipoId, id);
  }
  
  return { id: id!, normValue: trailerPlate ? normalizePlate(trailerPlate) : undefined, originEquipoId };
}

async function closeOriginEquipo(
  tenantEmpresaId: number,
  currentEquipoId: number,
  field: 'driverId' | 'truckId',
  entityId: number
): Promise<number | null> {
  const origin = await prisma.equipo.findFirst({
    where: { tenantEmpresaId, [field]: entityId, validTo: null, NOT: { id: currentEquipoId } },
    select: { id: true }
  });
  
  if (!origin) return null;
  
  const component = field === 'driverId' ? 'driver' : 'truck';
  await prisma.$transaction([
    prisma.equipo.update({ where: { id: origin.id }, data: { validTo: new Date(), estado: 'finalizada' as any } }),
    prisma.equipoHistory.create({ data: { equipoId: origin.id, action: 'close', component, originEquipoId: currentEquipoId, payload: { reason: 'swap' } as any } })
  ]);
  
  return origin.id;
}

async function detachTrailerFromOrigin(
  tenantEmpresaId: number,
  currentEquipoId: number,
  trailerId: number
): Promise<number | null> {
  const origin = await prisma.equipo.findFirst({
    where: { tenantEmpresaId, trailerId, validTo: null, NOT: { id: currentEquipoId } },
    select: { id: true }
  });
  
  if (!origin) return null;
  
  await prisma.$transaction([
    prisma.equipo.update({ where: { id: origin.id }, data: { trailerId: null, trailerPlateNorm: null } }),
    prisma.equipoHistory.create({ data: { equipoId: origin.id, action: 'detach', component: 'trailer', originEquipoId: currentEquipoId, payload: { reason: 'swap' } as any } })
  ]);
  
  return origin.id;
}

// ============================================================================
// HELPERS PARA COMPLIANCE FILTER
// ============================================================================

type ComplianceState = { tieneFaltantes?: boolean; tieneVencidos?: boolean; tieneProximos?: boolean };

function filterByComplianceState(
  equipoIds: number[],
  complianceMap: Map<number, ComplianceState>,
  filter: 'faltantes' | 'vencidos' | 'por_vencer'
): number[] {
  return equipoIds.filter(eqId => {
    const state = complianceMap.get(eqId);
    if (!state) return false;
    if (filter === 'faltantes') return state.tieneFaltantes;
    if (filter === 'vencidos') return state.tieneVencidos;
    if (filter === 'por_vencer') return state.tieneProximos;
    return false;
  });
}

async function buildPaginatedResult(
  filteredIds: number[],
  page: number,
  limit: number,
  stats: { total: number; conFaltantes: number; conVencidos: number; conPorVencer: number }
) {
  const take = Math.min(Math.max(limit, 1), 100);
  const skip = Math.max((page - 1) * take, 0);
  
  if (filteredIds.length === 0) {
    return { equipos: [], total: 0, page, limit: take, totalPages: 0, hasNext: false, hasPrev: false, stats };
  }
  
  const paginatedIds = filteredIds.slice(skip, skip + take);
  const equipos = await prisma.equipo.findMany({
    where: { id: { in: paginatedIds } },
    orderBy: { id: 'asc' },
    include: { clientes: { where: { asignadoHasta: null }, include: { cliente: true } }, dador: true, empresaTransportista: true }
  });
  
  const totalPages = Math.ceil(filteredIds.length / take);
  return { equipos, total: filteredIds.length, page, limit: take, totalPages, hasNext: page < totalPages, hasPrev: page > 1, stats };
}

// ============================================================================
// HELPERS PARA UPDATE EQUIPO
// ============================================================================

interface EntityUpdate { field: string; id: number | null; norm?: string }

async function validateChoferChange(newChoferId: number, equipo: any): Promise<EntityUpdate | null> {
  if (newChoferId === equipo.driverId) return null;
  const chofer = await prisma.chofer.findUnique({ where: { id: newChoferId } });
  if (!chofer || chofer.dadorCargaId !== equipo.dadorCargaId) {
    throw createError('Chofer no válido para este dador de carga', 400, 'CHOFER_INVALIDO');
  }
  return { field: 'chofer', id: newChoferId, norm: chofer.dniNorm };
}

async function validateCamionChange(newCamionId: number, equipo: any): Promise<EntityUpdate | null> {
  if (newCamionId === equipo.truckId) return null;
  const camion = await prisma.camion.findUnique({ where: { id: newCamionId } });
  if (!camion || camion.dadorCargaId !== equipo.dadorCargaId) {
    throw createError('Camión no válido para este dador de carga', 400, 'CAMION_INVALIDO');
  }
  return { field: 'camion', id: newCamionId, norm: camion.patenteNorm };
}

async function validateAcopladoChange(newAcopladoId: number | null, equipo: any): Promise<EntityUpdate | null> {
  if (newAcopladoId === equipo.trailerId) return null;
  if (newAcopladoId === null) {
    return { field: 'acoplado', id: null, norm: undefined };
  }
  const acoplado = await prisma.acoplado.findUnique({ where: { id: newAcopladoId } });
  if (!acoplado || acoplado.dadorCargaId !== equipo.dadorCargaId) {
    throw createError('Acoplado no válido para este dador de carga', 400, 'ACOPLADO_INVALIDO');
  }
  return { field: 'acoplado', id: newAcopladoId, norm: acoplado.patenteNorm };
}

async function validateEmpresaChange(newEmpresaId: number, equipo: any): Promise<EntityUpdate | null> {
  if (newEmpresaId === equipo.empresaTransportistaId) return null;
  const empresa = await prisma.empresaTransportista.findFirst({ where: { id: newEmpresaId, dadorCargaId: equipo.dadorCargaId } });
  if (!empresa) throw createError('Empresa transportista no válida', 400, 'EMPRESA_INVALIDA');
  return { field: 'empresaTransportista', id: newEmpresaId };
}

type EntityChangeInput = {
  choferId?: number;
  camionId?: number;
  acopladoId?: number | null;
  empresaTransportistaId?: number;
};

async function collectEntityChanges(input: EntityChangeInput, equipo: any): Promise<{ updates: any; cambios: Array<{ campo: string; anterior: any; nuevo: any }> }> {
  const updates: any = {};
  const cambios: Array<{ campo: string; anterior: any; nuevo: any }> = [];
  
  const validators: Array<{ key: keyof EntityChangeInput; validate: () => Promise<EntityUpdate | null>; applyUpdate: (r: EntityUpdate) => void; getPrev: () => any }> = [
    { key: 'choferId', validate: () => validateChoferChange(input.choferId!, equipo), applyUpdate: (r) => { updates.driverId = r.id; updates.driverDniNorm = r.norm; }, getPrev: () => equipo.driverId },
    { key: 'camionId', validate: () => validateCamionChange(input.camionId!, equipo), applyUpdate: (r) => { updates.truckId = r.id; updates.truckPlateNorm = r.norm; }, getPrev: () => equipo.truckId },
    { key: 'acopladoId', validate: () => validateAcopladoChange(input.acopladoId!, equipo), applyUpdate: (r) => { updates.trailerId = r.id; updates.trailerPlateNorm = r.norm ?? null; }, getPrev: () => equipo.trailerId },
    { key: 'empresaTransportistaId', validate: () => validateEmpresaChange(input.empresaTransportistaId!, equipo), applyUpdate: (r) => { updates.empresaTransportistaId = r.id; }, getPrev: () => equipo.empresaTransportistaId },
  ];
  
  for (const v of validators) {
    if (input[v.key] !== undefined) {
      const r = await v.validate();
      if (r) {
        v.applyUpdate(r);
        cambios.push({ campo: r.field, anterior: v.getPrev(), nuevo: r.id });
      }
    }
  }
  
  return { updates, cambios };
}

async function logEquipoChanges(equipoId: number, usuarioId: number, cambios: Array<{ campo: string; anterior: any; nuevo: any }>) {
  if (cambios.length === 0) return;
  
  await Promise.all(cambios.map(c => AuditService.logEquipoChange({
    equipoId, usuarioId, accion: 'EDITAR', campoModificado: c.campo, valorAnterior: c.anterior, valorNuevo: c.nuevo,
  })));
  
  await prisma.equipoHistory.create({
    data: { equipoId, action: 'edit', component: cambios.map(c => c.campo).join(','), payload: { cambios } as any },
  });
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class EquipoService {
  static async list(
    tenantEmpresaId: number,
    dadorCargaId: number | undefined,
    page: number = 1,
    limit: number = 20,
    opts?: { choferId?: number; activo?: boolean | 'all' }
  ) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max((page - 1) * take, 0);
    // Si dadorCargaId es undefined (admin sin filtro), traer todos los equipos del tenant
    const where: any = { tenantEmpresaId };
    if (dadorCargaId !== undefined) {
      where.dadorCargaId = dadorCargaId;
    }
    // Si viene choferId (rol CHOFER), limitar a su propio equipo
    if (opts?.choferId) {
      where.driverId = opts.choferId;
    }
    // Filtro de activo: si es 'all' no filtra, si es boolean filtra por ese valor
    if (opts?.activo !== 'all' && opts?.activo !== undefined) {
      where.activo = opts.activo;
    }
    return prisma.equipo.findMany({
      where,
      orderBy: { validFrom: 'desc' },
      include: { clientes: true, dador: true },
      take,
      skip,
    });
  }

  /**
   * Búsqueda paginada con filtros avanzados
   * Similar al portal cliente pero para admins
   */
  static async searchPaginated(
    tenantEmpresaId: number,
    filters: {
      dadorCargaId?: number;
      clienteId?: number;
      empresaTransportistaId?: number;
      search?: string; // DNI, patente o búsqueda libre
      dni?: string;
      truckPlate?: string;
      trailerPlate?: string;
      choferId?: number;
      activo?: boolean | 'all'; // Filtro de activo: true, false, o 'all' para todos
    },
    page: number = 1,
    limit: number = 10
  ) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.max((page - 1) * take, 0);
    
    const where: any = { tenantEmpresaId };
    
    // Filtros de entidad
    if (filters.dadorCargaId) {
      where.dadorCargaId = filters.dadorCargaId;
    }
    if (filters.empresaTransportistaId) {
      where.empresaTransportistaId = filters.empresaTransportistaId;
    }
    if (filters.choferId) {
      where.driverId = filters.choferId;
    }
    // Filtro de activo: si es 'all' no filtra, si es boolean filtra por ese valor
    if (filters.activo !== 'all' && filters.activo !== undefined) {
      where.activo = filters.activo;
    }
    
    // Filtros de búsqueda por texto
    const orConditions: any[] = [];
    
    if (filters.search) {
      // Búsqueda múltiple: puede ser DNI, patente, separados por |
      const searchValues = filters.search.split('|').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (searchValues.length > 0) {
        orConditions.push(
          { driverDniNorm: { in: searchValues } },
          { truckPlateNorm: { in: searchValues } },
          { trailerPlateNorm: { in: searchValues } }
        );
      }
    }
    
    if (filters.dni) {
      const dniNorm = normalizeDni(filters.dni);
      orConditions.push({ driverDniNorm: { contains: dniNorm } });
    }
    
    if (filters.truckPlate) {
      const plateNorm = normalizePlate(filters.truckPlate);
      orConditions.push({ truckPlateNorm: { contains: plateNorm } });
    }
    
    if (filters.trailerPlate) {
      const plateNorm = normalizePlate(filters.trailerPlate);
      orConditions.push({ trailerPlateNorm: { contains: plateNorm } });
    }
    
    if (orConditions.length > 0) {
      where.OR = orConditions;
    }
    
    // Si hay filtro por cliente, necesitamos hacer join
    let equipoIds: number[] | undefined;
    if (filters.clienteId) {
      const asignaciones = await prisma.equipoCliente.findMany({
        where: { clienteId: filters.clienteId, asignadoHasta: null },
        select: { equipoId: true }
      });
      equipoIds = asignaciones.map(a => a.equipoId);
      if (equipoIds.length === 0) {
        // No hay equipos asignados a este cliente
        return { equipos: [], total: 0, page, limit: take, totalPages: 0 };
      }
      where.id = { in: equipoIds };
    }
    
    // Obtener total y equipos
    const [total, equipos] = await Promise.all([
      prisma.equipo.count({ where }),
      prisma.equipo.findMany({
        where,
        orderBy: { id: 'asc' },
        include: { 
          clientes: { where: { asignadoHasta: null }, include: { cliente: true } }, 
          dador: true,
          empresaTransportista: true
        },
        take,
        skip,
      })
    ]);
    
    const totalPages = Math.ceil(total / take);
    
    return {
      equipos,
      total,
      page,
      limit: take,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Obtiene estadísticas de compliance agregadas para equipos que coinciden con los filtros
   * OPTIMIZADO: Usa batch compliance para reducir queries de N*M a ~5 queries
   * 
   * @returns Stats + mapa de compliance por equipo para reutilizar en filtrado
   */
  static async getComplianceStats(
    tenantEmpresaId: number,
    filters: {
      dadorCargaId?: number;
      clienteId?: number;
      empresaTransportistaId?: number;
      search?: string;
      dni?: string;
      truckPlate?: string;
      trailerPlate?: string;
      choferId?: number;
      activo?: boolean | 'all';
    }
  ): Promise<{ 
    total: number; 
    conFaltantes: number; 
    conVencidos: number; 
    conPorVencer: number; 
    equipoIds: number[];
    // Mapa interno para reutilizar en filtrado (evita recalcular)
    _complianceMap?: Map<number, { tieneVencidos: boolean; tieneFaltantes: boolean; tieneProximos: boolean }>;
  }> {
    const startTime = Date.now();
    const timings: Record<string, number> = {};
    
    // Construir where usando helper
    const where = buildEquipoWhereClause({ tenantEmpresaId, ...filters });
    
    // Filtro por cliente
    let clienteIdForCompliance: number | undefined;
    if (filters.clienteId) {
      clienteIdForCompliance = filters.clienteId;
      const asignaciones = await prisma.equipoCliente.findMany({
        where: { clienteId: filters.clienteId, asignadoHasta: null },
        select: { equipoId: true }
      });
      const equipoIdsCliente = asignaciones.map(a => a.equipoId);
      if (equipoIdsCliente.length === 0) {
        return { total: 0, conFaltantes: 0, conVencidos: 0, conPorVencer: 0, equipoIds: [] };
      }
      where.id = { in: equipoIdsCliente };
    }
    timings.filterBuild = Date.now() - startTime;
    
    // Obtener todos los equipos que coinciden con datos necesarios para compliance
    const equiposStart = Date.now();
    const equipos = await prisma.equipo.findMany({
      where,
      select: { 
        id: true, 
        driverId: true, 
        truckId: true, 
        trailerId: true, 
        tenantEmpresaId: true, 
        dadorCargaId: true,
        empresaTransportistaId: true,
      }
    });
    timings.equiposQuery = Date.now() - equiposStart;
    
    const total = equipos.length;
    const equipoIds = equipos.map(e => e.id);
    
    if (total === 0) {
      return { total: 0, conFaltantes: 0, conVencidos: 0, conPorVencer: 0, equipoIds: [] };
    }

    // BATCH COMPLIANCE: Siempre usar el servicio optimizado que evalúa requisitos de clientes
    const complianceMap = new Map<number, { tieneVencidos: boolean; tieneFaltantes: boolean; tieneProximos: boolean }>();
    
    const batchStart = Date.now();
    const equiposInfo: EquipoInfo[] = equipos.map(eq => ({
      id: eq.id,
      tenantEmpresaId: eq.tenantEmpresaId,
      dadorCargaId: eq.dadorCargaId,
      driverId: eq.driverId,
      truckId: eq.truckId,
      trailerId: eq.trailerId,
      empresaTransportistaId: eq.empresaTransportistaId,
    }));

    // Si hay clienteId, evaluar contra ese cliente específico
    // Si no, evaluar contra TODOS los clientes asignados a cada equipo
    const batchResults = await ComplianceService.evaluateBatchEquiposCliente(equiposInfo, clienteIdForCompliance);
    timings.batchCompliance = Date.now() - batchStart;
    
    for (const [eqId, result] of batchResults) {
      complianceMap.set(eqId, {
        tieneVencidos: result.tieneVencidos,
        tieneFaltantes: result.tieneFaltantes,
        tieneProximos: result.tieneProximos,
      });
    }
    
    // Contar estadísticas
    let conFaltantes = 0;
    let conVencidos = 0;
    let conPorVencer = 0;
    
    for (const state of complianceMap.values()) {
      if (state.tieneFaltantes) conFaltantes++;
      if (state.tieneVencidos) conVencidos++;
      if (state.tieneProximos) conPorVencer++;
    }
    
    timings.total = Date.now() - startTime;
    AppLogger.debug(`[EquipoService.getComplianceStats] equipos=${total}`, { timings });
    
    return {
      total,
      conFaltantes,
      conVencidos,
      conPorVencer,
      equipoIds,
      _complianceMap: complianceMap,
    };
  }

  /**
   * Búsqueda paginada con filtro de compliance
   * OPTIMIZADO: Reutiliza el mapa de compliance de getComplianceStats
   */
  static async searchPaginatedWithCompliance(
    tenantEmpresaId: number,
    filters: {
      dadorCargaId?: number;
      clienteId?: number;
      empresaTransportistaId?: number;
      search?: string;
      dni?: string;
      truckPlate?: string;
      trailerPlate?: string;
      choferId?: number;
      activo?: boolean | 'all';
      complianceFilter?: 'faltantes' | 'vencidos' | 'por_vencer';
    },
    page: number = 1,
    limit: number = 10
  ) {
    const stats = await this.getComplianceStats(tenantEmpresaId, filters);
    const statsResumen = { total: stats.total, conFaltantes: stats.conFaltantes, conVencidos: stats.conVencidos, conPorVencer: stats.conPorVencer };
    
    // Aplicar filtro de compliance si existe
    if (filters.complianceFilter && stats._complianceMap) {
      const filteredIds = filterByComplianceState(stats.equipoIds, stats._complianceMap, filters.complianceFilter);
      return buildPaginatedResult(filteredIds, page, limit, statsResumen);
    }
    
    // Sin filtro de compliance, usar búsqueda normal + stats ya calculados
    const result = await this.searchPaginated(tenantEmpresaId, filters, page, limit);
    
    return { 
      ...result, 
      stats: { total: stats.total, conFaltantes: stats.conFaltantes, conVencidos: stats.conVencidos, conPorVencer: stats.conPorVencer } 
    };
  }

  /**
   * Obtener un equipo por ID con todos sus detalles
   */
  static async getById(equipoId: number) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        empresaTransportista: true,
        dador: true,
        clientes: {
          where: { asignadoHasta: null },
          include: { cliente: true },
        },
      },
    });
    if (!equipo) {
      throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
    }

    // Obtener datos de chofer, camión y acoplado por separado
    const [chofer, camion, acoplado] = await Promise.all([
      prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
      prisma.camion.findUnique({ where: { id: equipo.truckId } }),
      equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } }) : null,
    ]);

    return {
      ...equipo,
      chofer,
      camion,
      acoplado,
    };
  }

  static async attachComponents(
    tenantEmpresaId: number,
    equipoId: number,
    data: { driverId?: number; truckId?: number; trailerId?: number; driverDni?: string; truckPlate?: string; trailerPlate?: string }
  ): Promise<any> {
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { id: true, tenantEmpresaId: true, dadorCargaId: true } });
    if (!equipo || equipo.tenantEmpresaId !== tenantEmpresaId) throw new Error('Equipo no encontrado');

    // Resolver componentes usando helpers
    const driverResult = await resolveDriver(tenantEmpresaId, equipo.dadorCargaId, equipoId, data.driverId, data.driverDni);
    const truckResult = await resolveTruck(tenantEmpresaId, equipo.dadorCargaId, equipoId, data.truckId, data.truckPlate);
    const trailerResult = await resolveTrailer(tenantEmpresaId, equipo.dadorCargaId, equipoId, data.trailerId, data.trailerPlate);

    // Construir updates
    const updates: any = {};
    if (driverResult) {
      updates.driverId = driverResult.id;
      if (driverResult.normValue) updates.driverDniNorm = driverResult.normValue;
    }
    if (truckResult) {
      updates.truckId = truckResult.id;
      if (truckResult.normValue) updates.truckPlateNorm = truckResult.normValue;
    }
    if (trailerResult) {
      updates.trailerId = trailerResult.id;
      updates.trailerPlateNorm = trailerResult.normValue || null;
    }

    if (Object.keys(updates).length === 0) throw new Error('Sin cambios');

    let updated = await prisma.equipo.update({ where: { id: equipoId }, data: updates });

    // Registrar historial
    await this.recordAttachHistory(equipoId, updates, driverResult, truckResult, trailerResult);
    
    // Reabrir equipo si tiene componentes completos
    updated = await this.reopenEquipoIfComplete(equipoId, updated);
    
    // Re-chequeo de faltantes diferido
    await this.enqueueComplianceCheck(tenantEmpresaId, equipoId);
    
    return updated;
  }

  private static async recordAttachHistory(
    equipoId: number,
    updates: any,
    driverResult: ResolveResult | null,
    truckResult: ResolveResult | null,
    trailerResult: ResolveResult | null
  ): Promise<void> {
    const getComponent = (): string => {
      if (updates.driverId) return 'driver';
      if (updates.truckId) return 'truck';
      if (updates.trailerId !== undefined) return 'trailer';
      return 'unknown';
    };

    try {
      await prisma.equipoHistory.create({
        data: { equipoId, action: 'attach', component: getComponent(), originEquipoId: null, payload: updates },
      });

      if (driverResult?.originEquipoId) {
        await prisma.equipoHistory.create({ data: { equipoId, action: 'swap', component: 'driver', originEquipoId: driverResult.originEquipoId, payload: { reason: 'attach' } as any } });
      }
      if (truckResult?.originEquipoId) {
        await prisma.equipoHistory.create({ data: { equipoId, action: 'swap', component: 'truck', originEquipoId: truckResult.originEquipoId, payload: { reason: 'attach' } as any } });
      }
      if (trailerResult?.originEquipoId) {
        await prisma.equipoHistory.create({ data: { equipoId, action: 'swap', component: 'trailer', originEquipoId: trailerResult.originEquipoId, payload: { reason: 'attach' } as any } });
      }
    } catch { /* noop */ }
  }

  private static async reopenEquipoIfComplete(equipoId: number, equipo: any): Promise<any> {
    try {
      if (equipo.estado !== 'activa' && equipo.driverId && equipo.truckId) {
        equipo = await prisma.equipo.update({ where: { id: equipoId }, data: { estado: 'activa' as any, validTo: null } });
        await prisma.equipoHistory.create({ data: { equipoId, action: 'reopen', component: 'system', originEquipoId: null, payload: { reason: 'complete' } as any } });
      }
      if (equipo.validTo !== null && equipo.driverId && equipo.truckId) {
        equipo = await prisma.equipo.update({ where: { id: equipoId }, data: { validTo: null } });
      }
    } catch { /* noop */ }
    return equipo;
  }

  private static async enqueueComplianceCheck(tenantEmpresaId: number, equipoId: number): Promise<void> {
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(tenantEmpresaId, equipoId);
    } catch { /* noop */ }
  }

  static async detachComponents(
    tenantEmpresaId: number,
    equipoId: number,
    data: { driver?: boolean; truck?: boolean; trailer?: boolean }
  ): Promise<any> {
    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId }, select: { id: true, tenantEmpresaId: true } });
    if (!equipo || equipo.tenantEmpresaId !== tenantEmpresaId) throw new Error('Equipo no encontrado');
    const updates: any = {};
    // driverId y truckId son NO nulos en el modelo, no se pueden desasociar sin cerrar el equipo.
    if (data.driver) {
      const err: any = new Error('No es posible desasociar el chofer en un equipo activo. Cierre el equipo (validTo) y cree uno nuevo.');
      err.code = 'DETACH_NOT_SUPPORTED';
      throw err;
    }
    if (data.truck) {
      const err: any = new Error('No es posible desasociar el camión en un equipo activo. Cierre el equipo (validTo) y cree uno nuevo.');
      err.code = 'DETACH_NOT_SUPPORTED';
      throw err;
    }
    if (data.trailer) { updates.trailerId = null; updates.trailerPlateNorm = null; }
    if (Object.keys(updates).length === 0) throw new Error('Sin cambios');
    const updated = await prisma.equipo.update({ where: { id: equipoId }, data: updates });
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(tenantEmpresaId, equipoId);
    } catch { /* Encolar es best-effort */ }
    return updated;
  }

  static async ensureChofer(tenantEmpresaId: number, dadorCargaId: number, dni: string, phones?: string[]) {
    const dniNorm = normalizeDni(dni);
    const existing = await prisma.chofer.findFirst({
      where: { tenantEmpresaId, dadorCargaId, dniNorm }
    });
    if (existing) {
      if (phones && phones.length) {
        await prisma.chofer.update({ where: { id: existing.id }, data: { phones } });
      }
      return existing.id;
    }
    const created = await prisma.chofer.create({
      data: { tenantEmpresaId, dadorCargaId, dni: dniNorm, dniNorm, phones: phones ?? [], activo: true }
    });
    return created.id;
  }

  static async ensureCamion(tenantEmpresaId: number, dadorCargaId: number, patente: string) {
    const patNorm = normalizePlate(patente);
    const existing = await prisma.camion.findFirst({
      where: { tenantEmpresaId, dadorCargaId, patenteNorm: patNorm }
    });
    if (existing) return existing.id;
    const created = await prisma.camion.create({
      data: { tenantEmpresaId, dadorCargaId, patente: patNorm, patenteNorm: patNorm, activo: true }
    });
    return created.id;
  }

  static async ensureAcoplado(tenantEmpresaId: number, dadorCargaId: number, patente?: string | null) {
    if (!patente) return null;
    const patNorm = normalizePlate(patente);
    const existing = await prisma.acoplado.findFirst({
      where: { tenantEmpresaId, dadorCargaId, patenteNorm: patNorm }
    });
    if (existing) return existing.id;
    const created = await prisma.acoplado.create({
      data: { tenantEmpresaId, dadorCargaId, patente: patNorm, patenteNorm: patNorm, activo: true }
    });
    return created.id;
  }

  static async ensureEmpresaTransportista(
    tenantEmpresaId: number,
    dadorCargaId: number,
    cuit?: string | null,
    razonSocial?: string | null
  ): Promise<number | null> {
    if (!cuit) return null;
    const cuitNorm = (cuit || '').replace(/\D+/g, '');
    if (!cuitNorm) return null;
    const existing = await prisma.empresaTransportista.findFirst({
      where: { tenantEmpresaId, dadorCargaId, cuit: cuitNorm },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.empresaTransportista.create({
      data: {
        tenantEmpresaId,
        dadorCargaId,
        cuit: cuitNorm,
        razonSocial: (razonSocial || '').trim() || `Empresa ${cuitNorm}`,
        activo: true,
      } as any,
    });
    return created.id;
  }

  static async createFromIdentifiers(input: {
    tenantEmpresaId: number;
    dadorCargaId: number;
    dniChofer: string;
    patenteTractor: string;
    patenteAcoplado?: string | null;
    choferPhones?: string[];
    empresaTransportistaCuit?: string | null;
    empresaTransportistaNombre?: string | null;
  }) {
    const driverId = await this.ensureChofer(input.tenantEmpresaId, input.dadorCargaId, input.dniChofer, input.choferPhones);
    const truckId = await this.ensureCamion(input.tenantEmpresaId, input.dadorCargaId, input.patenteTractor);
    const trailerId = await this.ensureAcoplado(input.tenantEmpresaId, input.dadorCargaId, input.patenteAcoplado ?? null);
    const empresaTransportistaId = await this.ensureEmpresaTransportista(
      input.tenantEmpresaId,
      input.dadorCargaId,
      input.empresaTransportistaCuit ?? null,
      input.empresaTransportistaNombre ?? null
    );

    const created = await this.create({
      tenantEmpresaId: input.tenantEmpresaId,
      dadorCargaId: input.dadorCargaId,
      driverId,
      truckId,
      trailerId,
      empresaTransportistaId: empresaTransportistaId ?? undefined,
      driverDni: input.dniChofer,
      truckPlate: input.patenteTractor,
      trailerPlate: input.patenteAcoplado ?? null,
      validFrom: new Date(),
    });
    // Encolar chequeo de faltantes en 15 minutos
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(input.tenantEmpresaId, created.id, 15 * 60 * 1000);
    } catch { /* noop */ }
    // Asociar cliente por defecto si existe
    try {
      const { SystemConfigService } = await import('./system-config.service');
      const defIdStr = await SystemConfigService.getConfig(`tenant:${input.tenantEmpresaId}:defaults.defaultClienteId`);
      const defId = defIdStr ? Number(defIdStr) : NaN;
      if (!Number.isNaN(defId)) {
        await this.associateCliente(input.tenantEmpresaId, created.id, defId, new Date());
      }
    } catch { /* noop */ }
    return created;
  }

  static async listByCliente(tenantEmpresaId: number, clienteId: number, includeInactive = false) {
    // Devuelve equipos actualmente asignados al cliente (asignadoHasta NULL) con datos básicos
    // Por defecto NO incluye equipos inactivos (activo=false)
    return prisma.equipoCliente.findMany({
      where: { 
        clienteId, 
        equipo: { 
          tenantEmpresaId,
          ...(includeInactive ? {} : { activo: true }),
        } 
      },
      include: {
        equipo: true,
      },
      orderBy: { asignadoDesde: 'desc' },
    });
  }

  static async create(input: {
    tenantEmpresaId: number;
    dadorCargaId: number;
    driverId: number;
    truckId: number;
    trailerId?: number | null;
    empresaTransportistaId?: number | null;
    driverDni: string;
    truckPlate: string;
    trailerPlate?: string | null;
    validFrom: Date;
    validTo?: Date | null;
    forceMove?: boolean;
  }) {
    // Validar empresa transportista
    await validateEmpresaTransportista(input.empresaTransportistaId, input.tenantEmpresaId, input.dadorCargaId);

    // Normalizar identificadores
    const dniNorm = normalizeDni(input.driverDni);
    const truckNorm = normalizePlate(input.truckPlate);
    const trailerNorm = input.trailerPlate ? normalizePlate(input.trailerPlate) : null;

    // Verificar duplicados
    const existing = await prisma.equipo.findFirst({
      where: {
        tenantEmpresaId: input.tenantEmpresaId,
        dadorCargaId: input.dadorCargaId,
        driverDniNorm: dniNorm,
        truckPlateNorm: truckNorm,
        trailerPlateNorm: trailerNorm,
        OR: [{ validTo: null }, { validTo: { gte: input.validFrom } }],
      },
    });
    if (existing) {
      throw createError('Equipo ya existe para este DNI/patentes en vigencia', 409, 'EQUIPO_DUPLICATE');
    }

    // Buscar conflictos de componentes
    const { conflicts } = await findComponentConflicts(input.tenantEmpresaId, dniNorm, truckNorm, trailerNorm);
    
    if (conflicts.length && !input.forceMove) {
      throw createError(`Componentes ya en uso: ${conflicts.join(', ')}`, 409, 'COMPONENT_IN_USE');
    }

    // Resolver conflictos si forceMove
    if (conflicts.length && input.forceMove) {
      await resolveComponentConflicts(input.tenantEmpresaId, dniNorm, truckNorm, trailerNorm);
    }

    // Crear equipo y registrar historial en una transacción atómica
    const equipo = await prisma.$transaction(async (tx) => {
      const created = await tx.equipo.create({
        data: {
          tenantEmpresaId: input.tenantEmpresaId,
          dadorCargaId: input.dadorCargaId,
          driverId: input.driverId,
          truckId: input.truckId,
          trailerId: input.trailerId ?? null,
          empresaTransportistaId: input.empresaTransportistaId ?? null,
          driverDniNorm: dniNorm,
          truckPlateNorm: truckNorm,
          trailerPlateNorm: trailerNorm,
          validFrom: input.validFrom,
          validTo: input.validTo ?? null,
          activo: true,
        },
      });

      await tx.equipoHistory.create({
        data: {
          equipoId: created.id,
          action: 'create',
          component: 'system',
          originEquipoId: null,
          payload: { driverDni: dniNorm, truckPlate: truckNorm, trailerPlate: trailerNorm } as any
        }
      });

      return created;
    });

    // Acciones no-críticas fuera de la transacción (fire-and-forget)
    onEquipoCreatedAsync(equipo, input.tenantEmpresaId);
    
    return equipo;
  }

  static async update(id: number, data: {
    trailerId?: number | null;
    trailerPlate?: string | null;
    validTo?: Date | null;
    estado?: 'activa' | 'finalizada';
    empresaTransportistaId?: number;
  }) {
    // Validar empresa transportista si se proporciona
    if (data.empresaTransportistaId !== undefined && data.empresaTransportistaId !== 0) {
      await validateEmpresaTransportistaForEquipo(id, data.empresaTransportistaId);
    }

    // Construir datos de actualización evitando ternarios anidados
    const updateData: any = {
      trailerId: data.trailerId,
      validTo: data.validTo ?? undefined,
      estado: data.estado as any,
    };
    
    // Normalizar trailerPlateNorm si se proporciona
    if (data.trailerPlate !== undefined) {
      updateData.trailerPlateNorm = data.trailerPlate ? normalizePlate(data.trailerPlate) : null;
    }
    
    // Normalizar empresaTransportistaId (0 significa null)
    if (data.empresaTransportistaId !== undefined) {
      updateData.empresaTransportistaId = data.empresaTransportistaId === 0 ? null : data.empresaTransportistaId;
    }
    
    return prisma.equipo.update({ where: { id }, data: updateData });
  }

  static async associateCliente(tenantEmpresaId: number, equipoId: number, clienteId: number, asignadoDesde: Date, asignadoHasta?: Date | null) {
    // Evitar asociar dos veces el mismo equipo-cliente sin cierre de vigencia
    const open = await prisma.equipoCliente.findFirst({
      where: { equipoId, clienteId, asignadoHasta: null },
    });
    if (open) {
      const err: any = new Error('Asociación equipo-cliente ya existe');
      err.code = 'EQUIPO_CLIENTE_DUPLICATE';
      throw err;
    }
    const assoc = await prisma.equipoCliente.create({
      data: { equipoId, clienteId, asignadoDesde, asignadoHasta: asignadoHasta ?? null },
    });
    // Encolar chequeo de faltantes por nuevos requisitos en 15 minutos
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(tenantEmpresaId, equipoId, 15 * 60 * 1000);
    } catch { /* Encolar es best-effort */ }
    return assoc;
  }

  static async removeCliente(tenantEmpresaId: number, equipoId: number, clienteId: number) {
    // Validar que quede al menos 1 cliente después de quitar
    const clientesActuales = await prisma.equipoCliente.count({
      where: { equipoId, asignadoHasta: null },
    });
    if (clientesActuales <= 1) {
      throw createError('No se puede quitar el último cliente. El equipo debe tener al menos un cliente.', 400, 'MIN_CLIENTE_REQUIRED');
    }

    // Eliminar última asociación abierta
    const assoc = await prisma.equipoCliente.findFirst({
      where: { equipoId, clienteId, asignadoHasta: null },
      orderBy: { asignadoDesde: 'desc' },
    });
    if (!assoc) return null;
    return prisma.equipoCliente.update({
      where: { equipoId_clienteId_asignadoDesde: { equipoId, clienteId, asignadoDesde: assoc.asignadoDesde } },
      data: { asignadoHasta: new Date() },
    });
  }

  // Eliminación segura de equipo (solo si no tiene asociaciones activas)
  static async delete(equipoId: number) {
    return prisma.$transaction(async (tx) => {
      // Registrar eliminación (nota: será eliminado al purgar history por FK)
      try {
        await tx.equipoHistory.create({ data: { equipoId, action: 'delete', component: 'system', originEquipoId: null, payload: { reason: 'user' } as any } });
      } catch { /* History log no bloquea eliminación */ }

      // Borra asociaciones cliente vigentes
      await tx.equipoCliente.deleteMany({ where: { equipoId } });

      // Borra historial para evitar violación de FK
      await tx.equipoHistory.deleteMany({ where: { equipoId } });

      // Eliminar equipo
      return tx.equipo.delete({ where: { id: equipoId } });
    });
  }

  /**
   * Alta Completa de Equipo - TRANSACCIONAL
   * 
   * Flujo:
   * 1. EMPRESA (CUIT): Si existe, usar. Si no, crear.
   * 2. CHOFER (DNI): Si existe y está huérfano (sin equipo activo), reutilizar. 
   *                  Si está en uso por otro equipo, ERROR. Si no existe, crear.
   * 3. CAMIÓN (Patente): Si existe y está huérfano, reutilizar. 
   *                      Si está en uso, ERROR. Si no existe, crear.
   * 4. ACOPLADO (Patente): Si existe y está huérfano, reutilizar. 
   *                        Si está en uso, ERROR. Si no existe, crear.
   * 5. Crear EQUIPO con las 4 entidades.
   * 6. Asociar clientes al equipo.
   * 
   * Si cualquier paso falla, se hace ROLLBACK automático de toda la transacción.
   */
  static async createEquipoCompleto(input: {
    tenantEmpresaId: number;
    dadorCargaId: number;
    
    // Empresa Transportista
    empresaTransportistaCuit: string;
    empresaTransportistaNombre: string;
    
    // Chofer
    choferDni: string;
    choferNombre?: string;
    choferApellido?: string;
    choferPhones?: string[];
    
    // Camión
    camionPatente: string;
    camionMarca?: string;
    camionModelo?: string;
    
    // Acoplado (opcional)
    acopladoPatente?: string | null;
    acopladoTipo?: string;
    
    // Clientes a asociar
    clienteIds?: number[];
  }) {
    return await prisma.$transaction(async (tx) => {
      const ctx: AltaCompletaContext = { tenantEmpresaId: input.tenantEmpresaId, dadorCargaId: input.dadorCargaId };

      // 1. EMPRESA TRANSPORTISTA: Si existe (por CUIT), usar. Si no, crear.
      const empresaTransportista = await getOrCreateEmpresaTransportista(
        tx, ctx, input.empresaTransportistaCuit, input.empresaTransportistaNombre
      );

      // 2. CHOFER: Si existe y está huérfano, reutilizar. Si está en uso, error. Si no existe, crear.
      const chofer = await getOrCreateChofer(
        tx, ctx, input.choferDni, input.choferNombre, input.choferApellido, input.choferPhones
      );

      // 3. CAMIÓN: Si existe y está huérfano, reutilizar. Si está en uso, error. Si no existe, crear.
      const camion = await getOrCreateCamion(
        tx, ctx, input.camionPatente, input.camionMarca, input.camionModelo
      );

      // 4. ACOPLADO (Opcional): Si existe y está huérfano, reutilizar. Si está en uso, error. Si no existe, crear.
      const acoplado = await getOrCreateAcoplado(tx, ctx, input.acopladoPatente, input.acopladoTipo);
      const acopladoId = acoplado?.id || null;

      // 5. CREAR EQUIPO con las 4 entidades
      const dniNorm = normalizeDni(input.choferDni);
      const patenteNorm = normalizePlate(input.camionPatente);
      const equipo = await tx.equipo.create({
        data: {
          tenantEmpresaId: input.tenantEmpresaId,
          dadorCargaId: input.dadorCargaId,
          driverId: chofer.id,
          truckId: camion.id,
          trailerId: acopladoId,
          empresaTransportistaId: empresaTransportista.id,
          driverDniNorm: dniNorm,
          truckPlateNorm: patenteNorm,
          trailerPlateNorm: acopladoId ? normalizePlate(input.acopladoPatente!) : null,
          validFrom: new Date(),
          validTo: null,
        },
      });

      // Registrar creación en historial
      await tx.equipoHistory.create({
        data: {
          equipoId: equipo.id,
          action: 'create',
          component: 'system',
          originEquipoId: null,
          payload: {
            method: 'altaCompleta',
            dniChofer: input.choferDni,
            patenteCamion: input.camionPatente,
            patenteAcoplado: input.acopladoPatente,
            cuitEmpresa: input.empresaTransportistaCuit,
          } as any,
        },
      });

      // ═══════════════════════════════════════════════════════════════════
      // 6. ASOCIAR CLIENTES al equipo (si se proporcionaron)
      // ═══════════════════════════════════════════════════════════════════
      if (input.clienteIds && input.clienteIds.length > 0) {
        for (const clienteId of input.clienteIds) {
          await tx.equipoCliente.create({
            data: {
              equipoId: equipo.id,
              clienteId,
              asignadoDesde: new Date(),
              asignadoHasta: null,
            },
          });
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 7. RETORNAR EQUIPO CREADO CON TODOS LOS IDs
      // ═══════════════════════════════════════════════════════════════════
      return {
        id: equipo.id,
        driverId: chofer.id,
        truckId: camion.id,
        trailerId: acopladoId,
        empresaTransportistaId: empresaTransportista.id,
        dadorCargaId: input.dadorCargaId,
        tenantEmpresaId: input.tenantEmpresaId,
        validFrom: equipo.validFrom,
        validTo: equipo.validTo,
        estado: equipo.estado,
        createdAt: equipo.createdAt,
        // Datos completos para el frontend
        chofer: {
          id: chofer.id,
          dni: chofer.dni,
          nombre: chofer.nombre,
          apellido: chofer.apellido,
        },
        camion: {
          id: camion.id,
          patente: camion.patente,
          marca: camion.marca,
          modelo: camion.modelo,
        },
        acoplado: acoplado ? {
          id: acoplado.id,
          patente: acoplado.patente,
          tipo: acoplado.tipo,
        } : null,
        empresaTransportista: {
          id: empresaTransportista.id,
          cuit: empresaTransportista.cuit,
          razonSocial: empresaTransportista.razonSocial,
        },
      };
    });
  }

  /**
   * Rollback de Alta Completa
   * Elimina un equipo y sus componentes creados en el proceso de alta completa.
   * SOLO si fueron creados en esta operación (validar por timestamp o flag).
   */
  static async rollbackAltaCompleta(input: {
    tenantEmpresaId: number;
    equipoId: number;
    deleteChofer?: boolean;
    deleteCamion?: boolean;
    deleteAcoplado?: boolean;
    deleteEmpresa?: boolean;
  }) {
    return await prisma.$transaction(async (tx) => {
      // Obtener el equipo
      const equipo = await tx.equipo.findUnique({
        where: { id: input.equipoId },
      });

      if (!equipo || equipo.tenantEmpresaId !== input.tenantEmpresaId) {
        throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
      }

      // Eliminar asociaciones equipo-cliente
      await tx.equipoCliente.deleteMany({
        where: { equipoId: input.equipoId },
      });

      // Eliminar historial del equipo
      await tx.equipoHistory.deleteMany({
        where: { equipoId: input.equipoId },
      });

      // Eliminar documentos asociados (si existen)
      await tx.document.deleteMany({
        where: {
          tenantEmpresaId: input.tenantEmpresaId,
          OR: [
            { entityType: 'CHOFER', entityId: equipo.driverId },
            { entityType: 'CAMION', entityId: equipo.truckId },
            { entityType: 'ACOPLADO', entityId: equipo.trailerId ?? undefined },
            { entityType: 'EMPRESA_TRANSPORTISTA', entityId: equipo.empresaTransportistaId ?? undefined },
          ],
        },
      });

      // Eliminar el equipo
      await tx.equipo.delete({
        where: { id: input.equipoId },
      });

      // Eliminar componentes si se solicita
      if (input.deleteChofer && equipo.driverId) {
        await tx.chofer.delete({ where: { id: equipo.driverId } });
      }

      if (input.deleteCamion && equipo.truckId) {
        await tx.camion.delete({ where: { id: equipo.truckId } });
      }

      if (input.deleteAcoplado && equipo.trailerId) {
        await tx.acoplado.delete({ where: { id: equipo.trailerId } });
      }

      if (input.deleteEmpresa && equipo.empresaTransportistaId) {
        // Solo eliminar si no tiene otros equipos asociados
        const otrosEquipos = await tx.equipo.count({
          where: {
            tenantEmpresaId: input.tenantEmpresaId,
            empresaTransportistaId: equipo.empresaTransportistaId,
            id: { not: input.equipoId },
          },
        });

        if (otrosEquipos === 0) {
          await tx.empresaTransportista.delete({
            where: { id: equipo.empresaTransportistaId },
          });
        }
      }

      return { success: true, message: 'Rollback completado exitosamente' };
    });
  }

  /**
   * Actualizar equipo (cambiar entidades)
   * Valida permisos y documentos existentes
   */
  static async updateEquipo(input: {
    equipoId: number;
    usuarioId: number;
    tenantEmpresaId: number;
    choferId?: number;
    camionId?: number;
    acopladoId?: number | null;
    empresaTransportistaId?: number;
    expectedVersion?: number;
  }) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: input.equipoId },
      include: { clientes: { where: { asignadoHasta: null } } },
    });

    if (!equipo || equipo.tenantEmpresaId !== input.tenantEmpresaId) {
      throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
    }

    if (input.expectedVersion !== undefined && input.expectedVersion !== equipo.version) {
      throw createError(
        'El equipo fue modificado por otro usuario. Recargue y vuelva a intentar.',
        409,
        'CONFLICT_STALE_DATA'
      );
    }

    const { updates, cambios } = await collectEntityChanges(input, equipo);
    if (Object.keys(updates).length === 0) return equipo;

    updates.version = { increment: 1 };
    const updated = await prisma.equipo.update({ where: { id: input.equipoId }, data: updates });
    await logEquipoChanges(input.equipoId, input.usuarioId, cambios);
    
    return updated;
  }

  /**
   * Agregar cliente a equipo
   */
  static async addClienteToEquipo(input: {
    equipoId: number;
    clienteId: number;
    usuarioId: number;
    tenantEmpresaId: number;
  }) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: input.equipoId },
    });

    if (!equipo || equipo.tenantEmpresaId !== input.tenantEmpresaId) {
      throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
    }

    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({ where: { id: input.clienteId } });
    if (!cliente) {
      throw createError('Cliente no encontrado', 404, 'CLIENTE_NOT_FOUND');
    }

    // Verificar que no esté ya asociado
    const existente = await prisma.equipoCliente.findFirst({
      where: { equipoId: input.equipoId, clienteId: input.clienteId, asignadoHasta: null },
    });

    if (existente) {
      throw createError('El cliente ya está asociado a este equipo', 409, 'CLIENTE_YA_ASOCIADO');
    }

    // Crear asociación
    const asociacion = await prisma.equipoCliente.create({
      data: {
        equipoId: input.equipoId,
        clienteId: input.clienteId,
        asignadoDesde: new Date(),
        asignadoHasta: null,
      },
    });

    // Auditoría
    await AuditService.logEquipoChange({
      equipoId: input.equipoId,
      usuarioId: input.usuarioId,
      accion: 'AGREGAR_CLIENTE',
      campoModificado: 'cliente',
      valorNuevo: { clienteId: input.clienteId, clienteNombre: cliente.razonSocial },
    });

    return asociacion;
  }

  /**
   * Quitar cliente de equipo con archivado de documentos exclusivos
   */
  static async removeClienteFromEquipo(input: {
    equipoId: number;
    clienteId: number;
    usuarioId: number;
    tenantEmpresaId: number;
  }) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: input.equipoId },
    });

    if (!equipo || equipo.tenantEmpresaId !== input.tenantEmpresaId) {
      throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
    }

    // Validar que quede al menos 1 cliente después de quitar
    const clientesActuales = await prisma.equipoCliente.count({
      where: { equipoId: input.equipoId, asignadoHasta: null },
    });

    if (clientesActuales <= 1) {
      throw createError('No se puede quitar el último cliente. El equipo debe tener al menos un cliente.', 400, 'MIN_CLIENTE_REQUIRED');
    }

    // Obtener otros clientes para identificar documentos exclusivos
    const otrosClientes = await prisma.equipoCliente.findMany({
      where: { 
        equipoId: input.equipoId, 
        asignadoHasta: null,
        clienteId: { not: input.clienteId },
      },
      select: { clienteId: true },
    });

    const otherClienteIds = otrosClientes.map(c => c.clienteId);

    // Buscar documentos exclusivos del cliente que se va
    const exclusiveDocIds = await DocumentArchiveService.findDocumentsExclusiveToClient({
      equipoId: input.equipoId,
      clienteId: input.clienteId,
      otherClienteIds,
    });

    // Archivar documentos exclusivos
    if (exclusiveDocIds.length > 0) {
      await DocumentArchiveService.archiveDocuments({
        documentIds: exclusiveDocIds,
        reason: 'CLIENTE_REMOVIDO',
        userId: input.usuarioId,
      });
    }

    // Cerrar asociación
    const asociacion = await prisma.equipoCliente.findFirst({
      where: { equipoId: input.equipoId, clienteId: input.clienteId, asignadoHasta: null },
      orderBy: { asignadoDesde: 'desc' },
    });

    if (!asociacion) {
      throw createError('El cliente no está asociado a este equipo', 404, 'CLIENTE_NO_ASOCIADO');
    }

    await prisma.equipoCliente.update({
      where: { 
        equipoId_clienteId_asignadoDesde: { 
          equipoId: input.equipoId, 
          clienteId: input.clienteId, 
          asignadoDesde: asociacion.asignadoDesde,
        },
      },
      data: { asignadoHasta: new Date() },
    });

    // También cerrar las plantillas de requisito del cliente removido
    // Buscar plantillas que pertenecen al cliente removido
    const plantillasDelCliente = await prisma.plantillaRequisito.findMany({
      where: { 
        clienteId: input.clienteId,
        tenantEmpresaId: input.tenantEmpresaId,
      },
      select: { id: true },
    });

    let plantillasCerradas = 0;
    if (plantillasDelCliente.length > 0) {
      const plantillaIds = plantillasDelCliente.map(p => p.id);
      
      // Cerrar asociaciones equipo-plantilla activas de este cliente
      const result = await prisma.equipoPlantillaRequisito.updateMany({
        where: {
          equipoId: input.equipoId,
          plantillaRequisitoId: { in: plantillaIds },
          asignadoHasta: null, // Solo las activas
        },
        data: { asignadoHasta: new Date() },
      });
      plantillasCerradas = result.count;
    }

    // Auditoría
    await AuditService.logEquipoChange({
      equipoId: input.equipoId,
      usuarioId: input.usuarioId,
      accion: 'QUITAR_CLIENTE',
      campoModificado: 'cliente',
      valorAnterior: { clienteId: input.clienteId },
      motivo: exclusiveDocIds.length > 0 || plantillasCerradas > 0 
        ? `${exclusiveDocIds.length} documentos archivados, ${plantillasCerradas} plantillas desasociadas` 
        : undefined,
    });

    return { removed: true, archivedDocuments: exclusiveDocIds.length, plantillasRemovidas: plantillasCerradas };
  }

  /**
   * Transferir equipo a otro dador de carga (solo admin interno)
   */
  static async transferirEquipo(input: {
    equipoId: number;
    nuevoDadorCargaId: number;
    usuarioId: number;
    tenantEmpresaId: number;
    motivo?: string;
  }) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: input.equipoId },
    });

    if (!equipo || equipo.tenantEmpresaId !== input.tenantEmpresaId) {
      throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
    }

    if (equipo.dadorCargaId === input.nuevoDadorCargaId) {
      throw createError('El equipo ya pertenece a este dador de carga', 400, 'MISMO_DADOR');
    }

    // Verificar que el nuevo dador existe
    const nuevoDador = await prisma.dadorCarga.findUnique({ where: { id: input.nuevoDadorCargaId } });
    if (!nuevoDador || nuevoDador.tenantEmpresaId !== input.tenantEmpresaId) {
      throw createError('Dador de carga no válido', 400, 'DADOR_INVALIDO');
    }

    const dadorAnterior = equipo.dadorCargaId;

    // Actualizar equipo
    const updated = await prisma.equipo.update({
      where: { id: input.equipoId },
      data: { dadorCargaId: input.nuevoDadorCargaId },
    });

    // Auditoría
    await AuditService.logEquipoChange({
      equipoId: input.equipoId,
      usuarioId: input.usuarioId,
      accion: 'TRANSFERIR',
      campoModificado: 'dadorCarga',
      valorAnterior: dadorAnterior,
      valorNuevo: input.nuevoDadorCargaId,
      motivo: input.motivo,
    });

    // Historial
    await prisma.equipoHistory.create({
      data: {
        equipoId: input.equipoId,
        action: 'transfer',
        component: 'dador',
        payload: { 
          dadorAnterior, 
          dadorNuevo: input.nuevoDadorCargaId,
          motivo: input.motivo,
        } as any,
      },
    });

    return updated;
  }

  /**
   * Obtener requisitos consolidados de un equipo
   */
  static async getRequisitosEquipo(equipoId: number, tenantEmpresaId: number) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: equipoId },
      include: {
        clientes: {
          where: { asignadoHasta: null },
          include: { cliente: true },
        },
      },
    });

    if (!equipo || equipo.tenantEmpresaId !== tenantEmpresaId) {
      throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
    }

    const clienteIds = equipo.clientes.map(c => c.clienteId);

    // Obtener requisitos desde PlantillaRequisitoTemplate (fuente de verdad actual)
    const requisitos = await prisma.plantillaRequisitoTemplate.findMany({
      where: {
        plantillaRequisito: {
          clienteId: { in: clienteIds },
          activo: true,
        },
      },
      include: {
        template: true,
        plantillaRequisito: {
          include: { cliente: { select: { id: true, razonSocial: true } } },
        },
      },
    });

    const consolidado = consolidarRequisitos(requisitos);
    return enriquecerConDocumentos(consolidado, equipo);
  }
}
