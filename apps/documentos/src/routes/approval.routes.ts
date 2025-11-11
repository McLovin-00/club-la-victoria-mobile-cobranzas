import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { ApprovalController } from '../controllers/approval.controller';
import { approveDocumentSchema, rejectDocumentSchema, pendingDocumentsQuerySchema } from '../schemas/validation.schemas';
import { approvalRateLimit } from '../middlewares/rateLimiter.middleware';
import { prisma } from '../config/database';

const router = Router();

router.use(authenticate);

router.get('/pending', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(pendingDocumentsQuerySchema), ApprovalController.getPendingDocuments);
router.get('/pending/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), ApprovalController.getPendingDocument);
// Aprobar: permitir DADOR_DE_CARGA si flag habilitado para su dador
router.post('/pending/:id/approve', authorize([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.DADOR_DE_CARGA]), approvalRateLimit, validate(approveDocumentSchema), async (req: any, res, next) => {
  try {
    if (req.user?.role === UserRole.DADOR_DE_CARGA) {
      const userDadorId = (req.user.metadata as any)?.dadorCargaId ? Number((req.user.metadata as any).dadorCargaId) : undefined;
      if (!userDadorId) return res.status(403).json({ success: false, message: 'Dador no especificado en usuario', code: 'DADOR_REQUIRED' });
      const cfg = await prisma.systemConfig.findFirst({ where: { key: `dador:${userDadorId}:aprobacion.enabled` } });
      const enabled = cfg?.value === 'true';
      if (!enabled) return res.status(403).json({ success: false, message: 'Aprobación no habilitada para este dador', code: 'DADOR_APPROVAL_DISABLED' });
    }
    return ApprovalController.approveDocument(req, res);
  } catch (e) {
    next(e);
  }
});
// Rechazo solo para ADMIN/ SUPERADMIN
router.post('/pending/:id/reject', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), approvalRateLimit, validate(rejectDocumentSchema), ApprovalController.rejectDocument);
router.get('/stats', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), ApprovalController.getStats);
router.post('/pending/batch-approve', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), approvalRateLimit, ApprovalController.batchApprove);

export default router;


