import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { messageController } from '../controllers/message.controller';

const router: Router = Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo por archivo
    files: 8,
  },
});

// Todas las rutas de mensajes requieren autenticación
router.use(authMiddleware);

// POST /api/helpdesk/tickets/:ticketId/messages - Crear mensaje
router.post('/', upload.array('attachments', 8), messageController.create);

// GET /api/helpdesk/tickets/:ticketId/messages - Listar mensajes
router.get('/', messageController.getMessages);

export default router;
