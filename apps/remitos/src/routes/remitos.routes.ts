import { Router } from 'express';
import multer from 'multer';
import { RemitosController } from '../controllers/remitos.controller';
import { authenticate, authorize, ROLES_UPLOAD, ROLES_APPROVE } from '../middlewares/auth.middleware';

const router = Router();

// Configurar multer para archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB máximo
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
});

// GET /remitos/stats - Estadísticas (antes que /:id para no confundir)
router.get('/stats', authenticate, RemitosController.stats);

// GET /remitos - Listar remitos
router.get('/', authenticate, RemitosController.list);

// POST /remitos - Crear nuevo remito
router.post(
  '/',
  authenticate,
  authorize(ROLES_UPLOAD),
  upload.single('imagen'),
  RemitosController.create
);

// GET /remitos/:id - Obtener remito por ID
router.get('/:id', authenticate, RemitosController.getById);

// GET /remitos/:id/image/:imagenId - Obtener URL de imagen
router.get('/:id/image/:imagenId', authenticate, RemitosController.getImage);

// POST /remitos/:id/approve - Aprobar remito (solo ADMIN_INTERNO)
router.post(
  '/:id/approve',
  authenticate,
  authorize(ROLES_APPROVE),
  RemitosController.approve
);

// POST /remitos/:id/reject - Rechazar remito (solo ADMIN_INTERNO)
router.post(
  '/:id/reject',
  authenticate,
  authorize(ROLES_APPROVE),
  RemitosController.reject
);

export default router;

