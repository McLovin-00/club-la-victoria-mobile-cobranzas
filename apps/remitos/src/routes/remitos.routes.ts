import { Router, IRouter } from 'express';
import multer from 'multer';
import { RemitosController } from '../controllers/remitos.controller';
import { authenticate, authorize, ROLES_UPLOAD, ROLES_APPROVE } from '../middlewares/auth.middleware';

const router: IRouter = Router();

// Configurar multer para archivos en memoria
// Acepta imágenes (múltiples) y PDFs (único)
// NOSONAR: Content length limits are intentional and appropriate for remitos documents
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // NOSONAR: Intentional 20MB limit per file
    files: 10, // Máximo 10 archivos
  },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf';
    if (isImage || isPdf) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG) o PDF'));
    }
  },
});

// GET /remitos/stats - Estadísticas (antes que /:id para no confundir)
router.get('/stats', authenticate, RemitosController.stats);

// GET /remitos/export - Exportar a Excel (antes que /:id para no confundir)
router.get('/export', authenticate, RemitosController.exportExcel);

// GET /remitos/suggestions - Autocompletado para filtros
router.get('/suggestions', authenticate, RemitosController.suggestions);

// GET /remitos - Listar remitos
router.get('/', authenticate, RemitosController.list);

// POST /remitos - Crear nuevo remito
// Acepta: 
//   - Múltiples imágenes en 'imagenes[]' (se componen en PDF)
//   - Un único PDF en 'imagenes[]'
//   - Base64 en body.documentsBase64[]
router.post(
  '/',
  authenticate,
  authorize(ROLES_UPLOAD),
  upload.array('imagenes', 10),
  RemitosController.create
);

// GET /remitos/:id - Obtener remito por ID
router.get('/:id', authenticate, RemitosController.getById);

// PATCH /remitos/:id - Editar datos del remito (solo ADMIN_INTERNO, antes de aprobar)
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES_APPROVE),
  RemitosController.update
);

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

// POST /remitos/:id/reprocess - Reprocesar remito con IA (solo ADMIN_INTERNO)
router.post(
  '/:id/reprocess',
  authenticate,
  authorize(ROLES_APPROVE),
  RemitosController.reprocess
);

export default router;

