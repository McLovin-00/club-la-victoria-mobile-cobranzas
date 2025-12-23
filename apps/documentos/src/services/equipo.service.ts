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

/** Valida DNI y crea chofer (error si existe) */
async function createChoferNoDuplicado(
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
    throw createError(`El chofer con DNI ${dniRaw} ya existe en el sistema. No se puede duplicar.`, 409, 'CHOFER_DUPLICADO');
  }

  return tx.chofer.create({
    data: {
      tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId,
      dni, dniNorm: dni, nombre: nombre?.trim() || undefined, apellido: apellido?.trim() || undefined,
      phones: phones ?? [], activo: true,
    },
  });
}

/** Valida patente y crea camión (error si existe) */
async function createCamionNoDuplicado(
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
    throw createError(`El camión con patente ${patenteRaw} ya existe en el sistema. No se puede duplicar.`, 409, 'CAMION_DUPLICADO');
  }

  return tx.camion.create({
    data: {
      tenantEmpresaId: ctx.tenantEmpresaId, dadorCargaId: ctx.dadorCargaId,
      patente, patenteNorm: patente, marca: marca?.trim() || undefined, modelo: modelo?.trim() || undefined, activo: true,
    },
  });
}

/** Valida patente y crea acoplado (error si existe). Retorna null si no hay patente */
async function createAcopladoNoDuplicado(
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
    throw createError(`El acoplado con patente ${patenteRaw} ya existe en el sistema. No se puede duplicar.`, 409, 'ACOPLADO_DUPLICADO');
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
  const empresa = await prisma.empresaTransportista.findUnique({ where: { id: newEmpresaId } });
  if (!empresa || empresa.dadorCargaId !== equipo.dadorCargaId) {
    throw createError('Empresa transportista no válida para este dador de carga', 400, 'EMPRESA_INVALIDA');
  }
  return { field: 'empresaTransportista', id: newEmpresaId };
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
    // Obtener stats (incluye _complianceMap precalculado)
    const stats = await this.getComplianceStats(tenantEmpresaId, filters);
    
    // Si hay filtro de compliance, filtrar usando el mapa precalculado
    if (filters.complianceFilter && stats._complianceMap) {
      const filteredIds: number[] = [];
      
      for (const eqId of stats.equipoIds) {
        const state = stats._complianceMap.get(eqId);
        if (!state) continue;
        
        const matches = 
          (filters.complianceFilter === 'faltantes' && state.tieneFaltantes) ||
          (filters.complianceFilter === 'vencidos' && state.tieneVencidos) ||
          (filters.complianceFilter === 'por_vencer' && state.tieneProximos);
        
        if (matches) filteredIds.push(eqId);
      }
      
      if (filteredIds.length === 0) {
        return {
          equipos: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          stats: { total: stats.total, conFaltantes: stats.conFaltantes, conVencidos: stats.conVencidos, conPorVencer: stats.conPorVencer }
        };
      }
      
      // Paginar sobre los IDs filtrados
      const take = Math.min(Math.max(limit, 1), 100);
      const skip = Math.max((page - 1) * take, 0);
      const paginatedIds = filteredIds.slice(skip, skip + take);
      
      const equipos = await prisma.equipo.findMany({
        where: { id: { in: paginatedIds } },
        orderBy: { id: 'asc' },
        include: { 
          clientes: { where: { asignadoHasta: null }, include: { cliente: true } }, 
          dador: true,
          empresaTransportista: true
        }
      });
      
      const totalFiltered = filteredIds.length;
      const totalPages = Math.ceil(totalFiltered / take);
      
      return {
        equipos,
        total: totalFiltered,
        page,
        limit: take,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        stats: { total: stats.total, conFaltantes: stats.conFaltantes, conVencidos: stats.conVencidos, conPorVencer: stats.conPorVencer }
      };
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
        data: { equipoId, action: 'attach', component: getComponent(), originEquipoId: null, payload: updates as any },
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
    } catch {}
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
    // Validar coherencia empresa transportista ↔ dador
    if (input.empresaTransportistaId) {
      const empresa = await prisma.empresaTransportista.findFirst({ where: { id: input.empresaTransportistaId, tenantEmpresaId: input.tenantEmpresaId }, select: { dadorCargaId: true } });
      if (!empresa || empresa.dadorCargaId !== input.dadorCargaId) {
        throw createError('La empresa transportista no pertenece al dador del equipo', 409, 'EMPRESA_MISMATCH');
      }
    }
    // Prevenir duplicados: mismo DNI + patente camión + (patente acoplado opcional) activos/solapados
    const dniNorm = normalizeDni(input.driverDni);
    const truckNorm = normalizePlate(input.truckPlate);
    const trailerNorm = input.trailerPlate ? normalizePlate(input.trailerPlate) : null;

    const existing = await prisma.equipo.findFirst({
      where: {
        tenantEmpresaId: input.tenantEmpresaId,
        dadorCargaId: input.dadorCargaId,
        driverDniNorm: dniNorm,
        truckPlateNorm: truckNorm,
        trailerPlateNorm: trailerNorm,
        OR: [
          { validTo: null },
          { validTo: { gte: input.validFrom } },
        ],
      },
    });

    if (existing) {
      throw createError('Equipo ya existe para este DNI/patentes en vigencia', 409, 'EQUIPO_DUPLICATE');
    }

    // Validar que los componentes no estén en otros equipos activos
    const conflicts: Array<string> = [];
    const driverInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, driverDniNorm: dniNorm, validTo: null } });
    if (driverInUse) conflicts.push(`Chofer en equipo #${driverInUse.id}`);
    const truckInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, truckPlateNorm: truckNorm, validTo: null } });
    if (truckInUse) conflicts.push(`Camión en equipo #${truckInUse.id}`);
    if (trailerNorm) {
      const trailerInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, trailerPlateNorm: trailerNorm, validTo: null } });
      if (trailerInUse) conflicts.push(`Acoplado en equipo #${trailerInUse.id}`);
    }
    if (conflicts.length && !input.forceMove) {
      throw createError(`Componentes ya en uso: ${conflicts.join(', ')}`, 409, 'COMPONENT_IN_USE');
    }

    // Si forceMove, aplicamos la misma política de swap que en attachComponents
    if (conflicts.length && input.forceMove) {
      // Cerrar equipo origen del chofer
      const driverInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, driverDniNorm: dniNorm, validTo: null } });
      if (driverInUse) {
        await prisma.$transaction([
          prisma.equipo.update({ where: { id: driverInUse.id }, data: { validTo: new Date(), estado: 'finalizada' as any } }),
          prisma.equipoHistory.create({ data: { equipoId: driverInUse.id, action: 'close', component: 'driver', originEquipoId: undefined as any, payload: { reason: 'forceMove' } as any } })
        ]);
      }
      // Cerrar equipo origen del camión
      const truckInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, truckPlateNorm: truckNorm, validTo: null } });
      if (truckInUse) {
        await prisma.$transaction([
          prisma.equipo.update({ where: { id: truckInUse.id }, data: { validTo: new Date(), estado: 'finalizada' as any } }),
          prisma.equipoHistory.create({ data: { equipoId: truckInUse.id, action: 'close', component: 'truck', originEquipoId: undefined as any, payload: { reason: 'forceMove' } as any } })
        ]);
      }
      // Desasociar acoplado de su equipo origen
      if (trailerNorm) {
        const trailerInUse = await prisma.equipo.findFirst({ where: { tenantEmpresaId: input.tenantEmpresaId, trailerPlateNorm: trailerNorm, validTo: null } });
        if (trailerInUse) {
          await prisma.$transaction([
            prisma.equipo.update({ where: { id: trailerInUse.id }, data: { trailerId: null, trailerPlateNorm: null } }),
            prisma.equipoHistory.create({ data: { equipoId: trailerInUse.id, action: 'detach', component: 'trailer', originEquipoId: undefined as any, payload: { reason: 'forceMove' } as any } })
          ]);
        }
      }
    }

    const equipo = await prisma.equipo.create({
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
      },
    });
    // Registrar creación
    try { await prisma.equipoHistory.create({ data: { equipoId: equipo.id, action: 'create', component: 'system', originEquipoId: null, payload: { driverDni: dniNorm, truckPlate: truckNorm, trailerPlate: trailerNorm } as any } }); } catch {}
    // Encolar chequeo de faltantes en 15 minutos
    try {
      const { queueService } = await import('./queue.service');
      await queueService.addMissingCheckForEquipo(input.tenantEmpresaId, equipo.id, 15 * 60 * 1000);
    } catch { /* noop */ }
    // Asociar cliente por defecto si existe
    try {
      const { SystemConfigService } = await import('./system-config.service');
      const defIdStr = await SystemConfigService.getConfig(`tenant:${input.tenantEmpresaId}:defaults.defaultClienteId`);
      const defId = defIdStr ? Number(defIdStr) : NaN;
      if (!Number.isNaN(defId)) {
        await this.associateCliente(input.tenantEmpresaId, equipo.id, defId, new Date());
      }
    } catch { /* noop */ }
    return equipo;
  }

  static async update(id: number, data: {
    trailerId?: number | null;
    trailerPlate?: string | null;
    validTo?: Date | null;
    estado?: 'activa' | 'finalizada';
    empresaTransportistaId?: number;
  }) {
    // Validar coherencia empresa transportista ↔ dador
    if (data.empresaTransportistaId !== undefined) {
      const equipo = await prisma.equipo.findUnique({ where: { id }, select: { dadorCargaId: true, tenantEmpresaId: true } });
      if (!equipo) throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
      if (data.empresaTransportistaId && data.empresaTransportistaId !== 0) {
        const empresa = await prisma.empresaTransportista.findFirst({ where: { id: data.empresaTransportistaId, tenantEmpresaId: equipo.tenantEmpresaId }, select: { dadorCargaId: true } });
        if (!empresa || empresa.dadorCargaId !== equipo.dadorCargaId) {
          throw createError('La empresa transportista no pertenece al dador del equipo', 409, 'EMPRESA_MISMATCH');
        }
      }
    }
    // Normalizar trailerPlateNorm
    let trailerPlateNorm: string | null | undefined = undefined;
    if (data.trailerPlate !== undefined) {
      trailerPlateNorm = data.trailerPlate ? normalizePlate(data.trailerPlate) : null;
    }

    // Normalizar empresaTransportistaId (0 significa null)
    let empresaTransportistaIdNorm: number | null | undefined = undefined;
    if (data.empresaTransportistaId !== undefined) {
      empresaTransportistaIdNorm = data.empresaTransportistaId === 0 ? null : data.empresaTransportistaId;
    }

    return prisma.equipo.update({
      where: { id },
      data: {
        trailerId: data.trailerId,
        trailerPlateNorm,
        validTo: data.validTo ?? undefined,
        estado: data.estado as any,
        empresaTransportistaId: empresaTransportistaIdNorm,
      },
    });
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
    } catch {}
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
      } catch {}

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
   * 2. CHOFER (DNI): Si existe, ERROR + ROLLBACK. Si no, crear.
   * 3. CAMIÓN (Patente): Si existe, ERROR + ROLLBACK. Si no, crear.
   * 4. ACOPLADO (Patente): Si existe, ERROR + ROLLBACK. Si no, crear.
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

      // 2. CHOFER: Si existe (por DNI), ERROR. Si no, crear.
      const chofer = await createChoferNoDuplicado(
        tx, ctx, input.choferDni, input.choferNombre, input.choferApellido, input.choferPhones
      );

      // 3. CAMIÓN: Si existe (por Patente), ERROR. Si no, crear.
      const camion = await createCamionNoDuplicado(
        tx, ctx, input.camionPatente, input.camionMarca, input.camionModelo
      );

      // 4. ACOPLADO (Opcional): Si existe (por Patente), ERROR. Si no, crear.
      const acoplado = await createAcopladoNoDuplicado(tx, ctx, input.acopladoPatente, input.acopladoTipo);
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
  }) {
    const equipo = await prisma.equipo.findUnique({
      where: { id: input.equipoId },
      include: { clientes: { where: { asignadoHasta: null } } },
    });

    if (!equipo || equipo.tenantEmpresaId !== input.tenantEmpresaId) {
      throw createError('Equipo no encontrado', 404, 'EQUIPO_NOT_FOUND');
    }

    const updates: any = {};
    const cambios: Array<{ campo: string; anterior: any; nuevo: any }> = [];

    // Validar y acumular cambios de entidades
    if (input.choferId !== undefined) {
      const r = await validateChoferChange(input.choferId, equipo);
      if (r) { updates.driverId = r.id; updates.driverDniNorm = r.norm; cambios.push({ campo: r.field, anterior: equipo.driverId, nuevo: r.id }); }
    }
    if (input.camionId !== undefined) {
      const r = await validateCamionChange(input.camionId, equipo);
      if (r) { updates.truckId = r.id; updates.truckPlateNorm = r.norm; cambios.push({ campo: r.field, anterior: equipo.truckId, nuevo: r.id }); }
    }
    if (input.acopladoId !== undefined) {
      const r = await validateAcopladoChange(input.acopladoId, equipo);
      if (r) { updates.trailerId = r.id; updates.trailerPlateNorm = r.norm ?? null; cambios.push({ campo: r.field, anterior: equipo.trailerId, nuevo: r.id }); }
    }
    if (input.empresaTransportistaId !== undefined) {
      const r = await validateEmpresaChange(input.empresaTransportistaId, equipo);
      if (r) { updates.empresaTransportistaId = r.id; cambios.push({ campo: r.field, anterior: equipo.empresaTransportistaId, nuevo: r.id }); }
    }

    if (Object.keys(updates).length === 0) {
      return equipo;
    }

    // Actualizar equipo
    const updated = await prisma.equipo.update({
      where: { id: input.equipoId },
      data: updates,
    });

    // Registrar auditoría
    for (const cambio of cambios) {
      await AuditService.logEquipoChange({
        equipoId: input.equipoId,
        usuarioId: input.usuarioId,
        accion: 'EDITAR',
        campoModificado: cambio.campo,
        valorAnterior: cambio.anterior,
        valorNuevo: cambio.nuevo,
      });
    }

    // Registrar en historial
    await prisma.equipoHistory.create({
      data: {
        equipoId: input.equipoId,
        action: 'edit',
        component: cambios.map(c => c.campo).join(','),
        payload: { cambios } as any,
      },
    });

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

    // Auditoría
    await AuditService.logEquipoChange({
      equipoId: input.equipoId,
      usuarioId: input.usuarioId,
      accion: 'QUITAR_CLIENTE',
      campoModificado: 'cliente',
      valorAnterior: { clienteId: input.clienteId },
      motivo: exclusiveDocIds.length > 0 ? `${exclusiveDocIds.length} documentos archivados` : undefined,
    });

    return { removed: true, archivedDocuments: exclusiveDocIds.length };
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

    // Obtener todos los requisitos de todos los clientes
    const requisitos = await prisma.clienteDocumentRequirement.findMany({
      where: { clienteId: { in: clienteIds } },
      include: { 
        template: true,
        cliente: { select: { id: true, razonSocial: true } },
      },
    });

    // Consolidar requisitos (mismo template + entityType = un solo requisito)
    const consolidado: Map<string, {
      templateId: number;
      templateName: string;
      entityType: string;
      obligatorio: boolean;
      diasAnticipacion: number;
      requeridoPor: Array<{ clienteId: number; clienteName: string }>;
      documentoActual?: any;
    }> = new Map();

    for (const req of requisitos) {
      const key = `${req.templateId}-${req.entityType}`;
      if (!consolidado.has(key)) {
        consolidado.set(key, {
          templateId: req.templateId,
          templateName: req.template.name,
          entityType: req.entityType,
          obligatorio: req.obligatorio,
          diasAnticipacion: req.diasAnticipacion ?? 30,
          requeridoPor: [],
        });
      }
      const item = consolidado.get(key)!;
      item.requeridoPor.push({ 
        clienteId: req.cliente.id, 
        clienteName: req.cliente.razonSocial,
      });
      if (req.obligatorio) item.obligatorio = true;
    }

    // Buscar documentos actuales para cada requisito
    const resultado = [];
    for (const [, req] of consolidado) {
      const entityId = getEntityIdForType(req.entityType, equipo);
      let documentoActual = null;

      if (entityId) {
        const doc = await prisma.document.findFirst({
          where: { entityType: req.entityType as any, entityId, templateId: req.templateId, archived: false },
          orderBy: { uploadedAt: 'desc' },
        });

        if (doc) {
          const estado = determinarEstadoDocumento(doc, req.diasAnticipacion);
          documentoActual = { id: doc.id, status: doc.status, expiresAt: doc.expiresAt, estado };
        }
      }

      resultado.push({ ...req, entityId, documentoActual, estado: documentoActual?.estado ?? 'FALTANTE' });
    }

    return resultado;
  }
}
