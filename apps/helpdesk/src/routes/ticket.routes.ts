import { Router } from 'express';
import multer from 'multer';
import ticketController from '../controllers/ticket.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

const ticketCreateUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 8,
  },
});

// Todas las rutas de tickets requieren autenticación
router.use(authMiddleware);

// POST /api/helpdesk/tickets — JSON o multipart (campo attachments)
router.post('/', ticketCreateUpload.array('attachments', 8), ticketController.create);

// GET /api/helpdesk/tickets - Listar mis tickets
router.get('/', ticketController.getMyTickets);

// GET /api/helpdesk/tickets/unread-summary - Contador persistido de no leídos
router.get('/unread-summary', ticketController.getUnreadSummary);

// PATCH /api/helpdesk/tickets/:id/read - Marcar ticket como leído
router.patch('/:id/read', ticketController.markAsRead);

// GET /api/helpdesk/tickets/:id - Ver ticket
router.get('/:id', ticketController.getById);

// PATCH /api/helpdesk/tickets/:id/close - Cerrar ticket
router.patch('/:id/close', ticketController.close);

// PATCH /api/helpdesk/tickets/:id/reopen - Reabrir ticket
router.patch('/:id/reopen', ticketController.reopen);

// PATCH /api/helpdesk/tickets/:id/priority - Cambiar prioridad (RESOLVER)
router.patch('/:id/priority', ticketController.updatePriority);

// PATCH /api/helpdesk/tickets/:id/status - Cambiar estado (RESOLVER/Staff)
router.patch('/:id/status', ticketController.updateStatus);

export default router;
