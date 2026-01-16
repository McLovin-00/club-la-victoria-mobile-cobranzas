// Configuraciones de Node.js
process.env.NODE_OPTIONS = '--max_old_space_size=4096';

import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { AppLogger } from './config/logger';
import { initializeApp } from './app';
import { getEnvironment } from './config/environment';

// Priorizar PORT si viene del entorno, luego BACKEND_PORT, default 4800
const env = getEnvironment();
const PORT = Number(process.env.PORT || env.BACKEND_PORT || 4800);

// Función principal para iniciar el servidor
export const startServer = async () => {
  try {
    const port = PORT;
    const app = await initializeApp();

    const server = app.listen(port, () => {
      AppLogger.info(`🚀 Server running on port ${port}`);
      AppLogger.info(`📱 Frontend URLs: ${(env.FRONTEND_URLS || env.FRONTEND_URL || '')}`);
      AppLogger.info(`🏗️ Environment: ${env.NODE_ENV}`);
      AppLogger.info('✅ Server ready to receive requests');
    });

    const gracefulShutdown = (signal: string) => {
      AppLogger.warn(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        AppLogger.info('Closed out remaining connections.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
      AppLogger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
        error: err.stack || err,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (_promise, reason) => {
      AppLogger.error('UNHANDLED REJECTION! 💥 Shutting down...', {
        error: reason,
      });
      process.exit(1);
    });
  } catch (error) {
    AppLogger.error('❌ Fatal error starting server:', {
      error: error instanceof Error ? error.stack : error,
    });
    process.exit(1);
  }
};

// Solo iniciar el servidor cuando se ejecuta como entrypoint (evita side-effects al importar en tests)
if (require.main === module) {
  startServer();
}
