import { Router } from 'express';
import healthRoutes from './health.routes';
import ticketRoutes from './ticket.routes';
import messageRoutes from './message.routes';
import adminRoutes from './admin.routes';
import attachmentRoutes from './attachment.routes';

const router: Router = Router();

// Health check (sin auth)
router.use('/health', healthRoutes);

// API routes
router.use('/api/helpdesk/tickets', ticketRoutes);
router.use('/api/helpdesk/tickets/:ticketId/messages', messageRoutes);
router.use('/api/helpdesk/attachments', attachmentRoutes);
router.use('/api/helpdesk/admin', adminRoutes);

export default router;
