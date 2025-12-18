import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { minioService } from './minio.service';
import { queueService } from './queue.service';
import { FlowiseRemitoResponse } from '../types';
import type { Remito, RemitoImagen, RemitoHistory } from '../../node_modules/.prisma/remitos';

// Helper para crear Decimal
const toDecimal = (val: number | null): any => {
  if (val === null) return null;
  // Prisma acepta number para Decimal en input
  return val;
};

export interface CreateRemitoInput {
  tenantEmpresaId: number;
  dadorCargaId: number;
  cargadoPorUserId: number;
  cargadoPorRol: string;
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

export class RemitoService {
  
  /**
   * Crear remito con imagen
   */
  static async create(
    input: CreateRemitoInput,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ): Promise<{ remito: Remito; imagen: RemitoImagen }> {
    const prisma = db.getClient();
    
    // Crear remito en estado PENDIENTE_ANALISIS
    const remito = await prisma.remito.create({
      data: {
        tenantEmpresaId: input.tenantEmpresaId,
        dadorCargaId: input.dadorCargaId,
        cargadoPorUserId: input.cargadoPorUserId,
        cargadoPorRol: input.cargadoPorRol,
        estado: 'PENDIENTE_ANALISIS',
      },
    });
    
    // Subir imagen a MinIO
    const { bucketName, objectKey } = await minioService.uploadRemitoImage(
      input.tenantEmpresaId,
      remito.id,
      file.originalname,
      file.buffer,
      file.mimetype
    );
    
    // Crear registro de imagen
    const imagen = await prisma.remitoImagen.create({
      data: {
        remitoId: remito.id,
        bucketName,
        objectKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        tipo: 'REMITO_PRINCIPAL',
        orden: 1,
      },
    });
    
    // Registrar en historial
    await prisma.remitoHistory.create({
      data: {
        remitoId: remito.id,
        action: 'CREADO',
        userId: input.cargadoPorUserId,
        userRole: input.cargadoPorRol,
        payload: { imagenId: imagen.id },
      },
    });
    
    // Encolar análisis IA
    await queueService.addAnalysisJob({
      remitoId: remito.id,
      imagenId: imagen.id,
      tenantEmpresaId: input.tenantEmpresaId,
      bucketName,
      objectKey,
    });
    
    AppLogger.info('📝 Remito creado y encolado para análisis', { id: remito.id });
    
    return { remito, imagen };
  }
  
  /**
   * Listar remitos con filtros
   */
  static async list(filters: RemitoFilters): Promise<{
    items: (Remito & { imagenes: RemitoImagen[] })[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const prisma = db.getClient();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (filters.tenantEmpresaId) {
      where.tenantEmpresaId = filters.tenantEmpresaId;
    }
    
    if (filters.dadorCargaId) {
      where.dadorCargaId = filters.dadorCargaId;
    }
    
    if (filters.estado) {
      where.estado = filters.estado;
    }
    
    if (filters.numeroRemito) {
      where.numeroRemito = { contains: filters.numeroRemito, mode: 'insensitive' };
    }
    
    if (filters.fechaDesde || filters.fechaHasta) {
      where.createdAt = {};
      if (filters.fechaDesde) where.createdAt.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.createdAt.lte = filters.fechaHasta;
    }
    
    // Filtro por rol: CHOFER/TRANSPORTISTA/DADOR solo ven los suyos
    if (filters.userRole && !['SUPERADMIN', 'ADMIN_INTERNO'].includes(filters.userRole)) {
      where.cargadoPorUserId = filters.userId;
    }
    
    const [items, total] = await Promise.all([
      prisma.remito.findMany({
        where,
        include: {
          imagenes: { take: 1, orderBy: { orden: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.remito.count({ where }),
    ]);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Obtener remito por ID
   */
  static async getById(id: number, userId?: number, userRole?: string): Promise<(Remito & { imagenes: RemitoImagen[]; historial: RemitoHistory[] }) | null> {
    const prisma = db.getClient();
    
    const remito = await prisma.remito.findUnique({
      where: { id },
      include: {
        imagenes: { orderBy: { orden: 'asc' } },
        historial: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    
    if (!remito) return null;
    
    // Verificar permisos
    if (userRole && !['SUPERADMIN', 'ADMIN_INTERNO'].includes(userRole)) {
      if (remito.cargadoPorUserId !== userId) {
        return null;
      }
    }
    
    return remito;
  }
  
  /**
   * Actualizar datos del remito (post-análisis o edición manual)
   */
  static async updateFromAnalysis(id: number, data: FlowiseRemitoResponse) {
    const prisma = db.getClient();
    
    const parseDate = (str: string | null): Date | null => {
      if (!str) return null;
      const parts = str.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      return null;
    };
    
    await prisma.remito.update({
      where: { id },
      data: {
        numeroRemito: data.numeroRemito,
        fechaOperacion: parseDate(data.fechaOperacion),
        emisorNombre: data.emisor.nombre,
        emisorDetalle: data.emisor.detalle,
        clienteNombre: data.cliente,
        producto: data.producto,
        transportistaNombre: data.transportista,
        choferNombre: data.chofer.nombre,
        choferDni: data.chofer.dni,
        patenteChasis: data.patentes.chasis,
        patenteAcoplado: data.patentes.acoplado,
        pesoOrigenBruto: data.pesosOrigen.bruto,
        pesoOrigenTara: data.pesosOrigen.tara,
        pesoOrigenNeto: data.pesosOrigen.neto,
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
      data: {
        estado: 'APROBADO',
        aprobadoPorUserId: userId,
        aprobadoAt: new Date(),
      },
    });
    
    await prisma.remitoHistory.create({
      data: {
        remitoId: id,
        action: 'APROBADO',
        userId,
        userRole: 'ADMIN_INTERNO',
      },
    });
    
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
      data: {
        estado: 'RECHAZADO',
        rechazadoPorUserId: userId,
        rechazadoAt: new Date(),
        motivoRechazo: motivo,
      },
    });
    
    await prisma.remitoHistory.create({
      data: {
        remitoId: id,
        action: 'RECHAZADO',
        userId,
        userRole: 'ADMIN_INTERNO',
        payload: { motivo },
      },
    });
    
    AppLogger.info('❌ Remito rechazado', { id, userId, motivo });
    return remito;
  }
  
  /**
   * Estadísticas de remitos
   */
  static async getStats(tenantEmpresaId: number, dadorCargaId?: number) {
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
}

