import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { minioService } from './minio.service';
import { queueService } from './queue.service';
import { FlowiseRemitoResponse } from '../types';
import type { Remito, RemitoImagen, RemitoHistory } from '../../node_modules/.prisma/remitos';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateRemitoInput {
  tenantEmpresaId: number;
  dadorCargaId: number;
  cargadoPorUserId: number;
  cargadoPorRol: string;
  choferId?: number;
}

export interface RemitoFileInput {
  pdfBuffer: Buffer;
  originalInputs: Array<{ buffer: Buffer; mimeType: string; fileName: string }>;
  fileName: string;
}

export interface RemitoFilters {
  tenantEmpresaId?: number;
  dadorCargaId?: number;
  estado?: string;
  userId?: number;
  userRole?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  numeroRemito?: string;
  page?: number;
  limit?: number;
}

interface RemitoStats {
  total: number;
  pendientes: number;
  aprobados: number;
  rechazados: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function parseDate(str: string | null): Date | null {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function extractString(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.nombre || val.descripcion || val.detalle || (Object.values(val).find((v) => typeof v === 'string') as string) || null;
  }
  return String(val);
}

function buildBaseWhere(filters: RemitoFilters): any {
  const where: any = {};

  if (filters.tenantEmpresaId) where.tenantEmpresaId = filters.tenantEmpresaId;
  if (filters.dadorCargaId) where.dadorCargaId = filters.dadorCargaId;
  if (filters.numeroRemito) where.numeroRemito = { contains: filters.numeroRemito, mode: 'insensitive' };

  if (filters.fechaDesde || filters.fechaHasta) {
    where.createdAt = {};
    if (filters.fechaDesde) where.createdAt.gte = filters.fechaDesde;
    if (filters.fechaHasta) where.createdAt.lte = filters.fechaHasta;
  }

  if (filters.userRole && !['SUPERADMIN', 'ADMIN_INTERNO'].includes(filters.userRole)) {
    where.cargadoPorUserId = filters.userId;
  }

  return where;
}

function calculateStatsFromGroup(statsGroup: any[]): RemitoStats {
  const stats: RemitoStats = { total: 0, pendientes: 0, aprobados: 0, rechazados: 0 };

  for (const group of statsGroup) {
    const count = group._count.id;
    stats.total += count;

    if (group.estado === 'PENDIENTE_APROBACION') stats.pendientes = count;
    else if (group.estado === 'APROBADO') stats.aprobados = count;
    else if (group.estado === 'RECHAZADO') stats.rechazados = count;
  }

  return stats;
}

async function uploadAdditionalImages(
  tenantEmpresaId: number,
  remitoId: number,
  originalInputs: RemitoFileInput['originalInputs']
): Promise<RemitoImagen[]> {
  const prisma = db.getClient();
  const imagenes: RemitoImagen[] = [];

  for (let i = 0; i < originalInputs.length; i++) {
    const orig = originalInputs[i];
    const { bucketName, objectKey } = await minioService.uploadRemitoImage(
      tenantEmpresaId,
      remitoId,
      `original_${i + 1}_${orig.fileName}`,
      orig.buffer,
      orig.mimeType
    );

    const imgAdicional = await prisma.remitoImagen.create({
      data: {
        remitoId,
        bucketName,
        objectKey,
        fileName: orig.fileName,
        mimeType: orig.mimeType,
        size: orig.buffer.length,
        tipo: 'ADICIONAL',
        orden: i + 2,
      },
    });
    imagenes.push(imgAdicional);
  }

  return imagenes;
}

async function logRemitoHistory(remitoId: number, action: string, userId: number, userRole: string, payload?: any): Promise<void> {
  await db.getClient().remitoHistory.create({
    data: { remitoId, action, userId, userRole, payload },
  });
}

// ============================================================================
// SERVICE
// ============================================================================

export class RemitoService {
  /**
   * Crear remito con imagen(es)
   */
  static async create(input: CreateRemitoInput, file: RemitoFileInput): Promise<{ remito: Remito; imagenes: RemitoImagen[] }> {
    const prisma = db.getClient();

    const remito = await prisma.remito.create({
      data: {
        tenantEmpresaId: input.tenantEmpresaId,
        dadorCargaId: input.dadorCargaId,
        cargadoPorUserId: input.cargadoPorUserId,
        cargadoPorRol: input.cargadoPorRol,
        choferId: input.choferId,
        estado: 'PENDIENTE_ANALISIS',
      },
    });

    const { bucketName, objectKey } = await minioService.uploadRemitoImage(
      input.tenantEmpresaId,
      remito.id,
      file.fileName,
      file.pdfBuffer,
      'application/pdf'
    );

    const imagenPrincipal = await prisma.remitoImagen.create({
      data: {
        remitoId: remito.id,
        bucketName,
        objectKey,
        fileName: file.fileName,
        mimeType: 'application/pdf',
        size: file.pdfBuffer.length,
        tipo: 'REMITO_PRINCIPAL',
        orden: 1,
      },
    });

    const imagenes: RemitoImagen[] = [imagenPrincipal];

    if (file.originalInputs.length > 1) {
      const adicionales = await uploadAdditionalImages(input.tenantEmpresaId, remito.id, file.originalInputs);
      imagenes.push(...adicionales);
    }

    await logRemitoHistory(remito.id, 'CREADO', input.cargadoPorUserId, input.cargadoPorRol, {
      imagenesCount: imagenes.length,
      fileName: file.fileName,
    });

    await queueService.addAnalysisJob({
      remitoId: remito.id,
      imagenId: imagenPrincipal.id,
      tenantEmpresaId: input.tenantEmpresaId,
      bucketName: imagenPrincipal.bucketName,
      objectKey: imagenPrincipal.objectKey,
      originalInputsCount: file.originalInputs.length,
    });

    AppLogger.info('📝 Remito creado y encolado para análisis', { id: remito.id, imagenes: imagenes.length });
    return { remito, imagenes };
  }

  /**
   * Listar remitos con filtros + stats
   */
  static async list(
    filters: RemitoFilters
  ): Promise<{
    items: (Remito & { imagenes: RemitoImagen[] })[];
    pagination: { page: number; limit: number; total: number; pages: number };
    stats: RemitoStats;
  }> {
    const prisma = db.getClient();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const whereBase = buildBaseWhere(filters);
    const whereList = { ...whereBase };
    if (filters.estado) whereList.estado = filters.estado;

    const [items, countFiltered, statsGroup] = await Promise.all([
      prisma.remito.findMany({
        where: whereList,
        include: { imagenes: { take: 1, orderBy: { orden: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.remito.count({ where: whereList }),
      prisma.remito.groupBy({ by: ['estado'], where: whereBase, _count: { id: true } }),
    ]);

    return {
      items,
      pagination: { page, limit, total: countFiltered, pages: Math.ceil(countFiltered / limit) },
      stats: calculateStatsFromGroup(statsGroup),
    };
  }

  /**
   * Obtener remito por ID
   */
  static async getById(id: number, userId?: number, userRole?: string): Promise<(Remito & { imagenes: RemitoImagen[]; historial: RemitoHistory[] }) | null> {
    const prisma = db.getClient();

    const remito = await prisma.remito.findUnique({
      where: { id },
      include: { imagenes: { orderBy: { orden: 'asc' } }, historial: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });

    if (!remito) return null;

    if (userRole && !['SUPERADMIN', 'ADMIN_INTERNO'].includes(userRole) && remito.cargadoPorUserId !== userId) {
      return null;
    }

    return remito;
  }

  /**
   * Actualizar datos del remito (post-análisis)
   */
  static async updateFromAnalysis(id: number, data: FlowiseRemitoResponse): Promise<void> {
    const prisma = db.getClient();

    await prisma.remito.update({
      where: { id },
      data: {
        numeroRemito: data.numeroRemito,
        fechaOperacion: parseDate(data.fechaOperacion),
        emisorNombre: data.emisor?.nombre || extractString(data.emisor),
        emisorDetalle: data.emisor?.detalle || null,
        clienteNombre: extractString(data.cliente),
        producto: extractString(data.producto),
        transportistaNombre: extractString(data.transportista),
        choferNombre: data.chofer?.nombre || extractString(data.chofer),
        choferDni: data.chofer?.dni || null,
        patenteChasis: data.patentes?.chasis || null,
        patenteAcoplado: data.patentes?.acoplado || null,
        pesoOrigenBruto: data.pesosOrigen?.bruto ?? null,
        pesoOrigenTara: data.pesosOrigen?.tara ?? null,
        pesoOrigenNeto: data.pesosOrigen?.neto ?? null,
        pesoDestinoBruto: data.pesosDestino?.bruto ?? null,
        pesoDestinoTara: data.pesosDestino?.tara ?? null,
        pesoDestinoNeto: data.pesosDestino?.neto ?? null,
        tieneTicketDestino: data.pesosDestino !== null,
        datosOriginalesIA: data as any,
        confianzaIA: data.confianza,
        camposDetectados: data.camposDetectados,
        erroresAnalisis: data.errores,
        analizadoAt: new Date(),
        estado: 'PENDIENTE_APROBACION',
      },
    });

    AppLogger.info('📊 Remito actualizado con datos de IA', { id, confianza: data.confianza });
  }

  /**
   * Aprobar remito
   */
  static async approve(id: number, userId: number): Promise<Remito> {
    const prisma = db.getClient();

    const remito = await prisma.remito.update({
      where: { id },
      data: { estado: 'APROBADO', aprobadoPorUserId: userId, aprobadoAt: new Date() },
    });

    await logRemitoHistory(id, 'APROBADO', userId, 'ADMIN_INTERNO');
    AppLogger.info('✅ Remito aprobado', { id, userId });
    return remito;
  }

  /**
   * Rechazar remito
   */
  static async reject(id: number, userId: number, motivo: string): Promise<Remito> {
    const prisma = db.getClient();

    const remito = await prisma.remito.update({
      where: { id },
      data: { estado: 'RECHAZADO', rechazadoPorUserId: userId, rechazadoAt: new Date(), motivoRechazo: motivo },
    });

    await logRemitoHistory(id, 'RECHAZADO', userId, 'ADMIN_INTERNO', { motivo });
    AppLogger.info('❌ Remito rechazado', { id, userId, motivo });
    return remito;
  }

  /**
   * Estadísticas de remitos
   */
  static async getStats(tenantEmpresaId: number, dadorCargaId?: number): Promise<RemitoStats> {
    const prisma = db.getClient();
    const where: any = { tenantEmpresaId };
    if (dadorCargaId) where.dadorCargaId = dadorCargaId;

    const [total, pendientes, aprobados, rechazados] = await Promise.all([
      prisma.remito.count({ where }),
      prisma.remito.count({ where: { ...where, estado: 'PENDIENTE_APROBACION' } }),
      prisma.remito.count({ where: { ...where, estado: 'APROBADO' } }),
      prisma.remito.count({ where: { ...where, estado: 'RECHAZADO' } }),
    ]);

    return { total, pendientes, aprobados, rechazados };
  }

  /**
   * Reprocesar remito con IA
   */
  static async reprocess(id: number, userId: number): Promise<{ id: number; estado: string; jobId: string }> {
    const prisma = db.getClient();

    const remito = await prisma.remito.findUnique({
      where: { id },
      include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 } },
    });

    if (!remito) throw new Error('Remito no encontrado');
    if (remito.estado === 'APROBADO') throw new Error('No se puede reprocesar un remito aprobado');

    const imagenPrincipal = remito.imagenes[0];
    if (!imagenPrincipal) throw new Error('No se encontró imagen del remito');

    await prisma.remito.update({ where: { id }, data: { estado: 'PENDIENTE_ANALISIS', erroresAnalisis: [] } });
    await logRemitoHistory(id, 'REPROCESAR_SOLICITADO', userId, 'ADMIN_INTERNO');

    const jobId = await queueService.addAnalysisJob({
      remitoId: remito.id,
      imagenId: imagenPrincipal.id,
      tenantEmpresaId: remito.tenantEmpresaId,
      bucketName: imagenPrincipal.bucketName,
      objectKey: imagenPrincipal.objectKey,
      originalInputsCount: 1,
    });

    AppLogger.info('🔄 Remito encolado para reprocesamiento', { id, userId, jobId });
    return { id, estado: 'PENDIENTE_ANALISIS', jobId };
  }
}
