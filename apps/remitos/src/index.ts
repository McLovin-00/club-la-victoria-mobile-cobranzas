import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import { createServer } from 'http';
import { AppLogger } from './config/logger';
import { getEnvironment, isServiceEnabled } from './config/environment';
import { db } from './config/database';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { startAnalysisWorker, stopAnalysisWorker } from './workers/analysis.worker';
import { queueService } from './services/queue.service';
import { ConfigService } from './services/config.service';
import routes from './routes';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

let server: any;
const appVersion = process.env.APP_VERSION || '1.0.0';

export const main = async (): Promise<void> => {
  try {
    if (!isServiceEnabled()) {
      AppLogger.warn('⚠️ Microservicio Remitos DESHABILITADO (ENABLE_REMITOS=false)');
      return;
    }
    
    const env = getEnvironment();
    
    AppLogger.info('🚀 Iniciando Microservicio Remitos...');
    AppLogger.info(`📄 Versión: ${appVersion}`);
    AppLogger.info(`🌍 Entorno: ${env.NODE_ENV}`);
    AppLogger.info(`🔌 Puerto: ${env.REMITOS_PORT}`);
    
    // Conectar a base de datos
    await db.connect();
    
    // Inicializar configuraciones por defecto
    await ConfigService.initializeDefaults();
    AppLogger.info('🔧 Configuraciones inicializadas');
    
    // Iniciar worker de análisis
    startAnalysisWorker();
    AppLogger.info('🔄 Worker de análisis iniciado');
    
    // Configurar Express
    const app = express();
    try { app.set('trust proxy', 1); } catch { /* ignore */ }
    const httpServer = createServer(app);
    
    // CORS
    const corsOrigins = (env.FRONTEND_URLS || 'http://localhost:8550')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    
    const corsOptions: CorsOptions = {
      origin: corsOrigins,
      credentials: true,
      exposedHeaders: ['Content-Disposition'],
    };
    app.use(cors(corsOptions));
    
    // Middleware
    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Rutas
    app.use('/', routes);
    
    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);
    
    // Iniciar servidor
    server = httpServer.listen(env.REMITOS_PORT, () => {
      AppLogger.info(`✅ Microservicio Remitos escuchando en puerto ${env.REMITOS_PORT}`);
      AppLogger.info('🎯 Endpoints disponibles:');
      AppLogger.info('   📊 GET  /health - Health check');
      AppLogger.info('   📋 GET  /api/remitos - Listar remitos');
      AppLogger.info('   📤 POST /api/remitos - Subir remito');
      AppLogger.info('   📄 GET  /api/remitos/:id - Detalle remito');
      AppLogger.info('   ✅ POST /api/remitos/:id/approve - Aprobar');
      AppLogger.info('   ❌ POST /api/remitos/:id/reject - Rechazar');
      AppLogger.info('   ⚙️  GET  /api/remitos/config/flowise - Config');
    });
    
  } catch (error) {
    AppLogger.error('💥 Error crítico al iniciar microservicio:', error);
    process.exit(1);
  }
};

// Graceful shutdown
export const gracefulShutdown = async (signal: string): Promise<void> => {
  AppLogger.info(`📴 Recibida señal ${signal}, cerrando...`);
  
  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          AppLogger.info('🔌 Servidor cerrado');
          resolve();
        });
      });
    }
    
    await stopAnalysisWorker();
    await queueService.close();
    await db.disconnect();
    
    AppLogger.info('✅ Microservicio cerrado correctamente');
    process.exit(0);
  } catch (error) {
    AppLogger.error('❌ Error durante cierre:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

main();

