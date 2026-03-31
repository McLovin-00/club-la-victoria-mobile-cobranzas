/**
 * Integration Test App Helper
 * Creates Express app with real routes and middleware for integration tests
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from '../../middlewares/error.middleware';
import routes from '../../routes';

export function createIntegrationTestApp(): express.Express {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for tests
  }));

  // CORS
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount routes
  app.use('/', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createIntegrationTestApp;
