import { Router } from 'express';
import { FlowiseConfigController } from '../controllers/flowise-config.controller';
import { authorize } from '../middlewares/auth.middleware';

const router: ReturnType<typeof Router> = Router();

// =================================
// RUTAS DE CONFIGURACIÓN FLOWISE - Solo SUPERADMIN
// =================================

/**
 * GET /api/docs/config/flowise - Obtener configuración actual
 * Acceso: Solo SUPERADMIN
 */
router.get(
  '/',
  authorize(['SUPERADMIN' as any]),
  FlowiseConfigController.getConfig
);

/**
 * PUT /api/docs/config/flowise - Actualizar configuración
 * Acceso: Solo SUPERADMIN
 */
router.put(
  '/',
  authorize(['SUPERADMIN' as any]),
  FlowiseConfigController.updateConfig
);

/**
 * POST /api/docs/config/flowise/test - Probar conexión
 * Acceso: Solo SUPERADMIN
 */
router.post(
  '/test',
  authorize(['SUPERADMIN' as any]),
  FlowiseConfigController.testConnection
);

/**
 * GET /api/docs/config/flowise/status - Estado de configuración
 * Acceso: Solo SUPERADMIN
 */
router.get(
  '/status',
  authorize(['SUPERADMIN' as any]),
  FlowiseConfigController.getStatus
);

export default router;
