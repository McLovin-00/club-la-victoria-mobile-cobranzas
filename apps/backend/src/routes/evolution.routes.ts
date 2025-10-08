import { Router, Request, Response } from 'express';
import { authenticateUser, authorizeRoles } from '../middlewares/platformAuth.middleware';

const router = Router();

// Base: /api/docs/evolution

// GET /api/docs/evolution/instances
router.get(
  '/instances',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (_req: Request, res: Response) => {
    return res.json({
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    });
  }
);

// GET /api/docs/evolution/instances/:id/status
router.get(
  '/instances/:id/status',
  authenticateUser,
  authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']),
  async (_req: Request, res: Response) => {
    return res.json({
      success: true,
      data: { status: 'disconnected' },
      timestamp: new Date().toISOString(),
    });
  }
);

export default router;


