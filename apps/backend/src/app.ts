import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Configuración de variables de entorno desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { AppLogger } from './config/logger';
import { getEnvironment } from './config/environment';
import { httpLogger, errorLogger } from './middlewares/logging.middleware';
import { initializePrisma } from './config/prisma';
import { backendServiceConfig } from './config/serviceConfig';

// Importar middleware de errores
import ErrorMiddleware from './middlewares/error.middleware';

// Crear aplicación Express
const app = express();

// Helper: importar ruta de forma segura (sin fallar si no existe)
async function safeImportRoute(routePath: string): Promise<any | null> {
  try {
    return (await import(('./routes/' + routePath) as any)).default;
  } catch {
    return null;
  }
}

// Helper: registrar ruta si existe
function registerRouteIfExists(path: string, router: any | null): void {
  if (router) {
    app.use(path, router);
  }
}

// Helper: aplicar middleware opcional (silencia errores si el paquete no existe)
function tryApplyMiddleware(_name: string, fn: () => void): void {
  try { fn(); } catch { /* Middleware opcional no disponible */ }
}

// Helper: registrar rutas de documentos
async function registerDocumentosRoutes(): Promise<void> {
  AppLogger.info('📄 Loading Documentos service routes');
  try {
    const [notificationsRoutes, evolutionRoutes, docsRoutes] = await Promise.all([
      safeImportRoute('notifications.routes'),
      safeImportRoute('evolution.routes'),
      safeImportRoute('docs.routes'),
    ]);
    registerRouteIfExists('/api/docs/notifications', notificationsRoutes);
    registerRouteIfExists('/api/docs/evolution', evolutionRoutes);
    registerRouteIfExists('/api/docs', docsRoutes);
    AppLogger.debug('-> Documentos routes registered');
  } catch (e) {
    AppLogger.error('❌ Failed to load Documentos routes', e);
  }
}

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
  app.options('*all', cors(corsOptions));

  // Middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  // Seguridad y performance
  try {
    const helmet = require('helmet');
    app.use(helmet());
  } catch { }
  try {
    const compression = require('compression');
    app.use(compression());
  } catch { }
  try {
    const rateLimit = require('express-rate-limit');
    const windowMs = env.RATE_LIMIT_WINDOW_MS ?? 60_000;
    const max = env.RATE_LIMIT_MAX ?? 300;
    app.use(rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false }));
  } catch { }

  // Middleware de logging para todas las peticiones
  app.use(httpLogger);
};

// Función para configurar rutas (async para importaciones dinámicas)
const setupRoutes = async (): Promise<void> => {
  const serviceConfig = backendServiceConfig.getConfig();
  AppLogger.info('🔧 Configuración de servicios:', { documentos: serviceConfig.documentos.enabled });

  // Importar rutas en paralelo
  const [dashboardRoutes, healthRoutes, metricsRoutes, docsRouter, empresaRoutes, serviceRoutes, instanceRoutes, permisoRoutes, configRoutes] = await Promise.all([
    safeImportRoute('dashboard.routes'),
    safeImportRoute('health.routes'),
    safeImportRoute('metrics.routes'),
    safeImportRoute('openapi.routes'),
    safeImportRoute('empresa.routes'),
    safeImportRoute('service.routes'),
    safeImportRoute('instance.routes'),
    safeImportRoute('permiso.routes'),
    safeImportRoute('config.routes'),
  ]);

  // Rutas user siempre habilitadas
  const platformAuthRoutes = (await import('./routes/platformAuth.routes')).default;
  const platformUserRoutes = (await import('./routes/user.routes')).default;
  const endUserRoutes = (await import('./routes/endUser.routes')).default;

  // Registrar rutas core
  AppLogger.debug('Registering core routes...');
  registerRouteIfExists('/health', healthRoutes);
  registerRouteIfExists('/metrics', metricsRoutes);
  registerRouteIfExists('/docs', docsRouter);
  registerRouteIfExists('/api/dashboard', dashboardRoutes);
  registerRouteIfExists('/api/empresas', empresaRoutes);
  registerRouteIfExists('/api/services', serviceRoutes);
  registerRouteIfExists('/api/instances', instanceRoutes);
  registerRouteIfExists('/api/permisos', permisoRoutes);
  registerRouteIfExists('/api/config', configRoutes);
  AppLogger.debug('-> Core routes registered');

  // Documentos service (conditional)
  if (serviceConfig.documentos.enabled) {
    await registerDocumentosRoutes();
  } else {
    AppLogger.warn('⚠️ Documentos routes disabled (ENABLE_DOCUMENTOS=false)');
    app.use('/api/docs/*path', (req, res) => res.status(404).json({ message: 'Documentos service is disabled', service: 'documentos', enabled: false }));
  }

  // User routes
  app.use('/api/platform/auth', platformAuthRoutes);
  app.use('/api/usuarios', platformUserRoutes);
  app.use('/api/end-users', endUserRoutes);
  app.use('/api/clients', endUserRoutes);
  AppLogger.info('🔀 PlatformUser/EndUser routes registered');

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
  app.use('*path', ErrorMiddleware.notFound);
  AppLogger.debug('-> Not-found middleware registered');

  // Global error handling middleware (must be the last)
  AppLogger.debug('Registering global error handlers...');
  app.use(errorLogger);
  app.use(ErrorMiddleware.handle);
  AppLogger.debug('-> Global error handlers registered');
};

export default app;
