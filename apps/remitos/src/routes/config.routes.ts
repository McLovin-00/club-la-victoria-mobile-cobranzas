import { Router, IRouter } from 'express';
import { ConfigController } from '../controllers/config.controller';
import { authenticate, authorize, ROLES_CONFIG } from '../middlewares/auth.middleware';

const router: IRouter = Router();

// GET /config/flowise - Obtener configuración
router.get(
  '/flowise',
  authenticate,
  authorize(ROLES_CONFIG),
  ConfigController.getFlowiseConfig
);

// PUT /config/flowise - Actualizar configuración
router.put(
  '/flowise',
  authenticate,
  authorize(ROLES_CONFIG),
  ConfigController.updateFlowiseConfig
);

// POST /config/flowise/test - Probar conexión
router.post(
  '/flowise/test',
  authenticate,
  authorize(ROLES_CONFIG),
  ConfigController.testFlowise
);

export default router;

