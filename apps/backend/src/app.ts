import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { AppLogger } from './config/logger';
import { getEnvironment } from './config/environment';
import { httpLogger, errorLogger } from './middlewares/logging.middleware';
import { initializePrisma } from './config/prisma';
import { backendServiceConfig } from './config/serviceConfig';

// Importar middleware de errores
import ErrorMiddleware from './middlewares/error.middleware';

// Configuración de variables de entorno desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Crear aplicación Express
const app = express();

// Función para inicializar la aplicación
export const initializeApp = async (skipPrismaInit: boolean = false): Promise<express.Application> => {
  try {
    if (!skipPrismaInit) {
      // Inicializar Prisma PRIMERO
      await initializePrisma();
      AppLogger.info('✅ Prisma inicializado correctamente');
    } else {
      AppLogger.info('⚡ Usando conexión Prisma existente');
    }

    // Configurar middlewares
    setupMiddlewares();

    // AHORA importar y configurar las rutas después de que Prisma esté listo
    await setupRoutes();

    return app;
  } catch (error) {
    AppLogger.error('❌ Error inicializando la aplicación:', error);
    throw error;
  }
};

// Función para configurar middlewares
const setupMiddlewares = (): void => {
  // CORS debe ser el primer middleware para evitar problemas con preflight requests
  // Confiar en el proxy para X-Forwarded-* (necesario para rate-limit y logs correctos)
  app.set('trust proxy', 1);
  // CORS multi-origen
  const env = getEnvironment();
  const originEnv = env.CORS_ORIGIN || env.FRONTEND_URLS || env.FRONTEND_URL || 'http://localhost:6550';
  const origins = originEnv.split(',').map(s => s.trim()).filter(Boolean);
  const corsOptions = {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires', 'X-CSRF-TOKEN', 'Accept', 'Origin',
      // Multi-tenant header (frontend sends it in lowercase)
      'x-tenant-id', 'X-Tenant-Id'
    ],
    exposedHeaders: ['X-CSRF-TOKEN'],
  } as any;
  app.use(cors(corsOptions));
  // Ensure preflight requests are handled explicitly
  app.options('*', cors(corsOptions));

  // Middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  // Seguridad y performance
  try {
    const helmet = require('helmet');
    app.use(helmet());
  } catch {}
  try {
    const compression = require('compression');
    app.use(compression());
  } catch {}
  try {
    const rateLimit = require('express-rate-limit');
    const windowMs = env.RATE_LIMIT_WINDOW_MS ?? 60_000;
    const max = env.RATE_LIMIT_MAX ?? 300;
    app.use(rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false }));
  } catch {}

  // Middleware de logging para todas las peticiones
  app.use(httpLogger);
};

// Función para configurar rutas (async para importaciones dinámicas)
const setupRoutes = async (): Promise<void> => {
  // Obtener configuración de servicios
  const serviceConfig = backendServiceConfig.getConfig();
  const enabledServices = backendServiceConfig.getEnabledServices();
  AppLogger.info('🔧 Configuración de servicios:', {
    documentos: serviceConfig.documentos.enabled,
    enabledServices: enabledServices.join(', ') || 'Solo servicios core'
  });

  // Importar rutas core (siempre habilitadas)
  const dashboardRoutes = (await import(('./routes/' + 'dashboard.routes') as any)).default as any;
  const healthRoutes = (await import(('./routes/' + 'health.routes') as any)).default as any;
  const metricsRoutes = (await import(('./routes/' + 'metrics.routes') as any)).default as any;
  let docsRouter: any;
  try {
    docsRouter = (await import(('./routes/' + 'openapi.routes') as any)).default as any;
  } catch {}
  // Diferir carga de rutas de dominio a runtime, para no romper el build minimalista
  let empresaRoutes: any, serviceRoutes: any, instanceRoutes: any, permisoRoutes: any, configRoutes: any;
  try { empresaRoutes = (await import(('./routes/' + 'empresa.routes') as any)).default as any; } catch {}
  try { serviceRoutes = (await import(('./routes/' + 'service.routes') as any)).default as any; } catch {}
  try { instanceRoutes = (await import(('./routes/' + 'instance.routes') as any)).default as any; } catch {}
  try { permisoRoutes = (await import(('./routes/' + 'permiso.routes') as any)).default as any; } catch {}
  try { configRoutes = (await import(('./routes/' + 'config.routes') as any)).default as any; } catch {}
  // Rutas para split users (User / EndUser) - siempre habilitadas
  const platformAuthRoutes = (await import('./routes/platformAuth.routes')).default;
  const platformUserRoutes = (await import('./routes/user.routes')).default;
  const endUserRoutes = (await import('./routes/endUser.routes')).default;

  // Configurar rutas core (siempre habilitadas)
  AppLogger.debug('Registering core routes...');
  app.use('/health', healthRoutes);
  app.use('/metrics', metricsRoutes);
  if (docsRouter) app.use('/docs', docsRouter);
  app.use('/api/dashboard', dashboardRoutes);
  if (empresaRoutes) app.use('/api/empresas', empresaRoutes);
  if (serviceRoutes) app.use('/api/services', serviceRoutes);
  if (instanceRoutes) app.use('/api/instances', instanceRoutes);
  if (permisoRoutes) app.use('/api/permisos', permisoRoutes);
  if (configRoutes) app.use('/api/config', configRoutes);
  AppLogger.debug('-> Core routes registered');

  // Rutas de servicios no core eliminadas (gateway, chat-processor, calidad)

  // Documentos service (conditional)
  if (serviceConfig.documentos.enabled) {
    AppLogger.info('📄 Loading Documentos service routes (ENABLE_DOCUMENTOS=true)');
    try {
      // const transportistasRoutes = (await import(('./routes/' + 'transportistas') as any)).default as any;
      const notificationsRoutes = (await import(('./routes/' + 'notifications.routes') as any)).default as any;
      const evolutionRoutes = (await import(('./routes/' + 'evolution.routes') as any)).default as any;
      const docsRoutes = (await import(('./routes/' + 'docs.routes') as any)).default as any;
      // app.use('/api/docs/transportistas', transportistasRoutes);
      app.use('/api/docs/notifications', notificationsRoutes);
      app.use('/api/docs/evolution', evolutionRoutes);
      app.use('/api/docs', docsRoutes);
      // AppLogger.debug('-> Transportistas routes registered at /api/docs/transportistas');
      AppLogger.debug('-> Notifications routes registered at /api/docs/notifications');
      AppLogger.debug('-> Evolution routes registered at /api/docs/evolution');
      AppLogger.debug('-> Docs core routes registered at /api/docs');
    } catch (e) {
      AppLogger.error('❌ Failed to load Documentos routes at runtime', e);
    }
  } else {
    AppLogger.warn('⚠️ Documentos routes disabled (ENABLE_DOCUMENTOS=false)');
    app.use('/api/docs/*', (req, res) => {
      res.status(404).json({ 
        message: 'Documentos service is disabled',
        service: 'documentos',
        enabled: false 
      });
    });
  }

  AppLogger.debug('Registering User/EndUser routes...');
  app.use('/api/platform/auth', platformAuthRoutes);
  AppLogger.debug('-> platformAuth.routes registered');
  app.use('/api/usuarios', platformUserRoutes);
  AppLogger.debug('-> platformUser.routes registered');
  // Montar EndUser en ruta canónica y alias legacy
  app.use('/api/end-users', endUserRoutes);
  app.use('/api/clients', endUserRoutes);
  AppLogger.debug('-> endUser.routes registered (/api/end-users + alias /api/clients)');
  AppLogger.info('🔀 PlatformUser/EndUser routes forced enabled');

  // Test route
  AppLogger.debug('Registering test route...');
  app.get('/', (req, res) => {
    res.json({
      message: 'API Base - Boilerplate',
      version: '1.0.0',
      status: 'online',
      timestamp: new Date().toISOString(),
    });
  });
  AppLogger.debug('-> Test route registered');


  // Not-found middleware
  AppLogger.debug('Registering not-found middleware...');
  app.use('*', ErrorMiddleware.notFound);
  AppLogger.debug('-> Not-found middleware registered');

  // Global error handling middleware (must be the last)
  AppLogger.debug('Registering global error handlers...');
  app.use(errorLogger);
  app.use(ErrorMiddleware.handle);
  AppLogger.debug('-> Global error handlers registered');
};

export default app;
