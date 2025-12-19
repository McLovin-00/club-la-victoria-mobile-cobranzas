import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { EntityDataController } from '../controllers/entity-data.controller';

const router = Router();

// Solo SUPERADMIN y ADMIN_INTERNO pueden ver datos extraídos
const ADMIN_ROLES = [UserRole.SUPERADMIN, UserRole.ADMIN_INTERNO];

router.use(authenticate);

// Listar todas las entidades con datos extraídos
router.get(
  '/extracted-data',
  authorize(ADMIN_ROLES),
  EntityDataController.listExtractedData
);

// Obtener datos extraídos de una entidad específica
router.get(
  '/:entityType/:entityId/extracted-data',
  authorize(ADMIN_ROLES),
  EntityDataController.getExtractedData
);

// Actualizar datos extraídos manualmente
router.put(
  '/:entityType/:entityId/extracted-data',
  authorize(ADMIN_ROLES),
  EntityDataController.updateExtractedData
);

// Borrar datos extraídos de una entidad
router.delete(
  '/:entityType/:entityId/extracted-data',
  authorize(ADMIN_ROLES),
  EntityDataController.deleteExtractedData
);

// Obtener historial de extracciones de una entidad
router.get(
  '/:entityType/:entityId/extraction-history',
  authorize(ADMIN_ROLES),
  EntityDataController.getExtractionHistory
);

export default router;

