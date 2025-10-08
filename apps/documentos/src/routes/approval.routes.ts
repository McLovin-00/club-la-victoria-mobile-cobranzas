import { Router } from 'express';
import { authenticate, authorize, validate } from '../middlewares/auth.middleware';
import { UserRole } from '../types/roles';
import { ApprovalController } from '../controllers/approval.controller';
import { approveDocumentSchema, rejectDocumentSchema, pendingDocumentsQuerySchema } from '../schemas/validation.schemas';
import { approvalRateLimit } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(authenticate);

router.get('/pending', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), validate(pendingDocumentsQuerySchema), ApprovalController.getPendingDocuments);
router.get('/pending/:id', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), ApprovalController.getPendingDocument);
router.post('/pending/:id/approve', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), approvalRateLimit, validate(approveDocumentSchema), ApprovalController.approveDocument);
router.post('/pending/:id/reject', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), approvalRateLimit, validate(rejectDocumentSchema), ApprovalController.rejectDocument);
router.get('/stats', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), ApprovalController.getStats);
router.post('/pending/batch-approve', authorize([UserRole.ADMIN, UserRole.SUPERADMIN]), approvalRateLimit, ApprovalController.batchApprove);

export default router;


