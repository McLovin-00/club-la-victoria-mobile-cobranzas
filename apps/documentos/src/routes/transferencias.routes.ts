import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { TransferenciaService } from '../services/transferencia.service';
import { AppLogger } from '../config/logger';
import { AuditService } from '../services/audit.service';
import type { EntityType } from '.prisma/documentos';

const router: ReturnType<typeof Router> = Router();

// Roles que pueden aprobar/rechazar transferencias
const ADMIN_ROLES = ['ADMIN', 'ADMIN_INTERNO', 'SUPERADMIN'];

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

const crearSolicitudSchema = z.object({
  body: z.object({
    dadorActualId: z.number().int().positive(),
    entidades: z.array(z.object({
      tipo: z.enum(['CHOFER', 'CAMION', 'ACOPLADO', 'EMPRESA_TRANSPORTISTA']),
      id: z.number().int().positive(),
      identificador: z.string().min(1).max(32),
      nombre: z.string().max(200).optional(),
    })).min(1).max(50),
    motivo: z.string().max(500).optional(),
  }),
});

const listarSolicitudesSchema = z.object({
  query: z.object({
    estado: z.enum(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});

const aprobarRechazarSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const rechazarSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    motivoRechazo: z.string().min(10).max(500),
  }),
});

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * POST /api/docs/transferencias
 * Crear una nueva solicitud de transferencia
 * Acceso: Cualquier usuario autenticado con dadorCargaId
 */
router.post('/', validate(crearSolicitudSchema), async (req: any, res) => {
  try {
    const { dadorActualId, entidades, motivo } = req.body;
    const tenantEmpresaId = req.tenantId!;
    const solicitanteDadorId = req.dadorCargaId;
    const solicitanteUserId = req.user?.userId;
    const solicitanteUserEmail = req.user?.email;

    if (!solicitanteDadorId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuario no tiene dador de carga asociado' 
      });
    }

    if (solicitanteDadorId === dadorActualId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No puedes solicitar transferencia de tus propias entidades' 
      });
    }

    const resultado = await TransferenciaService.crearSolicitud({
      tenantEmpresaId,
      solicitanteUserId,
      solicitanteUserEmail,
      solicitanteDadorId,
      dadorActualId,
      entidades: entidades.map((e: { tipo: EntityType; id: number; identificador: string; nombre?: string }) => ({
        tipo: e.tipo,
        id: e.id,
        identificador: e.identificador,
        nombre: e.nombre,
      })),
      motivo,
    });

    await AuditService.log({
      tenantEmpresaId,
      userId: solicitanteUserId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      statusCode: 201,
      action: 'CREAR_SOLICITUD_TRANSFERENCIA',
      entityType: 'SOLICITUD_TRANSFERENCIA',
      entityId: resultado.id,
      details: { dadorActualId, entidadesCount: entidades.length },
    });

    return res.status(201).json({ success: true, data: resultado });
  } catch (error: any) {
    AppLogger.error('💥 Error creando solicitud de transferencia', error);
    return res.status(400).json({ success: false, message: error.message || 'Error creando solicitud' });
  }
});

/**
 * GET /api/docs/transferencias
 * Listar solicitudes de transferencia
 * Para ADMIN: ve todas del tenant
 * Para otros: solo las relacionadas con su dador de carga
 */
router.get('/', validate(listarSolicitudesSchema), async (req: any, res) => {
  try {
    const tenantEmpresaId = req.tenantId!;
    const { estado, limit, offset } = req.query;
    const userRole = req.user?.role;
    const dadorCargaId = req.dadorCargaId;

    // Admins ven todo, otros solo sus solicitudes
    const filtrarPorDador = !ADMIN_ROLES.includes(userRole) ? dadorCargaId : undefined;

    const resultado = await TransferenciaService.listarSolicitudes({
      tenantEmpresaId,
      estado,
      dadorCargaId: filtrarPorDador,
      limit,
      offset,
    });

    return res.json({ success: true, data: resultado });
  } catch (error) {
    AppLogger.error('💥 Error listando solicitudes', error);
    return res.status(500).json({ success: false, message: 'Error listando solicitudes' });
  }
});

/**
 * GET /api/docs/transferencias/pendientes
 * Listar solo solicitudes pendientes (para admins)
 */
router.get('/pendientes', authorize(ADMIN_ROLES), async (req: any, res) => {
  try {
    const tenantEmpresaId = req.tenantId!;

    const resultado = await TransferenciaService.listarSolicitudes({
      tenantEmpresaId,
      estado: 'PENDIENTE',
      limit: 100,
      offset: 0,
    });

    return res.json({ success: true, data: resultado });
  } catch (error) {
    AppLogger.error('💥 Error listando pendientes', error);
    return res.status(500).json({ success: false, message: 'Error listando solicitudes' });
  }
});

/**
 * GET /api/docs/transferencias/:id
 * Obtener detalle de una solicitud
 */
router.get('/:id', validate(aprobarRechazarSchema), async (req: any, res) => {
  try {
    const tenantEmpresaId = req.tenantId!;
    const solicitudId = Number(req.params.id);

    const solicitud = await TransferenciaService.obtenerSolicitud(tenantEmpresaId, solicitudId);
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    // Verificar acceso: admins o involucrados
    const userRole = req.user?.role;
    const dadorCargaId = req.dadorCargaId;
    const esAdmin = ADMIN_ROLES.includes(userRole);
    const esInvolucrado = 
      solicitud.solicitanteDadorId === dadorCargaId ||
      solicitud.dadorActualId === dadorCargaId;

    if (!esAdmin && !esInvolucrado) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }

    return res.json({ success: true, data: solicitud });
  } catch (error) {
    AppLogger.error('💥 Error obteniendo solicitud', error);
    return res.status(500).json({ success: false, message: 'Error obteniendo solicitud' });
  }
});

/**
 * POST /api/docs/transferencias/:id/aprobar
 * Aprobar una solicitud de transferencia
 * Solo ADMIN o ADMIN_INTERNO
 */
router.post('/:id/aprobar', authorize(ADMIN_ROLES), validate(aprobarRechazarSchema), async (req: any, res) => {
  try {
    const tenantEmpresaId = req.tenantId!;
    const solicitudId = Number(req.params.id);
    const aprobadorUserId = req.user?.userId;
    const aprobadorUserEmail = req.user?.email;

    const resultado = await TransferenciaService.aprobarSolicitud({
      tenantEmpresaId,
      solicitudId,
      aprobadorUserId,
      aprobadorUserEmail,
    });

    if (!resultado.success) {
      return res.status(400).json({ success: false, message: resultado.message });
    }

    await AuditService.log({
      tenantEmpresaId,
      userId: aprobadorUserId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      action: 'APROBAR_TRANSFERENCIA',
      entityType: 'SOLICITUD_TRANSFERENCIA',
      entityId: solicitudId,
      details: { entidadesTransferidas: resultado.entidadesTransferidas },
    });

    return res.json({ success: true, data: resultado });
  } catch (error) {
    AppLogger.error('💥 Error aprobando solicitud', error);
    return res.status(500).json({ success: false, message: 'Error aprobando solicitud' });
  }
});

/**
 * POST /api/docs/transferencias/:id/rechazar
 * Rechazar una solicitud de transferencia
 * Solo ADMIN o ADMIN_INTERNO
 */
router.post('/:id/rechazar', authorize(ADMIN_ROLES), validate(rechazarSchema), async (req: any, res) => {
  try {
    const tenantEmpresaId = req.tenantId!;
    const solicitudId = Number(req.params.id);
    const rechazadorUserId = req.user?.userId;
    const rechazadorUserEmail = req.user?.email;
    const { motivoRechazo } = req.body;

    const resultado = await TransferenciaService.rechazarSolicitud({
      tenantEmpresaId,
      solicitudId,
      rechazadorUserId,
      rechazadorUserEmail,
      motivoRechazo,
    });

    if (!resultado.success) {
      return res.status(400).json({ success: false, message: resultado.message });
    }

    await AuditService.log({
      tenantEmpresaId,
      userId: rechazadorUserId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      action: 'RECHAZAR_TRANSFERENCIA',
      entityType: 'SOLICITUD_TRANSFERENCIA',
      entityId: solicitudId,
      details: { motivoRechazo },
    });

    return res.json({ success: true, data: resultado });
  } catch (error) {
    AppLogger.error('💥 Error rechazando solicitud', error);
    return res.status(500).json({ success: false, message: 'Error rechazando solicitud' });
  }
});

/**
 * POST /api/docs/transferencias/:id/cancelar
 * Cancelar una solicitud propia
 */
router.post('/:id/cancelar', validate(aprobarRechazarSchema), async (req: any, res) => {
  try {
    const tenantEmpresaId = req.tenantId!;
    const solicitudId = Number(req.params.id);
    const usuarioId = req.user?.userId;

    const resultado = await TransferenciaService.cancelarSolicitud({
      tenantEmpresaId,
      solicitudId,
      usuarioId,
    });

    if (!resultado.success) {
      return res.status(400).json({ success: false, message: resultado.message });
    }

    await AuditService.log({
      tenantEmpresaId,
      userId: usuarioId,
      userRole: req.user?.role,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      action: 'CANCELAR_TRANSFERENCIA',
      entityType: 'SOLICITUD_TRANSFERENCIA',
      entityId: solicitudId,
    });

    return res.json({ success: true, data: resultado });
  } catch (error) {
    AppLogger.error('💥 Error cancelando solicitud', error);
    return res.status(500).json({ success: false, message: 'Error cancelando solicitud' });
  }
});

export default router;
