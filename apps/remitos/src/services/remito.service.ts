import { db } from '../config/database';
import { AppLogger } from '../config/logger';
import { minioService } from './minio.service';
import { queueService } from './queue.service';
import { FlowiseRemitoResponse } from '../types';
import type { Remito, RemitoImagen, RemitoHistory } from '../../node_modules/.prisma/remitos';

export interface CreateRemitoInput {
  tenantEmpresaId: number;
  dadorCargaId: number;
  cargadoPorUserId: number;
  cargadoPorRol: string;
}

export interface RemitoFileInput {
  pdfBuffer: Buffer;  // PDF final para almacenar
  originalInputs: Array<{ buffer: Buffer; mimeType: string; fileName: string }>;  // Inputs originales para análisis
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

export class RemitoService {
  
  /**
   * Crear remito con imagen(es)
   * Acepta múltiples imágenes compuestas en PDF o un PDF único
   */
  static async create(
    input: CreateRemitoInput,
    file: RemitoFileInput
  ): Promise<{ remito: Remito; imagenes: RemitoImagen[] }> {
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
    
    // Subir PDF final a MinIO (documento almacenado)
    const { bucketName, objectKey } = await minioService.uploadRemitoImage(
      input.tenantEmpresaId,
      remito.id,
      file.fileName,
      file.pdfBuffer,
      'application/pdf'
    );
    
    // Crear registro de imagen principal (el PDF)
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
    
    // Si hay múltiples inputs originales, guardarlos como imágenes adicionales para análisis
    if (file.originalInputs.length > 1) {
      for (let i = 0; i < file.originalInputs.length; i++) {
        const orig = file.originalInputs[i];
        const { bucketName: bk, objectKey: ok } = await minioService.uploadRemitoImage(
          input.tenantEmpresaId,
          remito.id,
          `original_${i + 1}_${orig.fileName}`,
          orig.buffer,
          orig.mimeType
        );
        
        const imgAdicional = await prisma.remitoImagen.create({
          data: {
            remitoId: remito.id,
            bucketName: bk,
            objectKey: ok,
            fileName: orig.fileName,
            mimeType: orig.mimeType,
            size: orig.buffer.length,
            tipo: 'ADICIONAL',
            orden: i + 2,
          },
        });
        imagenes.push(imgAdicional);
      }
    }
    
    // Registrar en historial
    await prisma.remitoHistory.create({
      data: {
        remitoId: remito.id,
        action: 'CREADO',
        userId: input.cargadoPorUserId,
        userRole: input.cargadoPorRol,
        payload: { 
          imagenesCount: imagenes.length,
          fileName: file.fileName,
        },
      },
    });
    
    // Encolar análisis IA (usar primera imagen o el PDF)
    await queueService.addAnalysisJob({
      remitoId: remito.id,
      imagenId: imagenPrincipal.id,
      tenantEmpresaId: input.tenantEmpresaId,
      bucketName: imagenPrincipal.bucketName,
      objectKey: imagenPrincipal.objectKey,
      // Incluir todos los inputs originales para análisis
      originalInputsCount: file.originalInputs.length,
    });
    
    AppLogger.info('📝 Remito creado y encolado para análisis', { 
      id: remito.id, 
      imagenes: imagenes.length 
    });
    
    return { remito, imagenes };
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
  static async updateFromAnalysis(id: number, data: FlowiseRemitoResponse): Promise<void> {
    const prisma = db.getClient();
    
    const parseDate = (str: string | null): Date | null => {
      if (!str) return null;
      // Intentar formato DD/MM/YYYY
      const parts = str.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      // Intentar ISO
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };
    
    // Extraer string de campos que pueden venir como objetos
    const extractString = (val: any): string | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        // Priorizar: nombre > descripcion > el primer valor string
        return val.nombre || val.descripcion || val.detalle || 
               Object.values(val).find(v => typeof v === 'string') as string || null;
      }
      return String(val);
    };
    
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
  static async getStats(tenantEmpresaId: number, dadorCargaId?: number): Promise<{
    total: number;
    pendientes: number;
    aprobados: number;
    rechazados: number;
  }> {
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
   * Solo para remitos con estado ERROR_ANALISIS, PENDIENTE_ANALISIS o PENDIENTE_APROBACION
   */
  static async reprocess(id: number, userId: number): Promise<{ id: number; estado: string; jobId: string }> {
    const prisma = db.getClient();
    
    const remito = await prisma.remito.findUnique({
      where: { id },
      include: {
        imagenes: { orderBy: { orden: 'asc' }, take: 1 },
      },
    });
    
    if (!remito) {
      throw new Error('Remito no encontrado');
    }
    
    // Solo reprocesar si no está aprobado
    if (remito.estado === 'APROBADO') {
      throw new Error('No se puede reprocesar un remito aprobado');
    }
    
    const imagenPrincipal = remito.imagenes[0];
    if (!imagenPrincipal) {
      throw new Error('No se encontró imagen del remito');
    }
    
    // Actualizar estado a PENDIENTE_ANALISIS
    await prisma.remito.update({
      where: { id },
      data: { 
        estado: 'PENDIENTE_ANALISIS',
        erroresAnalisis: [],
      },
    });
    
    // Registrar en historial
    await prisma.remitoHistory.create({
      data: {
        remitoId: id,
        action: 'REPROCESAR_SOLICITADO',
        userId,
        userRole: 'ADMIN_INTERNO',
      },
    });
    
    // Encolar análisis
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
