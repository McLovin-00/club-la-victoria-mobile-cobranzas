import { Router } from 'express';
import { UserRole } from '../types/roles';
import { ConfigController } from '../controllers/config.controller';
import { authenticate, authorize, authorizeEmpresa as authorizeDador, validate } from '../middlewares/auth.middleware';
import { configRateLimit } from '../middlewares/rateLimiter.middleware';
import {
  getEmpresaConfigSchema as getDadorConfigSchema,
  updateEmpresaConfigSchema as updateDadorConfigSchema,
} from '../schemas/validation.schemas';

const router: ReturnType<typeof Router> = Router();

// =================================
// RUTAS DE CONFIGURACIÓN POR DADOR
// =================================

/**
 * GET /api/docs/config/:dadorId - Obtener configuración de dador
 * Acceso: Superadmin o Admin del dador
 */
router.get(
  '/:dadorId',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN]),
  authorizeDador,
  validate(getDadorConfigSchema),
  ConfigController.getEmpresaConfig
);

/**
 * POST /api/docs/config/:dadorId - Actualizar configuración de dador
 * Acceso: Solo Superadmin
 */
router.post(
  '/:dadorId',
  authenticate,
  authorize(['SUPERADMIN' as any]),
  configRateLimit,
  validate(updateDadorConfigSchema),
  ConfigController.updateEmpresaConfig
);

/**
 * GET /api/docs/config/:dadorId/status - Estado del servicio para dador
 * Acceso: Superadmin o Admin del dador
 */
router.get(
  '/:dadorId/status',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN]),
  authorizeDador,
  validate(getDadorConfigSchema),
  ConfigController.getEmpresaStatus
);

export default router;