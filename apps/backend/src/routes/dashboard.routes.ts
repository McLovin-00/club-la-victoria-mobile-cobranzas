import { Router } from 'express';
import {
  getDashboardAdmin,
  getDashboardUser,
  getDashboardSuperAdmin,
  refreshDashboard,
} from '../controllers/dashboard.controller';
import { authenticateUser, authorizeRoles } from '../middlewares/platformAuth.middleware';

const router = Router();

// Rutas protegidas para dashboard usando platform authentication
router.get('/user', authenticateUser, authorizeRoles(['OPERATOR', 'ADMIN', 'SUPERADMIN']), getDashboardUser);
router.get('/admin', authenticateUser, authorizeRoles(['ADMIN', 'SUPERADMIN']), getDashboardAdmin);
router.get('/superadmin', authenticateUser, authorizeRoles(['SUPERADMIN']), getDashboardSuperAdmin);
router.post('/refresh', authenticateUser, refreshDashboard);

// Rutas BAS removidas - funcionalidad legacy eliminada

export default router;
