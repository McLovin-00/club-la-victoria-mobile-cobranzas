import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { NotificationsController } from '../controllers/notifications.controller';

const router = Router();

router.use(authenticate);
router.get('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), NotificationsController.getConfig);
router.put('/', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), NotificationsController.updateConfig);
router.post('/test', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), NotificationsController.test);

export default router;


