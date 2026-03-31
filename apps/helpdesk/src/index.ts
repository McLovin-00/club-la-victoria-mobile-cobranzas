import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import { createServer } from 'http';
import { AppLogger } from './config/logger';
import { getEnvironment, isServiceEnabled } from './config/environment';
import { db } from './config/database';
import { closeRedis } from './config/redis';
import { initializeBucket, closeMinio } from './config/minio';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { webSocketService } from './services/websocket.service';
import { queueService } from './services/queue.service';
import { initializeBot, startBot, stopBot } from './bot';
import { schedulerService } from './schedulers/auto-close.scheduler';
import { syncResolverConfigFromEnv } from './config/sync-resolver-config';
import routes from './routes';

// Cargar variables de entorno desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let server: ReturnType<typeof createServer> | null = null;

// Resolver versión de la app
const appVersion = process.env.APP_VERSION || '1.0.0';

const main = async (): Promise<void> => {
  try {
    // Verificar si el servicio está habilitado
    if (!isServiceEnabled()) {
      AppLogger.warn('⚠️ Microservicio Helpdesk DESHABILITADO (ENABLE_HELPDESK=false)');
      AppLogger.info('Para habilitar, configurar ENABLE_HELPDESK=true en .env');
      return;
    }

    const env = getEnvironment();

    AppLogger.info('🚀 Iniciando Microservicio Helpdesk...');
    AppLogger.info(`📄 Versión: ${appVersion}`);
    AppLogger.info(`🌍 Entorno: ${env.NODE_ENV}`);
    AppLogger.info(`🔌 Puerto: ${env.HELPDESK_PORT}`);
    AppLogger.info('🎫 Sistema de Mesa de Ayuda con Telegram');

    // Conectar a base de datos
    await db.connect();

    // Sincronizar grupos de resolvers desde env (producción)
    await syncResolverConfigFromEnv();

    // Inicializar bucket MinIO
    await initializeBucket();

    // Inicializar workers de BullMQ
    await queueService.initialize();
    AppLogger.info('🔄 Workers de colas inicializados');

    // Configurar Express
    const app = express();
    try {
      app.set('trust proxy', 1);
    } catch {
      /* Trust proxy config opcional */
    }
    const httpServer = createServer(app);

    // Inicializar WebSocket
    webSocketService.initialize(httpServer);
    AppLogger.info('🔗 WebSocket Server inicializado');

    // Inicializar bot de Telegram
    const bot = await initializeBot();
    if (bot) {
      // Iniciar polling del bot (no bloquea)
      startBot().catch((err) => {
        AppLogger.error('Error starting Telegram bot:', err);
      });
    }

    // Inicializar scheduler de auto-close
    await schedulerService.initialize();
    AppLogger.info('📅 Scheduler service initialized');

    // Middleware básico (CORS parametrizable)
    const corsOrigins = (
      env.FRONTEND_URLS ||
      env.FRONTEND_URL ||
      'http://localhost:8550'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const corsOptions: CorsOptions = {
      origin: corsOrigins,
      credentials: true,
      exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
    };
    app.use(cors(corsOptions));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    try {
      app.use(require('helmet')());
    } catch {
      /* helmet not available */
    }

    // Rate limiting
    try {
      const rateLimit = require('express-rate-limit');
      app.use(
        rateLimit({
          windowMs: 60_000,
          max: 100,
          standardHeaders: true,
          legacyHeaders: false,
        })
      );
    } catch {
      AppLogger.warn('⚠️ express-rate-limit no disponible');
    }

    // Rutas principales
    app.use('/', routes);

    // Middleware de manejo de errores (debe ir al final)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Iniciar servidor
    server = httpServer.listen(env.HELPDESK_PORT, () => {
      AppLogger.info(
        `✅ Microservicio Helpdesk escuchando en puerto ${env.HELPDESK_PORT}`
      );
      AppLogger.info('🎯 Endpoints disponibles:');
      AppLogger.info('   📊 GET  /health - Health check');
      AppLogger.info('   📋 POST /api/helpdesk/tickets - Crear ticket');
      AppLogger.info('   📄 GET  /api/helpdesk/tickets - Listar tickets');
      AppLogger.info('   👁️  GET  /api/helpdesk/tickets/:id - Ver ticket');
      AppLogger.info('   💬 POST /api/helpdesk/tickets/:id/messages - Enviar mensaje (usuario)');
      AppLogger.info('   💬 POST /api/helpdesk/admin/tickets/:id/messages - Mensaje resolver (web)');
      AppLogger.info('   🔗 WebSocket - Notificaciones en tiempo real');
    });
  } catch (error) {
    AppLogger.error('💥 Error crítico al iniciar microservicio:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  AppLogger.info(`📴 Recibida señal ${signal}, cerrando microservicio...`);

  try {
    // Cerrar servidor Express
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          AppLogger.info('🔌 Servidor Express cerrado');
          resolve();
        });
      });
    }

    // Cerrar WebSocket
    webSocketService.close();

    // Cerrar bot de Telegram
    await stopBot();

    // Cerrar scheduler
    await schedulerService.close();

    // Cerrar workers y colas
    await queueService.close();

    // Cerrar Redis
    await closeRedis();

    // Cerrar MinIO
    closeMinio();

    // Desconectar base de datos
    await db.disconnect();

    AppLogger.info('✅ Microservicio cerrado correctamente');
    process.exit(0);
  } catch (error) {
    AppLogger.error('❌ Error durante el cierre:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Iniciar aplicación
main();
