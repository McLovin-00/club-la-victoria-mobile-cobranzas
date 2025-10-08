import { Router } from 'express';
import { PlatformUserController } from '../controllers/user.controller';
import {
  authenticateUser,
  authorizeRoles,
  logAction,
  tenantResolver,
} from '../middlewares/platformAuth.middleware';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateUser, tenantResolver);

/**
 * GET /api/platform-users/
 * Obtener lista de usuarios con paginación y filtros
 */
router.get(
  '/',
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  logAction('USER_LIST'),
  PlatformUserController.getUsuarios
);

/**
 * GET /api/platform-users/:id
 * Obtener un usuario específico por ID
 */
router.get(
  '/:id',
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  logAction('USER_GET'),
  PlatformUserController.getUsuarioById
);

/**
 * PUT /api/platform-users/:id/empresa
 * Actualizar la empresa de un usuario (solo superadmin)
 */
router.put(
  '/:id/empresa',
  authorizeRoles(['SUPERADMIN']),
  logAction('USER_UPDATE_EMPRESA'),
  PlatformUserController.updateEmpresa
);

export default router;
