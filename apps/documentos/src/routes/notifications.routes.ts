import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { NotificationsController } from '../controllers/notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/', NotificationsController.getUserNotifications);
router.get('/unread-count', NotificationsController.getUnreadCount);
router.patch('/:id/read', NotificationsController.markAsRead);
router.post('/mark-all-read', NotificationsController.markAllAsRead);
router.delete('/:id', NotificationsController.deleteNotification);
router.post('/delete-all-read', NotificationsController.deleteAllRead);

export default router;
