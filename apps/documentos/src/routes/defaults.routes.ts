import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { DefaultsController } from '../controllers/defaults.controller';

const router = Router();

router.use(authenticate);
router.get('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), DefaultsController.get);
router.put('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), DefaultsController.update);

export default router;


