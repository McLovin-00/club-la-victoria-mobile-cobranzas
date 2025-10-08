import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import { createServer } from 'http';
import { AppLogger } from './config/logger';
import { getEnvironment, isServiceEnabled } from './config/environment';
import { db } from './config/database';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { getDocumentValidationWorker, closeDocumentValidationWorker } from './workers/document-validation.worker';
import { queueService } from './services/queue.service';
import { schedulerService } from './services/scheduler.service';
import { SystemConfigService } from './services/system-config.service';
import { webSocketService } from './services/websocket.service';
import routes from './routes';

// Cargar variables de entorno desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let server: any;

// Resolver versión de la app sin depender de package.json en runtime
const appVersion = process.env.APP_VERSION || '1.0.0';

const main = async (): Promise<void> => {
  try {
    // Verificar si el servicio está habilitado
    if (!isServiceEnabled()) {
      AppLogger.warn('⚠️ Microservicio Documentos DESHABILITADO (ENABLE_DOCUMENTOS=false)');
      AppLogger.info('Para habilitar, configurar ENABLE_DOCUMENTOS=true en .env');
      return;
    }

    const env = getEnvironment();
    
    AppLogger.info('🚀 Iniciando Microservicio Documentos...');
    AppLogger.info(`📄 Versión: ${appVersion}`);
    AppLogger.info(`🌍 Entorno: ${env.NODE_ENV}`);
    AppLogger.info(`🔌 Puerto: ${env.DOCUMENTOS_PORT}`);
    AppLogger.info('✨ "Simplicidad es la sofisticación definitiva"');

          // Conectar a base de datos
      await db.connect();

      // Inicializar workers asíncronos
      getDocumentValidationWorker();
      (await import('./workers/notifications.worker')).getNotificationsWorker();
      AppLogger.info('🔄 Workers de validación inicializados');

      // Inicializar configuraciones del sistema
      await SystemConfigService.initializeDefaults();
      AppLogger.info('🔧 Configuraciones del sistema inicializadas');

      // Inicializar tareas programadas
      schedulerService.start();
      AppLogger.info('⏰ Tareas programadas iniciadas');

      // Configurar Express con elegancia minimalista
    const app = express();
    try { app.set('trust proxy', 1); } catch {}
    const httpServer = createServer(app);

    // Inicializar WebSocket
    webSocketService.initialize(httpServer);
    AppLogger.info('🔗 WebSocket Server inicializado');

    // Middleware básico (CORS parametrizable)
    const corsOrigins = (env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:8550')
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

    // Exponer OpenAPI spec
    app.get('/openapi.yaml', (_req, res) => {
      const fs = require('fs');
      const candidates = [
        path.resolve(__dirname, '../openapi.yaml'),
        path.resolve(process.cwd(), 'apps/documentos/openapi.yaml'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          return res.sendFile(p);
        }
      }
      res.status(404).send('openapi.yaml not found');
    });
    app.get('/openapi.json', (_req, res) => {
      try {
        const fs = require('fs');
        const yaml = require('yaml');
        const candidates = [
          path.resolve(__dirname, '../openapi.yaml'),
          path.resolve(process.cwd(), 'apps/documentos/openapi.yaml'),
        ];
        let yamlPath: string | null = null;
        for (const p of candidates) {
          if (fs.existsSync(p)) { yamlPath = p; break; }
        }
        if (!yamlPath) return res.status(404).json({ error: 'openapi.json not available' });
        const content = fs.readFileSync(yamlPath, 'utf8');
        const json = yaml.parse(content);
        res.json(json);
      } catch {
        res.status(404).json({ error: 'openapi.json not available' });
      }
    });

    // Swagger UI (documentación interactiva)
    try {
      const fs = require('fs');
      const swaggerUi = require('swagger-ui-express');
      const candidates = [
        path.resolve(__dirname, '../openapi.yaml'),
        path.resolve(process.cwd(), 'apps/documentos/openapi.yaml'),
      ];
      let yamlPath: string | null = null;
      for (const p of candidates) {
        if (fs.existsSync(p)) { yamlPath = p; break; }
      }
      if (!yamlPath) {
        AppLogger.warn('⚠️ Swagger UI no disponible');
      } else {
        // Montar UI apuntando al YAML para evitar parseo en servidor
        app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: '/openapi.yaml' } }));
      }
    } catch (_unused) {
      AppLogger.warn('⚠️ Swagger UI no disponible');
    }

    // Rutas principales
    app.use('/', routes);

    // Middleware de manejo de errores (debe ir al final)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Iniciar servidor
    server = httpServer.listen(env.DOCUMENTOS_PORT, () => {
      AppLogger.info(`✅ Microservicio Documentos escuchando en puerto ${env.DOCUMENTOS_PORT}`);
      AppLogger.info('🎯 Endpoints disponibles:');
      AppLogger.info('   📊 GET  /health - Health check');
      AppLogger.info('   📋 GET  /api/docs/templates - Plantillas');
      AppLogger.info('   ⚙️  GET  /api/docs/config/:dadorId - Configuración');
      AppLogger.info('   📄 POST /api/docs/documents/upload - Subir documentos');
      AppLogger.info('   📊 GET  /api/docs/documents/status - Estado documentos');
      AppLogger.info('   👁️  GET  /api/docs/documents/:id/preview - Preview documentos');
      AppLogger.info('   🚦 GET  /api/docs/dashboard/semaforos - Dashboard semáforos');
      AppLogger.info('   📈 GET  /api/docs/dashboard/stats - Estadísticas');
      AppLogger.info('   🚨 GET  /api/docs/dashboard/alerts - Vista alertas');
      AppLogger.info('   📊 GET  /metrics - Métricas Prometheus');
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
        server.close(() => {
          AppLogger.info('🔌 Servidor Express cerrado');
          resolve();
        });
      });
    }

          // Detener tareas programadas
      schedulerService.stop();

      // Cerrar WebSocket
      webSocketService.close();

      // Cerrar workers y colas
      await closeDocumentValidationWorker();
      await queueService.close();

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