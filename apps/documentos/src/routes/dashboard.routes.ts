import { Router } from 'express';
import { UserRole } from '../types/roles';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { generalRateLimit } from '../middlewares/rateLimiter.middleware';

const router = Router();

// =================================
// RUTAS DASHBOARD - Frontend Integration
// =================================

// Middleware global para dashboard
router.use(authenticate);
router.use(generalRateLimit);
router.get('/equipo-kpis', DashboardController.getEquipoKpis);

/**
 * GET /api/docs/dashboard/semaforos - Vista de semáforos
 * Acceso: Usuarios autenticados
 */
router.get(
  '/semaforos',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  DashboardController.getSemaforosView
);

/**
 * GET /api/docs/dashboard/stats - Estadísticas globales
 * Acceso: Usuarios autenticados
 */
router.get(
  '/stats',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  DashboardController.getGlobalStats
);

// Resumen de pendientes de aprobación
router.get(
  '/pending/summary',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  DashboardController.getPendingSummary
);

/**
 * GET /api/docs/dashboard/alerts - Vista de alertas
 * Acceso: Usuarios autenticados
 */
router.get(
  '/alerts',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  DashboardController.getAlertsView
);

/**
 * GET /api/docs/dashboard/config - Configuración frontend
 * Acceso: Usuarios autenticados
 */
router.get(
  '/config',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR]),
  DashboardController.getFrontendConfig
);

/**
 * GET /api/docs/dashboard/approval-kpis - KPIs de aprobación
 */
router.get(
  '/approval-kpis',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO]),
  DashboardController.getApprovalKpis
);

export default router;