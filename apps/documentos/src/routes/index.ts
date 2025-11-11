import { Router } from 'express';
import { generalRateLimit } from '../middlewares/rateLimiter.middleware';
import { AppLogger } from '../config/logger';
import { requestContext } from '../middlewares/requestContext.middleware';
import { auditMiddleware } from '../middlewares/audit.middleware';

// Importar rutas
import healthRoutes from './health.routes';
import templatesRoutes from './templates.routes';
import configRoutes from './config.routes';
import flowiseConfigRoutes from './flowise-config.routes';
import evolutionConfigRoutes from './evolution-config.routes';
import documentsRoutes from './documents.routes';
import dashboardRoutes from './dashboard.routes';
import metricsRoutes from './metrics.routes';
import clientsRoutes from './clients.routes';
import equiposRoutes from './equipos.routes';
import searchRoutes from './search.routes';
import storageRoutes from './storage.routes';
import notificationsRoutes from './notifications.routes';
import defaultsRoutes from './defaults.routes';
import dadoresRoutes from './dadores.routes';
import maestrosRoutes from './maestros.routes';
import batchRoutes from './batch.routes';
import transportistasRoutes from './transportistas.routes';
import { authenticate, tenantResolver } from '../middlewares/auth.middleware';
import { autoFilterByDador } from '../middlewares/autoFilterByDador.middleware';
import { authorizeTransportista } from '../middlewares/authorizeTransportista.middleware';
import empresasTransportistasRoutes from './empresas-transportistas.routes';
import approvalRoutes from './approval.routes';
import { configRateLimit } from '../middlewares/rateLimiter.middleware';
import complianceRoutes from './compliance.routes';
import auditLogsRoutes from './audit.routes';

const router = Router();

// =================================
// MIDDLEWARE GLOBAL
// =================================

// Contexto de request (X-Request-ID)
router.use(requestContext);

// Rate limiting general
router.use(generalRateLimit);

// Logging de requests
router.use((req, res, next) => {
  AppLogger.debug('📄 DOCS API Request:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: (req as any).requestId,
  });
  next();
});

// Auditoría de métodos mutantes (best-effort)
router.use(auditMiddleware);

// =================================
// RUTAS PRINCIPALES
// =================================

// Health check y métricas (sin prefijo /api/docs)
router.use('/health', healthRoutes);
router.use('/metrics', metricsRoutes);

// API Routes con prefijo /api/docs
// Templates NO requieren tenant (son globales)
router.use('/api/docs/templates', authenticate, templatesRoutes);
// Flowise es configuración global del sistema, no requiere tenant
// Flowise config: solo SUPERADMIN, sin tenantResolver
router.use('/api/docs/flowise', authenticate, flowiseConfigRoutes);
// Alias por compatibilidad: algunos clientes usan /api/docs/config/flowise
router.use('/api/docs/config/flowise', authenticate, flowiseConfigRoutes);
router.use('/api/docs/evolution', authenticate, tenantResolver, evolutionConfigRoutes);
router.use('/api/docs/config', authenticate, tenantResolver, configRateLimit, configRoutes);
router.use('/api/docs/documents', authenticate, tenantResolver, documentsRoutes);
router.use('/api/docs/dashboard', authenticate, tenantResolver, dashboardRoutes);
router.use('/api/docs/clients', authenticate, tenantResolver, clientsRoutes);
router.use('/api/docs/equipos', authenticate, tenantResolver, autoFilterByDador, authorizeTransportista, equiposRoutes);
router.use('/api/docs/search', authenticate, tenantResolver, autoFilterByDador, authorizeTransportista, searchRoutes);
router.use('/api/docs/storage', authenticate, tenantResolver, storageRoutes);
router.use('/api/docs/notifications', authenticate, tenantResolver, notificationsRoutes);
router.use('/api/docs/defaults', authenticate, tenantResolver, defaultsRoutes);
router.use('/api/docs/dadores', authenticate, tenantResolver, dadoresRoutes);
router.use('/api/docs/maestros', authenticate, tenantResolver, autoFilterByDador, authorizeTransportista, maestrosRoutes);
router.use('/api/docs', authenticate, tenantResolver, batchRoutes);
router.use('/api/docs/transportistas', authenticate, tenantResolver, authorizeTransportista, transportistasRoutes);
router.use('/api/docs/empresas-transportistas', authenticate, tenantResolver, empresasTransportistasRoutes);
router.use('/api/docs/approval', authenticate, tenantResolver, approvalRoutes);
router.use('/api/docs/compliance', authenticate, tenantResolver, complianceRoutes);
router.use('/api/docs/audit', authenticate, tenantResolver, auditLogsRoutes);

// =================================
// RUTA RAÍZ - Información del Servicio
// =================================

router.get('/', (req, res) => {
  res.json({
    service: 'Documentos Microservice',
    version: '1.0.0',
    description: 'Microservicio elegante para gestión documental de transportistas',
    philosophy: 'Simplicidad es la sofisticación definitiva',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      templates: '/api/docs/templates',
      config: '/api/docs/config',
      flowise: '/api/docs/flowise',
      documents: '/api/docs/documents',
      dashboard: '/api/docs/dashboard',
    },
    status: 'active',
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint sin autenticación
router.get('/test-templates', async (req, res) => {
  try {
    const { db } = await import('../config/database');
    const templates = await db.getClient().documentTemplate.findMany();
    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener templates',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;