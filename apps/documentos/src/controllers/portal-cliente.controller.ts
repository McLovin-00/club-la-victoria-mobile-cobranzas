import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';
import { ComplianceService, EquipoInfo } from '../services/compliance.service';

// ============================================================================
// HELPERS - Extraídos para reducir complejidad cognitiva
// ============================================================================

interface ParsedQueryParams {
  page: number;
  limit: number;
  search: string;
  estado: string;
}

interface ComplianceState {
  estadoCompliance: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO' | 'INCOMPLETO';
  proximoVencimiento: Date | null;
  tieneVencidos: boolean;
  tieneFaltantes: boolean;
  tieneProximos: boolean;
}

/**
 * Parsea y valida parámetros de query para paginación y filtros
 */
function parseQueryParams(query: Request['query']): ParsedQueryParams {
  return {
    page: Math.max(1, parseInt(query.page as string) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit as string) || 10)),
    search: (query.search as string)?.trim().toLowerCase() || '',
    estado: (query.estado as string) || '',
  };
}

/**
 * Determina el estado de compliance de un equipo
 */
function determineComplianceState(compliance: ReturnType<typeof ComplianceService.evaluateBatchEquiposCliente> extends Promise<infer T> ? T extends Map<number, infer V> ? V : never : never | undefined): ComplianceState {
  const tieneVencidos = compliance?.tieneVencidos ?? false;
  const tieneFaltantes = compliance?.tieneFaltantes ?? false;
  const tieneProximos = compliance?.tieneProximos ?? false;
  
  let estadoCompliance: ComplianceState['estadoCompliance'] = 'VIGENTE';
  let proximoVencimiento: Date | null = null;

  if (tieneVencidos) {
    estadoCompliance = 'VENCIDO';
  } else if (tieneFaltantes) {
    estadoCompliance = 'INCOMPLETO';
  } else if (tieneProximos) {
    estadoCompliance = 'PROXIMO_VENCER';
    const proximos = compliance?.requirements.filter(r => r.state === 'PROXIMO' && r.expiresAt) ?? [];
    if (proximos.length > 0) {
      const fechas = proximos.map(r => new Date(r.expiresAt!));
      // Usar el primer elemento como valor inicial para evitar error en reduce vacío
      proximoVencimiento = fechas.reduce((a, b) => (a < b ? a : b), fechas[0]);
    }
  }

  return { estadoCompliance, proximoVencimiento, tieneVencidos, tieneFaltantes, tieneProximos };
}

/**
 * Normaliza patente para comparación (quita guiones, espacios, pasa a minúsculas)
 */
function normalizarPatente(patente: string | undefined | null): string {
  return (patente || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Verifica si un equipo coincide con los términos de búsqueda
 */
function equipoMatchesSearch(equipo: any, searchTerms: string[]): boolean {
  return searchTerms.some(term => {
    const termNorm = term.replace(/[^a-z0-9]/g, '');
    return (
      equipo.identificador.toLowerCase().includes(term) ||
      normalizarPatente(equipo.camion?.patente).includes(termNorm) ||
      normalizarPatente(equipo.acoplado?.patente).includes(termNorm) ||
      equipo.chofer?.dni?.toLowerCase().includes(term) ||
      equipo.chofer?.nombre?.toLowerCase().includes(term) ||
      equipo.chofer?.apellido?.toLowerCase().includes(term) ||
      equipo.empresaTransportista?.razonSocial?.toLowerCase().includes(term) ||
      equipo.empresaTransportista?.cuit?.includes(term)
    );
  });
}

/**
 * Filtra equipos por estado de compliance
 */
function filterByEstado(equipos: any[], estado: string): any[] {
  if (!estado || estado === 'TODOS') return equipos;
  
  return equipos.filter(eq => {
    switch (estado) {
      case 'PROXIMO_VENCER': return eq._tieneProximos;
      case 'VENCIDO': return eq._tieneVencidos;
      case 'INCOMPLETO': return eq._tieneFaltantes;
      case 'VIGENTE': return !eq._tieneVencidos && !eq._tieneFaltantes && !eq._tieneProximos;
      default: return eq.estadoCompliance === estado;
    }
  });
}

interface DocEstado {
  estado: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO';
  descargable: boolean;
}

/**
 * Calcula el estado y descargabilidad de un documento
 */
function calcularEstadoDocumento(doc: { status: string; expiresAt: Date | null }, now: Date): DocEstado {
  if (doc.status === 'VENCIDO') {
    return { estado: 'VENCIDO', descargable: false };
  }
  if (!doc.expiresAt) {
    return { estado: 'VIGENTE', descargable: true };
  }
  const expires = new Date(doc.expiresAt);
  if (expires < now) {
    return { estado: 'VENCIDO', descargable: false };
  }
  const diasRestantes = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes <= 30) {
    return { estado: 'PROXIMO_VENCER', descargable: true };
  }
  return { estado: 'VIGENTE', descargable: true };
}

interface EntidadesContext {
  chofer: { nombre?: string | null; apellido?: string | null; dni: string } | null;
  camion: { patente: string } | null;
  acoplado: { patente: string } | null;
  empresaTransportista: { razonSocial?: string | null } | null;
}

/**
 * Obtiene el nombre descriptivo de una entidad
 */
function getEntityName(entityType: string, entityId: number, ctx: EntidadesContext): string {
  switch (entityType) {
    case 'CHOFER':
      return ctx.chofer 
        ? `${ctx.chofer.nombre || ''} ${ctx.chofer.apellido || ''} (${ctx.chofer.dni})`.trim() 
        : `Chofer ${entityId}`;
    case 'CAMION':
      return ctx.camion?.patente || `Camión ${entityId}`;
    case 'ACOPLADO':
      return ctx.acoplado?.patente || `Acoplado ${entityId}`;
    case 'EMPRESA_TRANSPORTISTA':
      return ctx.empresaTransportista?.razonSocial || `Empresa ${entityId}`;
    default:
      return `${entityType} ${entityId}`;
  }
}

interface TokenPayload {
  tenantEmpresaId?: number;
  empresaId?: number;
  clienteId?: number;
}

/**
 * Valida un token JWT y extrae el payload
 */
function validateAndDecodeToken(token: string): TokenPayload | null {
  try {
    const jwt = require('jsonwebtoken');
    const fs = require('fs');
    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || '/keys/jwt_public.pem';
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch {
    return null;
  }
}

/**
 * Parsea un filePath para extraer bucket y objectPath
 */
function parseFilePath(filePath: string, tenantId: number): { bucketName: string; objectPath: string } {
  if (filePath.includes('/')) {
    const idx = filePath.indexOf('/');
    return {
      bucketName: filePath.slice(0, idx),
      objectPath: filePath.slice(idx + 1),
    };
  }
  return {
    bucketName: `docs-t${tenantId}`,
    objectPath: filePath,
  };
}

interface EquipoEntities {
  driverId: number;
  truckId: number;
  trailerId: number | null;
  empresaTransportistaId: number | null;
}

type EntityType = 'CHOFER' | 'CAMION' | 'ACOPLADO' | 'EMPRESA_TRANSPORTISTA';

/**
 * Construye las condiciones de entidad para un equipo
 */
function buildEntityConditions(equipo: EquipoEntities): Array<{ entityType: EntityType; entityId: number }> {
  const conditions: Array<{ entityType: EntityType; entityId: number }> = [
    { entityType: 'CHOFER', entityId: equipo.driverId },
    { entityType: 'CAMION', entityId: equipo.truckId },
  ];
  if (equipo.trailerId) {
    conditions.push({ entityType: 'ACOPLADO', entityId: equipo.trailerId });
  }
  if (equipo.empresaTransportistaId) {
    conditions.push({ entityType: 'EMPRESA_TRANSPORTISTA', entityId: equipo.empresaTransportistaId });
  }
  return conditions;
}

interface FolderContext {
  cuitEmpresa: string;
  dniChofer: string;
  patenteCamion: string;
  patenteAcoplado: string;
}

/**
 * Construye los nombres de carpetas para un equipo
 */
function buildFolderNames(ctx: FolderContext): Record<string, string> {
  return {
    'EMPRESA_TRANSPORTISTA': `1_Empresa_Transportista_${ctx.cuitEmpresa}`,
    'CHOFER': `2_Chofer_${ctx.dniChofer}`,
    'CAMION': `3_Tractor_${ctx.patenteCamion}`,
    'ACOPLADO': `4_Semi_Acoplado_${ctx.patenteAcoplado}`,
  };
}

interface EquipoClienteData {
  equipo: any;
  chofer: any;
  camion: any;
  acoplado: any;
  compliance: any;
}

interface EquipoConEstado {
  id: number;
  identificador: string;
  camion: { patente: string; marca: string | null; modelo: string | null } | null;
  acoplado: { patente: string } | null;
  chofer: { nombre: string | null; apellido: string | null; dni: string } | null;
  empresaTransportista: { razonSocial: string; cuit: string | null } | null;
  estadoCompliance: string;
  proximoVencimiento: string | null;
  asignadoDesde: Date;
  _tieneVencidos: boolean;
  _tieneFaltantes: boolean;
  _tieneProximos: boolean;
}

/**
 * Mapea un equipo cliente a su formato con estado de compliance
 */
function mapEquipoConEstado(data: EquipoClienteData, asignadoDesde: Date): EquipoConEstado {
  const { equipo, chofer, camion, acoplado, compliance } = data;
  const complianceState = compliance 
    ? determineComplianceState(compliance) 
    : { estadoCompliance: 'INCOMPLETO', proximoVencimiento: null, tieneVencidos: false, tieneFaltantes: true, tieneProximos: false };
  
  const { estadoCompliance, proximoVencimiento, tieneVencidos, tieneFaltantes, tieneProximos } = complianceState;

  return {
    id: equipo.id,
    identificador: `${camion?.patente || equipo.truckPlateNorm}-${chofer?.dni || equipo.driverDniNorm}`,
    camion: camion ? { patente: camion.patente, marca: camion.marca, modelo: camion.modelo } : null,
    acoplado: acoplado ? { patente: acoplado.patente } : null,
    chofer: chofer ? { nombre: chofer.nombre, apellido: chofer.apellido, dni: chofer.dni } : null,
    empresaTransportista: equipo.empresaTransportista 
      ? { razonSocial: equipo.empresaTransportista.razonSocial, cuit: equipo.empresaTransportista.cuit } 
      : null,
    estadoCompliance,
    proximoVencimiento: proximoVencimiento?.toISOString() || null,
    asignadoDesde,
    _tieneVencidos: tieneVencidos,
    _tieneFaltantes: tieneFaltantes,
    _tieneProximos: tieneProximos,
  };
}

/**
 * Calcula resumen de estados de equipos
 */
function calcularResumenEquipos(equipos: EquipoConEstado[]): Record<string, number> {
  return {
    total: equipos.length,
    vigentes: equipos.filter(e => e.estadoCompliance === 'VIGENTE').length,
    proximosVencer: equipos.filter(e => e._tieneProximos).length,
    vencidos: equipos.filter(e => e._tieneVencidos).length,
    incompletos: equipos.filter(e => e._tieneFaltantes).length,
  };
}

/**
 * Carga entidades relacionadas de un equipo (chofer, camion, acoplado)
 */
async function loadEquipoEntities(equipo: { driverId: number; truckId: number; trailerId: number | null }) {
  const [chofer, camion, acoplado] = await Promise.all([
    prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
    prisma.camion.findUnique({ where: { id: equipo.truckId } }),
    equipo.trailerId ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } }) : null,
  ]);
  return { chofer, camion, acoplado };
}

/**
 * Construye el contexto de carpetas para un equipo
 */
function buildFolderContext(
  equipo: { truckPlateNorm: string | null; trailerPlateNorm: string | null; empresaTransportista: { cuit: string | null } | null },
  camion: { patente: string } | null,
  chofer: { dni: string } | null,
  acoplado: { patente: string } | null
): FolderContext {
  return {
    cuitEmpresa: equipo.empresaTransportista?.cuit?.replace(/\D/g, '') || 'EMPRESA',
    dniChofer: chofer?.dni?.replace(/\D/g, '') || 'CHOFER',
    patenteCamion: (camion?.patente || equipo.truckPlateNorm || 'CAMION').replace(/[^a-zA-Z0-9]/g, '_'),
    patenteAcoplado: (acoplado?.patente || equipo.trailerPlateNorm || 'ACOPLADO').replace(/[^a-zA-Z0-9]/g, '_'),
  };
}

/**
 * Obtiene documentos aprobados para las entidades de un equipo
 */
async function getDocumentosAprobados(
  tenantId: number,
  entityConditions: Array<{ entityType: EntityType; entityId: number }>,
  includeVencidos = false
) {
  const statusFilter = includeVencidos 
    ? ['APROBADO', 'VENCIDO'] as const 
    : ['APROBADO'] as const;
  return prisma.document.findMany({
    where: {
      tenantEmpresaId: tenantId,
      status: { in: statusFilter as any },
      archived: false,
      OR: entityConditions,
    },
    include: { template: true },
    orderBy: { uploadedAt: 'desc' },
  });
}

/**
 * Agrega documentos de un equipo al archivo ZIP
 */
async function appendDocumentsToArchive(
  archive: any,
  documentos: Awaited<ReturnType<typeof getDocumentosAprobados>>,
  tenantId: number,
  patenteCamion: string,
  folderNames: Record<string, string>,
  minioService: any
): Promise<void> {
  for (const doc of documentos) {
    try {
      const { bucketName, objectPath } = parseFilePath(doc.filePath, tenantId);
      const subFolder = folderNames[doc.entityType] || 'otros';
      const stream = await minioService.getObject(bucketName, objectPath);
      const safeTemplateName = doc.template.name.replace(/[^a-zA-Z0-9\s_.-]/g, '_').trim();
      const extension = doc.fileName.split('.').pop() || 'pdf';
      const fileName = `${safeTemplateName}.${extension}`;
      const fullPath = `${patenteCamion}/${subFolder}/${fileName}`;
      archive.append(stream, { name: fullPath });
    } catch (err) {
      AppLogger.warn(`No se pudo agregar doc ${doc.id} al ZIP: ${err}`);
    }
  }
}

/**
 * Verifica acceso del cliente a un equipo
 */
async function verificarAccesoEquipo(equipoId: number, clienteId: number): Promise<boolean> {
  const asignacion = await prisma.equipoCliente.findFirst({
    where: { equipoId, clienteId, asignadoHasta: null },
  });
  return !!asignacion;
}

/**
 * Prepara headers y stream de ZIP para respuesta
 */
async function prepareZipResponse(res: Response, filename: string) {
  const archiver = (await import('archiver')).default;
  const archive = archiver('zip', { zlib: { level: 9 } });
  const { minioService } = await import('../services/minio.service.js');
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  archive.pipe(res);
  
  return { archive, minioService };
}

/**
 * Agrega todos los documentos de un equipo al archivo ZIP
 * Usado por bulk downloads
 */
async function appendEquipoDocumentsToArchive(
  equipo: any,
  tenantId: number,
  archive: any,
  minioService: any
): Promise<void> {
  const { chofer, camion, acoplado } = await loadEquipoEntities(equipo);
  const folderCtx = buildFolderContext(equipo, camion, chofer, acoplado);
  const folderNames = buildFolderNames(folderCtx);
  const entityConditions = buildEntityConditions(equipo);
  
  const documentos = await getDocumentosAprobados(tenantId, entityConditions);
  await appendDocumentsToArchive(archive, documentos, tenantId, folderCtx.patenteCamion, folderNames, minioService);
}

/**
 * Obtiene IDs de equipos de un cliente para descarga, con filtro opcional
 */
async function getEquiposClienteParaDescarga(
  clienteId: number,
  tenantId: number,
  searchTerm?: string
): Promise<number[]> {
  // Obtener asignaciones activas
  const asignaciones = await prisma.equipoCliente.findMany({
    where: { clienteId, asignadoHasta: null, equipo: { activo: true } },
    select: { equipoId: true }
  });
  
  const equiposDelCliente = asignaciones.map(a => a.equipoId);
  if (equiposDelCliente.length === 0) return [];
  
  // Si no hay búsqueda, retornar todos ordenados
  if (!searchTerm) {
    const sorted = [...equiposDelCliente];
    sorted.sort((a, b) => a - b);
    return sorted;
  }
  
  // Filtrar por patente o DNI
  const searchValues = searchTerm.split('|').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
  const equiposFiltrados = await prisma.equipo.findMany({
    where: {
      id: { in: equiposDelCliente },
      tenantEmpresaId: tenantId,
      activo: true,
      OR: [
        { truckPlateNorm: { in: searchValues } },
        { trailerPlateNorm: { in: searchValues } },
        { driverDniNorm: { in: searchValues } },
      ]
    },
    select: { id: true }
  });
  
  const ids = equiposFiltrados.map(e => e.id);
  ids.sort((a, b) => a - b);
  return ids;
}

interface DocFormateado {
  id: number;
  templateName: string;
  entityType: string;
  entityName: string;
  status: string;
  expiresAt: string | null;
  estado: 'VIGENTE' | 'PROXIMO_VENCER' | 'VENCIDO';
  descargable: boolean;
  uploadedAt: string;
}

/**
 * Formatea documentos para respuesta del portal cliente
 */
function formatearDocumentosPortal(
  documentos: any[],
  entidadesCtx: EntidadesContext
): DocFormateado[] {
  const now = new Date();
  const docsPorTemplate = new Map<string, any>();
  
  // Agrupar por template (quedarse con el más reciente)
  for (const doc of documentos) {
    const key = `${doc.entityType}-${doc.entityId}-${doc.templateId}`;
    if (!docsPorTemplate.has(key)) {
      docsPorTemplate.set(key, doc);
    }
  }
  
  return Array.from(docsPorTemplate.values()).map(doc => {
    const { estado, descargable } = calcularEstadoDocumento(doc, now);
    const entityName = getEntityName(doc.entityType, doc.entityId, entidadesCtx);
    return {
      id: doc.id,
      templateName: doc.template.name,
      entityType: doc.entityType,
      entityName,
      status: doc.status,
      expiresAt: doc.expiresAt?.toISOString() || null,
      estado,
      descargable,
      uploadedAt: doc.uploadedAt.toISOString(),
    };
  });
}

/**
 * Calcula resumen de estados de documentos
 */
function calcularResumenDocs(docs: DocFormateado[]): Record<string, number> {
  return {
    total: docs.length,
    vigentes: docs.filter(d => d.estado === 'VIGENTE').length,
    proximosVencer: docs.filter(d => d.estado === 'PROXIMO_VENCER').length,
    vencidos: docs.filter(d => d.estado === 'VENCIDO').length,
  };
}

// ============================================================================

/**
 * Portal Cliente Controller
 * Endpoints de solo lectura para clientes
 * OPTIMIZADO: usa batch compliance para reducir queries de N*M a ~5 queries
 */
export class PortalClienteController {
  /**
   * GET /api/portal-cliente/equipos
   * Lista equipos asignados al cliente autenticado con paginación del lado del servidor
   * Query params: page, limit, search, estado
   * 
   * OPTIMIZACIÓN: Usa batch loading para compliance (~5 queries totales vs N*M anterior)
   */
  static async getEquiposAsignados(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    
    // Parámetros de paginación y filtro (extraído a helper)
    const { page, limit, search, estado } = parseQueryParams(req.query);
    
    const clienteId = (user as any).clienteId || user.empresaId;
    
    if (!clienteId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cliente no identificado' 
      });
    }
    
    try {
      // QUERY 1: Obtener equipos asignados con datos relacionados
      const todosEquiposCliente = await prisma.equipoCliente.findMany({
        where: {
          clienteId,
          asignadoHasta: null,
          equipo: { tenantEmpresaId: tenantId },
        },
        include: {
          equipo: {
            include: {
              empresaTransportista: true,
              dador: true,
            },
          },
        },
      });

      // QUERY 2-4: Cargar choferes, camiones y acoplados en batch
      const choferIds = [...new Set(todosEquiposCliente.map(ec => ec.equipo.driverId))];
      const camionIds = [...new Set(todosEquiposCliente.map(ec => ec.equipo.truckId))];
      const acopladoIds = [...new Set(todosEquiposCliente.map(ec => ec.equipo.trailerId).filter(Boolean))] as number[];

      const [choferes, camiones, acoplados] = await Promise.all([
        prisma.chofer.findMany({ where: { id: { in: choferIds } } }),
        prisma.camion.findMany({ where: { id: { in: camionIds } } }),
        acopladoIds.length > 0 
          ? prisma.acoplado.findMany({ where: { id: { in: acopladoIds } } })
          : Promise.resolve([]),
      ]);

      // Indexar por ID para acceso O(1)
      const choferMap = new Map(choferes.map(c => [c.id, c]));
      const camionMap = new Map(camiones.map(c => [c.id, c]));
      const acopladoMap = new Map(acoplados.map(a => [a.id, a]));

      // QUERY 5: Batch compliance (internamente hace 1-2 queries más)
      const equiposInfo: EquipoInfo[] = todosEquiposCliente.map(ec => ({
        id: ec.equipo.id,
        tenantEmpresaId: ec.equipo.tenantEmpresaId,
        dadorCargaId: ec.equipo.dadorCargaId,
        driverId: ec.equipo.driverId,
        truckId: ec.equipo.truckId,
        trailerId: ec.equipo.trailerId,
        empresaTransportistaId: ec.equipo.empresaTransportistaId,
      }));

      const complianceResults = await ComplianceService.evaluateBatchEquiposCliente(equiposInfo, clienteId);

      // Construir lista de equipos con estado usando helper
      const todosEquiposConEstado = todosEquiposCliente.map(ec => mapEquipoConEstado({
        equipo: ec.equipo,
        chofer: choferMap.get(ec.equipo.driverId),
        camion: camionMap.get(ec.equipo.truckId),
        acoplado: ec.equipo.trailerId ? acopladoMap.get(ec.equipo.trailerId) : null,
        compliance: complianceResults.get(ec.equipo.id),
      }, ec.asignadoDesde));
      
      // Calcular resumen usando helper
      const resumen = calcularResumenEquipos(todosEquiposConEstado);
      
      // Aplicar filtros de búsqueda y estado (usando helpers)
      let equiposFiltrados = todosEquiposConEstado;
      
      if (search) {
        const searchTerms = search.includes('|') 
          ? search.split('|').map(s => s.trim().toLowerCase()).filter(Boolean)
          : [search];
        equiposFiltrados = equiposFiltrados.filter(eq => equipoMatchesSearch(eq, searchTerms));
      }
      
      equiposFiltrados = filterByEstado(equiposFiltrados, estado);
      
      // Paginación
      const total = equiposFiltrados.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const equiposPaginados = equiposFiltrados.slice(offset, offset + limit);
      
      res.json({
        success: true,
        data: {
          equipos: equiposPaginados,
          resumen,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo equipos de cliente:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-cliente/equipos/:id
   * Detalle de equipo con documentos (solo lectura)
   * Incluye documentos vencidos pero marcados como no descargables
   */
  static async getEquipoDetalle(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const equipoId = Number(req.params.id);
    
    const clienteId = (user as any).clienteId || user.empresaId;
    
    if (!clienteId) {
      return res.status(400).json({ success: false, message: 'Cliente no identificado' });
    }
    
    try {
      // Verificar que el equipo está asignado al cliente
      const asignacion = await prisma.equipoCliente.findFirst({
        where: {
          equipoId,
          clienteId,
          asignadoHasta: null,
        },
      });
      
      if (!asignacion) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tiene acceso a este equipo' 
        });
      }
      
      // Obtener equipo con datos
      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
        include: {
          empresaTransportista: true,
          dador: true,
        },
      });
      
      if (!equipo || equipo.tenantEmpresaId !== tenantId) {
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }
      
      // Obtener chofer, camion, acoplado
      const [chofer, camion, acoplado] = await Promise.all([
        prisma.chofer.findUnique({ where: { id: equipo.driverId } }),
        prisma.camion.findUnique({ where: { id: equipo.truckId } }),
        equipo.trailerId 
          ? prisma.acoplado.findUnique({ where: { id: equipo.trailerId } })
          : null,
      ]);
      
      // Obtener TODOS los documentos aprobados y vencidos usando helper
      const entityConditions = buildEntityConditions(equipo);
      
      const documentos = await prisma.document.findMany({
        where: {
          tenantEmpresaId: tenantId,
          status: { in: ['APROBADO', 'VENCIDO'] },
          archived: false,
          OR: entityConditions,
        },
        include: { template: true },
        orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }, { uploadedAt: 'desc' }],
      });
      
      // Formatear documentos usando helper
      const entidadesCtx: EntidadesContext = {
        chofer: chofer ? { nombre: chofer.nombre, apellido: chofer.apellido, dni: chofer.dni } : null,
        camion: camion ? { patente: camion.patente } : null,
        acoplado: acoplado ? { patente: acoplado.patente } : null,
        empresaTransportista: equipo.empresaTransportista ? { razonSocial: equipo.empresaTransportista.razonSocial } : null,
      };
      
      const documentosFormateados = formatearDocumentosPortal(documentos, entidadesCtx);
      const resumenDocs = calcularResumenDocs(documentosFormateados);
      const hayDocumentosDescargables = documentosFormateados.some(d => d.descargable);
      
      return res.json({
        success: true,
        data: {
          equipo: {
            id: equipo.id,
            camion: camion ? { patente: camion.patente, marca: camion.marca, modelo: camion.modelo } : null,
            acoplado: acoplado ? { patente: acoplado.patente, tipo: acoplado.tipo } : null,
            chofer: chofer ? { nombre: chofer.nombre, apellido: chofer.apellido, dni: chofer.dni } : null,
            empresaTransportista: equipo.empresaTransportista 
              ? { razonSocial: equipo.empresaTransportista.razonSocial, cuit: equipo.empresaTransportista.cuit } 
              : null,
            asignadoDesde: asignacion.asignadoDesde,
          },
          documentos: documentosFormateados,
          resumenDocs,
          hayDocumentosDescargables,
        },
      });
    } catch (error) {
      AppLogger.error('Error obteniendo detalle de equipo:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-cliente/equipos/:id/documentos/:docId/download
   * Descargar un documento específico (solo si no está vencido)
   */
  static async downloadDocumento(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const equipoId = Number(req.params.id);
    const docId = Number(req.params.docId);
    
    const clienteId = (user as any).clienteId || user.empresaId;
    
    try {
      // Verificar acceso al equipo
      const asignacion = await prisma.equipoCliente.findFirst({
        where: {
          equipoId,
          clienteId,
          asignadoHasta: null,
        },
      });
      
      if (!asignacion) {
        return res.status(403).json({ success: false, message: 'No tiene acceso' });
      }
      
      // Obtener documento
      const doc = await prisma.document.findUnique({
        where: { id: docId },
      });
      
      if (!doc || doc.tenantEmpresaId !== tenantId || (doc.status !== 'APROBADO' && doc.status !== 'VENCIDO')) {
        return res.status(404).json({ success: false, message: 'Documento no encontrado' });
      }
      
      // Verificar si es vencido
      const esVencido = doc.status === 'VENCIDO' || (doc.expiresAt && new Date(doc.expiresAt) < new Date());
      const esPreview = req.query.preview === 'true';
      
      // Si está vencido y NO es preview, rechazar descarga
      if (esVencido && !esPreview) {
        return res.status(403).json({ 
          success: false, 
          message: 'No se puede descargar un documento vencido' 
        });
      }
      
      // Descargar desde MinIO
      const { minioService } = await import('../services/minio.service.js');
      
      let bucketName: string;
      let objectPath: string;
      
      if (doc.filePath.includes('/')) {
        const idx = doc.filePath.indexOf('/');
        bucketName = doc.filePath.slice(0, idx);
        objectPath = doc.filePath.slice(idx + 1);
      } else {
        bucketName = `docs-t${tenantId}`;
        objectPath = doc.filePath;
      }
      
      const stream = await minioService.getObject(bucketName, objectPath);
      
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      
      (stream as any).pipe(res);
    } catch (error) {
      AppLogger.error('Error descargando documento:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
  
  /**
   * GET /api/portal-cliente/equipos/:id/download-all
   * Descargar ZIP con todos los documentos vigentes del equipo
   */
  static async downloadAllDocumentos(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const equipoId = Number(req.params.id);
    const clienteId = (user as any).clienteId || user.empresaId;
    
    try {
      // Verificar acceso
      if (!await verificarAccesoEquipo(equipoId, clienteId)) {
        return res.status(403).json({ success: false, message: 'No tiene acceso' });
      }
      
      // Obtener equipo
      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
        include: { empresaTransportista: true },
      });
      
      if (!equipo || equipo.tenantEmpresaId !== tenantId) {
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }
      
      // Cargar entidades relacionadas
      const { chofer, camion, acoplado } = await loadEquipoEntities(equipo);
      
      // Obtener documentos
      const entityConditions = buildEntityConditions(equipo);
      const documentos = await getDocumentosAprobados(tenantId, entityConditions);
      
      // Filtrar solo vigentes
      const now = new Date();
      const documentosVigentes = documentos.filter(doc => !doc.expiresAt || new Date(doc.expiresAt) >= now);
      
      if (documentosVigentes.length === 0) {
        return res.status(404).json({ success: false, message: 'No hay documentos vigentes para descargar' });
      }
      
      // Preparar carpetas y ZIP
      const folderCtx = buildFolderContext(equipo, camion, chofer, acoplado);
      const folderNames = buildFolderNames(folderCtx);
      const { archive, minioService } = await prepareZipResponse(res, `${folderCtx.patenteCamion}_documentacion.zip`);
      
      // Agregar documentos al ZIP
      await appendDocumentsToArchive(archive, documentosVigentes, tenantId, folderCtx.patenteCamion, folderNames, minioService);
      await archive.finalize();
    } catch (error) {
      AppLogger.error('Error generando ZIP:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error interno' });
      }
    }
  }
  
  /**
   * POST /api/portal-cliente/equipos/bulk-download
   * Descarga ZIP de múltiples equipos asignados al cliente
   */
  static async bulkDownloadDocumentos(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const clienteId = (user as any).clienteId || user.empresaId;
    
    if (!clienteId) {
      return res.status(400).json({ success: false, message: 'Cliente no identificado' });
    }
    
    const equipoIds: number[] = req.body.equipoIds || [];
    if (!equipoIds.length) {
      return res.status(400).json({ success: false, message: 'Debe especificar equipoIds' });
    }
    
    try {
      // Verificar acceso a equipos
      const asignaciones = await prisma.equipoCliente.findMany({
        where: { clienteId, equipoId: { in: equipoIds }, asignadoHasta: null },
        select: { equipoId: true }
      });
      
      const equiposPermitidos = asignaciones.map(a => a.equipoId);
      equiposPermitidos.sort((a, b) => a - b);
      if (equiposPermitidos.length === 0) {
        return res.status(403).json({ success: false, message: 'No tiene acceso a estos equipos' });
      }
      
      // Obtener equipos activos
      const equipos = await prisma.equipo.findMany({
        where: { id: { in: equiposPermitidos }, tenantEmpresaId: tenantId, activo: true },
        include: { empresaTransportista: true }
      });
      
      // Preparar ZIP
      const { archive, minioService } = await prepareZipResponse(res, `documentos_${equiposPermitidos.length}_equipos.zip`);
      
      // Procesar cada equipo
      for (const equipo of equipos) {
        await appendEquipoDocumentsToArchive(equipo, tenantId, archive, minioService);
      }
      
      await archive.finalize();
    } catch (error) {
      AppLogger.error('Error generando ZIP masivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error interno' });
      }
    }
  }
  
  /**
   * POST /api/portal-cliente/equipos/bulk-download-form
   * Endpoint para descarga via formulario (valida JWT desde body)
   */
  static async bulkDownloadForm(req: Request, res: Response) {
    try {
      // Validar token
      const token = req.body.token;
      if (!token) return res.status(401).send('Token requerido');
      
      const decoded = validateAndDecodeToken(token);
      if (!decoded) return res.status(401).send('Token inválido');
      
      const tenantId = decoded.tenantEmpresaId || decoded.empresaId || 1;
      const clienteId = decoded.clienteId || decoded.empresaId;
      if (!clienteId) return res.status(400).send('Cliente no identificado');
      
      // Obtener equipos del cliente
      const equipoIds = await getEquiposClienteParaDescarga(clienteId, tenantId, req.body.searchTerm);
      if (equipoIds.length === 0) return res.status(404).send('No se encontraron equipos');
      
      // Limitar y obtener equipos
      const equiposLimitados = equipoIds.slice(0, 200);
      const equipos = await prisma.equipo.findMany({
        where: { id: { in: equiposLimitados }, tenantEmpresaId: tenantId, activo: true },
        include: { empresaTransportista: true }
      });
      
      // Preparar y generar ZIP
      const { archive, minioService } = await prepareZipResponse(res, `documentos_${equiposLimitados.length}_equipos.zip`);
      
      for (const equipo of equipos) {
        await appendEquipoDocumentsToArchive(equipo, tenantId, archive, minioService);
      }
      
      await archive.finalize();
    } catch (error) {
      AppLogger.error('Error en bulkDownloadForm:', error);
      if (!res.headersSent) res.status(500).send('Error interno');
    }
  }
}
