/**
 * User Factory for Unit Tests
 * Provides factory functions to create test user data
 * 
 * Note: User data is stored in the main backend database, not in helpdesk.
 * This factory creates mock user objects for testing auth and permissions.
 */

import { AuthenticatedUser } from '../../middlewares/auth.middleware';

let userCounter = 0;

function generateUserId(): number {
  userCounter += 1;
  return userCounter;
}

export interface UserBuildOptions {
  id?: number;
  email?: string;
  role?: string;
  nombre?: string;
  apellido?: string;
  empresaId?: number;
  empresaNombre?: string | null;
}

/**
 * Build a single user with default values
 */
export function buildUser(options: UserBuildOptions = {}): AuthenticatedUser {
  const id = options.id ?? generateUserId();
  
  return {
    id,
    email: options.email ?? `user${id}@test.com`,
    role: options.role ?? 'USER',
    nombre: options.nombre ?? 'Test',
    apellido: options.apellido ?? 'User',
    empresaId: options.empresaId ?? 1,
    empresaNombre: options.empresaNombre ?? 'Test Company',
  };
}

/**
 * Build multiple users with default values
 */
export function buildUserList(count: number, options: UserBuildOptions = {}): AuthenticatedUser[] {
  return Array.from({ length: count }, (_, index) => {
    const id = (options.id ?? userCounter - count + 1) + index;
    return buildUser({
      ...options,
      id,
      email: `user${id}@test.com`,
      nombre: `User${index + 1}`,
    });
  });
}

/**
 * Build a regular user with USER role
 */
export function buildRegularUser(options: UserBuildOptions = {}): AuthenticatedUser {
  return buildUser({
    ...options,
    role: 'USER',
  });
}

/**
 * Build an admin user with SUPERADMIN role
 */
export function buildAdminUser(options: UserBuildOptions = {}): AuthenticatedUser {
  return buildUser({
    ...options,
    role: 'SUPERADMIN',
    email: options.email ?? 'admin@test.com',
    nombre: options.nombre ?? 'Admin',
  });
}

/**
 * Build a resolver user with RESOLVER role
 */
export function buildResolverUser(options: UserBuildOptions = {}): AuthenticatedUser {
  return buildUser({
    ...options,
    role: 'RESOLVER',
    email: options.email ?? 'resolver@test.com',
    nombre: options.nombre ?? 'Resolver',
  });
}

/**
 * Build a user linked to Telegram (has telegramId in metadata)
 * Note: This is for documentation purposes - telegramId is not in AuthenticatedUser
 */
export function buildUserWithTelegramLink(options: UserBuildOptions = {}): AuthenticatedUser & { telegramId?: number } {
  return {
    ...buildUser(options),
    telegramId: 123456789,
  };
}

/**
 * Build a user from a different company
 */
export function buildOtherCompanyUser(options: UserBuildOptions = {}): AuthenticatedUser {
  return buildUser({
    ...options,
    empresaId: options.empresaId ?? 2,
    empresaNombre: options.empresaNombre ?? 'Other Company',
    email: options.email ?? 'other@othercompany.com',
  });
}

/**
 * Build a user without company (independent user)
 */
export function buildIndependentUser(options: UserBuildOptions = {}): AuthenticatedUser {
  return buildUser({
    ...options,
    empresaId: undefined,
    empresaNombre: null,
  });
}

/**
 * Common test users for reuse across tests
 */
export const TEST_USERS = {
  /** Default regular user */
  regular: buildUser({ id: 1, email: 'user@test.com', nombre: 'Regular', apellido: 'User' }),
  
  /** Admin user with full permissions */
  admin: buildAdminUser({ id: 2 }),
  
  /** Resolver user for helpdesk staff */
  resolver: buildResolverUser({ id: 3 }),
  
  /** User from different company (for multi-tenant tests) */
  otherCompany: buildOtherCompanyUser({ id: 100 }),
  
  /** User linked to Telegram */
  withTelegram: buildUserWithTelegramLink({ id: 200 }),
} as const;

/**
 * Reset the user counter (useful for test isolation)
 */
export function resetUserCounter(): void {
  userCounter = 0;
}
