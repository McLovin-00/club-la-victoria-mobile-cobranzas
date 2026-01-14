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
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  DashboardController.getSemaforosView
);

/**
 * GET /api/docs/dashboard/stats - Estadísticas globales
 * Acceso: Usuarios autenticados
 */
router.get(
  '/stats',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  DashboardController.getGlobalStats
);

// Resumen de pendientes de aprobación
router.get(
  '/pending/summary',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  DashboardController.getPendingSummary
);

/**
 * GET /api/docs/dashboard/alerts - Vista de alertas
 * Acceso: Usuarios autenticados
 */
router.get(
  '/alerts',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  DashboardController.getAlertsView
);

/**
 * GET /api/docs/dashboard/config - Configuración frontend
 * Acceso: Usuarios autenticados
 */
router.get(
  '/config',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA, UserRole.CHOFER]),
  DashboardController.getFrontendConfig
);

/**
 * GET /api/docs/dashboard/approval-kpis - KPIs de aprobación
 */
router.get(
  '/approval-kpis',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  DashboardController.getApprovalKpis
);

/**
 * GET /api/docs/dashboard/stats-por-rol - Stats personalizados por rol
 * Acceso: Todos los usuarios autenticados
 */
router.get(
  '/stats-por-rol',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA, UserRole.TRANSPORTISTA, UserRole.CLIENTE]),
  DashboardController.getStatsPorRol
);

/**
 * GET /api/docs/dashboard/rejected - Lista de documentos rechazados
 * Acceso: Administradores y Dadores de Carga
 */
router.get(
  '/rejected',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  DashboardController.getRejectedDocuments
);

/**
 * GET /api/docs/dashboard/rejected/stats - Estadísticas de documentos rechazados
 * Acceso: Administradores y Dadores de Carga
 */
router.get(
  '/rejected/stats',
  authorize([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.ADMIN_INTERNO, UserRole.DADOR_DE_CARGA]),
  DashboardController.getRejectedStats
);

export default router;