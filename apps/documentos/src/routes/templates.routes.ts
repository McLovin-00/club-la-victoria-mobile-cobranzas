import { Router } from 'express';
import { TemplatesController } from '../controllers/templates.controller';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { configRateLimit } from '../middlewares/rateLimiter.middleware';
import {
  getTemplatesSchema,
  createTemplateSchema,
  updateTemplateSchema,
  getTemplateByIdSchema,
} from '../schemas/validation.schemas';

const router: ReturnType<typeof Router> = Router();

// =================================
// RUTAS DE TEMPLATES - Solo Superadmin
// =================================

/**
 * GET /api/docs/templates - Listar plantillas
 * Acceso: Todos los usuarios autenticados
 */
router.get(
  '/',
  authenticate,
  validate(getTemplatesSchema),
  TemplatesController.getTemplates
);

/**
 * GET /api/docs/templates/:id - Obtener una plantilla
 * Acceso: Todos los usuarios autenticados
 */
router.get(
  '/:id',
  authenticate,
  validate(getTemplateByIdSchema),
  TemplatesController.getTemplateById
);

/**
 * POST /api/docs/templates - Crear plantilla
 * Acceso: Solo Superadmin
 */
router.post(
  '/',
  authenticate,
  authorize(['SUPERADMIN' as any]),
  configRateLimit,
  validate(createTemplateSchema),
  TemplatesController.createTemplate
);

/**
 * PUT /api/docs/templates/:id - Actualizar plantilla
 * Acceso: Solo Superadmin
 */
router.put(
  '/:id',
  authenticate,
  authorize(['SUPERADMIN' as any]),
  configRateLimit,
  validate(updateTemplateSchema),
  TemplatesController.updateTemplate
);

/**
 * DELETE /api/docs/templates/:id - Eliminar plantilla
 * Acceso: Solo Superadmin
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['SUPERADMIN' as any]),
  configRateLimit,
  TemplatesController.deleteTemplate
);

export default router;