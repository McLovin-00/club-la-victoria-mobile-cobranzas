import { Router } from 'express';
import { authenticate, tenantResolver } from '../middlewares/auth.middleware';
import { StorageController } from '../controllers/storage.controller';

const router = Router();

router.use(authenticate, tenantResolver);

// Inicializar bucket para el tenant actual
router.post('/init', StorageController.initTenantBucket);

export default router;


