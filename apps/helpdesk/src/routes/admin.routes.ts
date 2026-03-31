import { Response, Router } from 'express';
import multer from 'multer';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { postAdminTicketMessage } from '../controllers/admin-message.controller';
import ticketService from '../services/ticket.service';
import { resolveStaffTenantScope } from '../services/tenant-scope';
import { AppLogger } from '../config/logger';
import {
  listTicketsQuerySchema,
  resolverConfigCategoryParamsSchema,
  updateResolverConfigSchema,
} from '../schemas/ticket.schema';
import type { HelpdeskStats } from '../types';
import { buildTicketViewerContext } from '../utils/viewer-context';

/** Stats vacías cuando el rol no tiene tenant asignado */
function emptyTenantStats(): HelpdeskStats {
  return {
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    total: 0,
    byCategory: { technical: 0, operational: 0 },
    byPriority: { low: 0, normal: 0, high: 0 },
  };
}

const router: Router = Router();

const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 8,
  },
});

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Aplicar middleware de admin a todas las rutas
router.use(adminMiddleware);

// POST /api/helpdesk/admin/tickets/:ticketId/messages — respuesta resolver desde la web
router.post('/tickets/:ticketId/messages', adminUpload.array('attachments', 8), postAdminTicketMessage);

// GET /api/helpdesk/admin/tickets - Listar todos los tickets (mismo alcance tenant que GET /tickets staff)
router.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const queryValidation = listTicketsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        success: false,
        message: 'Parámetros inválidos',
        errors: queryValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const { page, limit, status, category, priority, search, from, to } = queryValidation.data;

    const scope = resolveStaffTenantScope(req.user!.role, req.user!.empresaId);
    if (scope.kind === 'none') {
      res.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
      return;
    }

    const result = await ticketService.getAll(
      {
        status,
        category,
        priority,
        search,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        ...(scope.kind === 'empresa' ? { empresaId: scope.empresaId } : {}),
      },
      { page, limit },
      true // includeEmpresa - los admin siempre ven el nombre de la empresa
    );

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    AppLogger.error('Error listing all tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar tickets',
    });
  }
});

// GET /api/helpdesk/admin/tickets/:id - Detalle de ticket con mismo tenant scope que staff/admin
router.get('/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const ticket = await ticketService.getById(ticketId, buildTicketViewerContext(req));

    if (!ticket) {
      res.status(404).json({
        success: false,
        message: 'Ticket no encontrado',
      });
      return;
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    AppLogger.error('Error getting admin ticket detail:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle del ticket',
    });
  }
});

// GET /api/helpdesk/admin/stats - Estadísticas (filtradas por tenant salvo SUPERADMIN)
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scope = resolveStaffTenantScope(req.user!.role, req.user!.empresaId);
    if (scope.kind === 'none') {
      res.json({
        success: true,
        data: emptyTenantStats(),
      });
      return;
    }
    const stats =
      scope.kind === 'empresa'
        ? await ticketService.getStats(scope.empresaId)
        : await ticketService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    AppLogger.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
    });
  }
});

// GET /api/helpdesk/admin/config - Configuración de resolvers
router.get('/config', async (_req, res) => {
  try {
    const { prisma } = await import('../config/database');
    const configs = await prisma.resolverConfig.findMany({
      orderBy: { category: 'asc' },
    });
    res.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    AppLogger.error('Error getting resolver config:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración',
    });
  }
});

// PUT /api/helpdesk/admin/config/:category - Crear/actualizar configuración de resolvers
router.put('/config/:category', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const paramsValidation = resolverConfigCategoryParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        success: false,
        message: 'Categoría inválida',
        errors: paramsValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const bodyValidation = updateResolverConfigSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: bodyValidation.error.flatten().fieldErrors,
      });
      return;
    }

    const { prisma } = await import('../config/database');
    const category = paramsValidation.data.category;
    const { telegramGroupId, telegramGroupName, resolverNames, isActive } = bodyValidation.data;

    const normalizedResolverNames = resolverNames.map(name => name.trim()).filter(Boolean);

    const config = await prisma.resolverConfig.upsert({
      where: { category },
      update: {
        telegramGroupId,
        telegramGroupName: telegramGroupName?.trim() || null,
        resolverNames: normalizedResolverNames,
        isActive,
      },
      create: {
        category,
        telegramGroupId,
        telegramGroupName: telegramGroupName?.trim() || null,
        resolverNames: normalizedResolverNames,
        isActive,
      },
    });

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    AppLogger.error('Error updating resolver config:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración',
    });
  }
});

export default router;
