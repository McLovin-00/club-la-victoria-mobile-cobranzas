import { Router } from 'express';
import { UserRole } from '../types/roles';
import { DocumentsController, uploadMiddleware } from '../controllers/documents.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/auth.middleware';
import { uploadRateLimit } from '../middlewares/rateLimiter.middleware';
import { db } from '../config/database';
import {
  uploadDocumentSchema,
  getDocumentStatusSchema,
  getDocumentsByDadorSchema,
  getDocumentSchema,
  deleteDocumentSchema,
} from '../schemas/validation.schemas';

const router = Router();

// Normalizar expiración a +100 años para documentos sin fecha (ADMIN/SUPERADMIN)
router.post('/normalize-expirations', authenticate, authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req, res) => {
  const now = Date.now();
  const farFuture = new Date(now + 100 * 365 * 24 * 60 * 60 * 1000);
  const r = await db.getClient().document.updateMany({ where: { expiresAt: null }, data: { expiresAt: farFuture } });
  res.json({ success: true, data: { updated: (r as any)?.count || 0 } });
});

// =================================
// RUTAS DE DOCUMENTOS - Core del Sistema
// =================================

/**
 * GET /api/docs/documents/dador/:dadorId - Listar documentos de un dador de carga
 */
router.get(
  '/dador/:dadorId',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  validate(getDocumentsByDadorSchema),
  DocumentsController.getDocumentsByEmpresa
);


/**
 * POST /api/docs/documents/upload - Subir documento
 * Acceso: Usuarios autenticados con acceso a la empresa
 */
router.post(
  '/upload',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA]),
  uploadRateLimit,
  // Aceptar compatibilidad: 'documents' (múltiples) y 'document' (único)
  uploadMiddleware.fields([
    { name: 'documents', maxCount: 20 },
    { name: 'document', maxCount: 1 },
  ]),
  validate(uploadDocumentSchema),
  DocumentsController.uploadDocument
);

/**
 * GET /api/docs/documents/status - Lista de documentos con estado
 * Acceso: Usuarios autenticados (filtrado por empresa automáticamente)
 */
router.get(
  '/status',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO]),
  validate(getDocumentStatusSchema),
  DocumentsController.getDocumentStatus
);

/**
 * GET /api/docs/documents/:id/preview - Obtener URL de preview
 * Acceso: Usuarios autenticados con acceso al documento
 */
router.get(
  '/:id/preview',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO]),
  validate(getDocumentSchema),
  DocumentsController.getDocumentPreview
);

/**
 * GET /api/docs/documents/:id/download - Descargar documento
 * Acceso: Usuarios autenticados con acceso al documento
 */
router.get(
  '/:id/download',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO]),
  validate(getDocumentSchema),
  DocumentsController.downloadDocument
);

/**
 * GET /api/docs/documents/:id/thumbnail - Obtener thumbnail
 */
router.get(
  '/:id/thumbnail',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO]),
  validate(getDocumentSchema),
  DocumentsController.getDocumentThumbnail
);

/**
 * POST /api/docs/documents/:id/renew - Renovar documento
 */
router.post(
  '/:id/renew',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  validate(getDocumentSchema),
  DocumentsController.renewDocument
);

/**
 * GET /api/docs/documents/:id/history - Historial de versiones
 */
router.get(
  '/:id/history',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  validate(getDocumentSchema),
  DocumentsController.getDocumentHistory
);

/**
 * DELETE /api/docs/documents/:id - Eliminar documento
 * Acceso: Superadmin, Admin o Admin Interno
 */
router.delete(
  '/:id',
  authenticate,
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.ADMIN_INTERNO]),
  validate(deleteDocumentSchema),
  DocumentsController.deleteDocument
);

export default router;