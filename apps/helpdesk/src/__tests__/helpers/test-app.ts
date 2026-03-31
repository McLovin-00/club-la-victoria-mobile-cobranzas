/**
 * Express App Factory for Integration Tests
 * Creates a configured Express app with middleware setup for testing
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AuthenticatedUser } from '../../middlewares/auth.middleware';

export interface TestAppOptions {
  /** Skip authentication middleware (default: true for unit tests) */
  skipAuth?: boolean;
  /** Mock user to attach to requests (used when skipAuth is false) */
  mockUser?: AuthenticatedUser;
  /** Include CORS middleware (default: false) */
  includeCors?: boolean;
  /** Include Helmet middleware (default: false) */
  includeHelmet?: boolean;
  /** Body parser limit (default: '10mb') */
  bodyLimit?: string;
}

/**
 * Create an Express app configured for testing
 */
export function createTestApp(options: TestAppOptions = {}): Express {
  const {
    skipAuth = true,
    mockUser,
    includeCors = false,
    includeHelmet = false,
    bodyLimit = '10mb',
  } = options;

  const app = express();

  // Basic middleware
  if (includeHelmet) {
    app.use(helmet());
  }
  
  if (includeCors) {
    app.use(cors({
      origin: '*',
      credentials: true,
    }));
  }

  // Body parsing
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Mock authentication middleware
  if (!skipAuth) {
    app.use((req, _res, next) => {
      if (mockUser) {
        (req as express.Request & { user?: AuthenticatedUser }).user = mockUser;
      }
      next();
    });
  }

  return app;
}

/**
 * Create an authenticated test app with a mock user
 */
export function createAuthenticatedTestApp(
  user: Partial<AuthenticatedUser> = {}
): Express {
  const defaultUser: AuthenticatedUser = {
    id: 1,
    email: 'test@example.com',
    role: 'USER',
    nombre: 'Test',
    apellido: 'User',
    empresaId: 1,
    empresaNombre: 'Test Company',
    ...user,
  };

  return createTestApp({
    skipAuth: false,
    mockUser: defaultUser,
  });
}

/**
 * Create an admin test app with SUPERADMIN role
 */
export function createAdminTestApp(
  user: Partial<AuthenticatedUser> = {}
): Express {
  return createAuthenticatedTestApp({
    role: 'SUPERADMIN',
    ...user,
  });
}

/**
 * Create a resolver test app with RESOLVER role
 */
export function createResolverTestApp(
  user: Partial<AuthenticatedUser> = {}
): Express {
  return createAuthenticatedTestApp({
    role: 'RESOLVER',
    ...user,
  });
}

/**
 * Default test users for common scenarios
 */
export const TEST_USERS = {
  user: {
    id: 1,
    email: 'user@test.com',
    role: 'USER' as const,
    nombre: 'Regular',
    apellido: 'User',
    empresaId: 1,
    empresaNombre: 'Test Company',
  },
  admin: {
    id: 2,
    email: 'admin@test.com',
    role: 'SUPERADMIN' as const,
    nombre: 'Admin',
    apellido: 'User',
    empresaId: 1,
    empresaNombre: 'Test Company',
  },
  resolver: {
    id: 3,
    email: 'resolver@test.com',
    role: 'RESOLVER' as const,
    nombre: 'Resolver',
    apellido: 'User',
    empresaId: 1,
    empresaNombre: 'Test Company',
  },
  otherCompanyUser: {
    id: 4,
    email: 'other@test.com',
    role: 'USER' as const,
    nombre: 'Other',
    apellido: 'Company',
    empresaId: 2,
    empresaNombre: 'Other Company',
  },
} as const;
