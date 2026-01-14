import { Response } from 'express';
import { AuthRequest } from '../types';
import { RemitoService } from '../services/remito.service';
import { minioService } from '../services/minio.service';
import { MediaService } from '../services/media.service';
import { createError } from '../middlewares/error.middleware';
import { AppLogger } from '../config/logger';
import { parseParamId } from '../utils/params';

// ============================================================================
// HELPERS
// ============================================================================

interface FileInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

function getFilesFromMulter(req: any): Express.Multer.File[] {
  return Array.isArray(req.files?.imagenes)
    ? req.files.imagenes
    : Array.isArray(req.files)
      ? req.files
      : req.file
        ? [req.file]
        : [];
}

function getBase64Inputs(body: any): string[] {
  const base64Raw = body.documentsBase64;
  return Array.isArray(base64Raw)
    ? base64Raw
    : typeof base64Raw === 'string' && base64Raw
      ? [base64Raw]
      : [];
}

/** Convierte valor de peso a número o undefined (para updates parciales) */
function parseWeight(value: any): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return Number(value);
}

function buildInputs(filesFromMulter: Express.Multer.File[], base64Inputs: string[]): FileInput[] {
  const inputs: FileInput[] = [];

  for (const f of filesFromMulter) {
    inputs.push({ buffer: f.buffer, mimeType: f.mimetype, fileName: f.originalname });
  }

  for (const b64 of base64Inputs) {
    try {
      const decoded = MediaService.decodeDataUrl(b64);
      inputs.push({ ...decoded, fileName: decoded.fileName || 'capture.jpg' });
    } catch {
      throw createError('Base64 inválido', 400, 'INVALID_BASE64');
    }
  }

  return inputs;
}

function validateInputs(inputs: FileInput[]): void {
  if (inputs.length === 0) {
    throw createError('Se requiere al menos una imagen o PDF', 400, 'FILE_REQUIRED');
  }

  const hasPdf = inputs.some((i) => MediaService.isPdf(i.mimeType));
  const hasImages = inputs.some((i) => MediaService.isImage(i.mimeType));

  if (hasPdf && hasImages) {
    throw createError('No se puede mezclar PDF con imágenes', 400, 'MIXED_INPUT_ERROR');
  }

  if (hasPdf && inputs.length > 1) {
    throw createError('Solo se permite un PDF por remito', 400, 'MULTIPLE_PDF_ERROR');
  }
}

async function preparePdfBuffer(inputs: FileInput[]): Promise<Buffer> {
  const hasPdf = inputs.some((i) => MediaService.isPdf(i.mimeType));
  if (hasPdf) {
    return inputs[0].buffer;
  }

  const mediaInputs = inputs.map((i) => ({
    buffer: i.buffer,
    mimeType: i.mimeType,
    fileName: i.fileName,
  }));
  return MediaService.composePdfFromImages(mediaInputs);
}

function getChoferId(req: AuthRequest): number | undefined {
  if (req.user?.role === 'CHOFER' && req.user?.choferId) {
    return req.user.choferId;
  }
  if (req.body.choferId) {
    return parseInt(req.body.choferId as string);
  }
  return undefined;
}

interface ChoferCargadorData {
  choferCargadorDni?: string;
  choferCargadorNombre?: string;
  choferCargadorApellido?: string;
}

function getChoferCargadorData(req: AuthRequest): ChoferCargadorData {
  // Si es un chofer, usar sus propios datos del token
  if (req.user?.role === 'CHOFER') {
    return {
      choferCargadorDni: req.user.choferDni || undefined,
      choferCargadorNombre: req.user.choferNombre || undefined,
      choferCargadorApellido: req.user.choferApellido || undefined,
    };
  }
  
  // Si es admin/transportista/dador, usar los datos del chofer seleccionado
  return {
    choferCargadorDni: req.body.choferDni || undefined,
    choferCargadorNombre: req.body.choferNombre || undefined,
    choferCargadorApellido: req.body.choferApellido || undefined,
  };
}

function sendError(res: Response, error: any): void {
  AppLogger.error('Error en RemitosController:', error);
  const status = error.statusCode || 500;
  res.status(status).json({
    success: false,
    error: error.code || 'ERROR',
    message: error.message,
  });
}

// ============================================================================
// CONTROLLER
// ============================================================================

export class RemitosController {
  /**
   * POST /remitos - Crear nuevo remito
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filesFromMulter = getFilesFromMulter(req);
      const base64Inputs = getBase64Inputs(req.body);
      const inputs = buildInputs(filesFromMulter, base64Inputs);

      validateInputs(inputs);

      const tenantEmpresaId = req.user?.tenantId || 1;
      const dadorCargaId = req.body.dadorCargaId || req.user?.dadorId || 1;
      const choferId = getChoferId(req);
      const choferCargadorData = getChoferCargadorData(req);

      const finalPdfBuffer = await preparePdfBuffer(inputs);

      const result = await RemitoService.create(
        {
          tenantEmpresaId,
          dadorCargaId: parseInt(dadorCargaId as string),
          cargadoPorUserId: req.user!.userId,
          cargadoPorRol: req.user!.role,
          choferId,
          // Datos del chofer que carga o fue seleccionado
          ...choferCargadorData,
        },
        {
          pdfBuffer: finalPdfBuffer,
          originalInputs: inputs,
          fileName: `remito_${Date.now()}.pdf`,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Remito creado y encolado para análisis',
        data: { id: result.remito.id, estado: result.remito.estado, imagenesCount: result.imagenes.length },
      });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * GET /remitos - Listar remitos
   */
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { estado, fechaDesde, fechaHasta, numeroRemito, page, limit } = req.query;

      const result = await RemitoService.list({
        tenantEmpresaId: req.user?.tenantId,
        dadorCargaId: req.user?.dadorId,
        estado: estado as string,
        numeroRemito: numeroRemito as string,
        fechaDesde: fechaDesde ? new Date(fechaDesde as string) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta as string) : undefined,
        userId: req.user?.userId,
        userRole: req.user?.role,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.json({ success: true, data: result.items, pagination: result.pagination, stats: result.stats });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * GET /remitos/:id - Obtener remito por ID
   */
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const remito = await RemitoService.getById(id, req.user?.userId, req.user?.role);

      if (!remito) {
        throw createError('Remito no encontrado', 404, 'NOT_FOUND');
      }

      const imagenesConUrls = await Promise.all(
        remito.imagenes.map(async (img) => ({
          ...img,
          url: await minioService.getSignedUrl(img.bucketName, img.objectKey),
        }))
      );

      res.json({ success: true, data: { ...remito, imagenes: imagenesConUrls } });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * PATCH /remitos/:id - Editar datos del remito
   */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const {
        numeroRemito,
        fechaOperacion,
        emisorNombre,
        emisorDetalle,
        clienteNombre,
        producto,
        transportistaNombre,
        choferNombre,
        choferDni,
        patenteChasis,
        patenteAcoplado,
        pesoOrigenBruto,
        pesoOrigenTara,
        pesoOrigenNeto,
        pesoDestinoBruto,
        pesoDestinoTara,
        pesoDestinoNeto,
      } = req.body;

      const remito = await RemitoService.updateManual(id, req.user!.userId, {
        numeroRemito,
        fechaOperacion,
        emisorNombre,
        emisorDetalle,
        clienteNombre,
        producto,
        transportistaNombre,
        choferNombre,
        choferDni,
        patenteChasis,
        patenteAcoplado,
        pesoOrigenBruto: parseWeight(pesoOrigenBruto),
        pesoOrigenTara: parseWeight(pesoOrigenTara),
        pesoOrigenNeto: parseWeight(pesoOrigenNeto),
        pesoDestinoBruto: parseWeight(pesoDestinoBruto),
        pesoDestinoTara: parseWeight(pesoDestinoTara),
        pesoDestinoNeto: parseWeight(pesoDestinoNeto),
      });

      res.json({ success: true, message: 'Remito actualizado', data: remito });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * POST /remitos/:id/approve - Aprobar remito
   */
  static async approve(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const remito = await RemitoService.approve(id, req.user!.userId);
      res.json({ success: true, message: 'Remito aprobado', data: remito });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * POST /remitos/:id/reject - Rechazar remito
   */
  static async reject(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const { motivo } = req.body;

      if (!motivo || motivo.trim().length < 5) {
        throw createError('Motivo de rechazo requerido (mín 5 caracteres)', 400, 'VALIDATION_ERROR');
      }

      const remito = await RemitoService.reject(id, req.user!.userId, motivo.trim());
      res.json({ success: true, message: 'Remito rechazado', data: remito });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * GET /remitos/stats - Estadísticas
   */
  static async stats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId || 1;
      const dadorId = req.user?.dadorId;
      const stats = await RemitoService.getStats(tenantId, dadorId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * GET /remitos/:id/image/:imagenId - Obtener URL de imagen
   */
  static async getImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const remitoId = parseParamId(req.params, 'id');
      const remito = await RemitoService.getById(remitoId, req.user?.userId, req.user?.role);

      if (!remito) {
        throw createError('Remito no encontrado', 404, 'NOT_FOUND');
      }

      const imagenId = parseParamId(req.params, 'imagenId');
      const imagen = remito.imagenes.find((i) => i.id === imagenId);

      if (!imagen) {
        throw createError('Imagen no encontrada', 404, 'IMAGE_NOT_FOUND');
      }

      const url = await minioService.getSignedUrl(imagen.bucketName, imagen.objectKey, 3600);
      res.json({ success: true, data: { url } });
    } catch (error: any) {
      sendError(res, error);
    }
  }

  /**
   * POST /remitos/:id/reprocess - Reprocesar remito con IA
   */
  static async reprocess(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseParamId(req.params, 'id');
      const result = await RemitoService.reprocess(id, req.user!.userId);
      res.json({ success: true, message: 'Remito encolado para reprocesamiento', data: result });
    } catch (error: any) {
      sendError(res, error);
    }
  }
}
