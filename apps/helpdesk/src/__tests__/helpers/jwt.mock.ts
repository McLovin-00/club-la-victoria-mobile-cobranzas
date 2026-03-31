/**
 * JWT Mock Helper for Unit Tests
 * Provides utilities for generating test JWT tokens
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { AuthenticatedUser } from '../../middlewares/auth.middleware';

// Load test keys (these should be the same as used in development)
const KEYS_DIR = path.resolve(__dirname, '../../../../../keys');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'jwt-dev-public.pem');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'jwt-dev-private.pem');

let privateKeyCache: string | null = null;
let publicKeyCache: string | null = null;
let useHS256 = false;

/**
 * Load the private key for signing tokens
 */
function getPrivateKey(): string {
  if (privateKeyCache) return privateKeyCache;
  
  // Try to load from file
  if (fs.existsSync(PRIVATE_KEY_PATH)) {
    privateKeyCache = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    return privateKeyCache;
  }
  
  // Fallback to env variable
  if (process.env.JWT_PRIVATE_KEY) {
    privateKeyCache = process.env.JWT_PRIVATE_KEY;
    return privateKeyCache;
  }
  
  // Use HS256 with a test secret for unit tests (simpler than RSA)
  useHS256 = true;
  console.warn('No JWT private key found, using HS256 with test secret for unit tests');
  return 'test-secret-key-for-unit-tests-only';
}

/**
 * Load the public key for verifying tokens
 */
export function getPublicKey(): string {
  if (publicKeyCache) return publicKeyCache;
  
  // Try to load from file
  if (fs.existsSync(PUBLIC_KEY_PATH)) {
    publicKeyCache = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    return publicKeyCache;
  }
  
  // Fallback to env variable
  if (process.env.JWT_PUBLIC_KEY) {
    publicKeyCache = process.env.JWT_PUBLIC_KEY;
    return publicKeyCache;
  }
  
  // Return test secret for HS256
  return 'test-secret-key-for-unit-tests-only';
}

/**
 * Check if we're using HS256 fallback
 */
export function isUsingHS256(): boolean {
  return useHS256;
}

export interface TestTokenOptions {
  /** Token expiration time (default: '1h') */
  expiresIn?: string;
  /** Include userId instead of id (for backward compatibility) */
  useUserIdField?: boolean;
  /** Custom payload overrides */
  payload?: Record<string, any>;
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(user: Partial<AuthenticatedUser> = {}, tokenOptions: TestTokenOptions = {}): string {
  const {
    expiresIn = '1h',
    useUserIdField = false,
    payload = {},
  } = tokenOptions;
  
  // Ensure private key is loaded (sets useHS256 flag)
  const secret = getPrivateKey();
  
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
  
  const tokenPayload: Record<string, any> = {
    ...(useUserIdField ? { userId: defaultUser.id } : { id: defaultUser.id }),
    email: defaultUser.email,
    role: defaultUser.role,
    nombre: defaultUser.nombre,
    apellido: defaultUser.apellido,
    empresaId: defaultUser.empresaId,
    empresaNombre: defaultUser.empresaNombre,
    ...payload,
  };
  
  // Use HS256 for tests if no RSA keys available, otherwise RS256
  const signOptions: jwt.SignOptions = {
    algorithm: useHS256 ? 'HS256' : 'RS256',
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  };
  
  return jwt.sign(tokenPayload, secret, signOptions);
}

/**
 * Generate a token for a regular user
 */
export function generateUserToken(userId: number = 1, empresaId: number = 1): string {
  return generateTestToken({
    id: userId,
    role: 'USER',
    empresaId,
  });
}

/**
 * Generate a token for an admin user
 */
export function generateAdminToken(userId: number = 2): string {
  return generateTestToken({
    id: userId,
    role: 'SUPERADMIN',
    email: 'admin@test.com',
  });
}

/**
 * Generate a token for a resolver user
 */
export function generateResolverToken(userId: number = 3): string {
  return generateTestToken({
    id: userId,
    role: 'RESOLVER',
    email: 'resolver@test.com',
  });
}

/**
 * Generate an expired token (for testing token expiration)
 */
export function generateExpiredToken(user: Partial<AuthenticatedUser> = {}): string {
  // Ensure private key is loaded
  const secret = getPrivateKey();
  
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
  
  // Create a token that expired 1 hour ago
  const payload = {
    id: defaultUser.id,
    email: defaultUser.email,
    role: defaultUser.role,
    nombre: defaultUser.nombre,
    apellido: defaultUser.apellido,
    empresaId: defaultUser.empresaId,
    empresaNombre: defaultUser.empresaNombre,
    iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
  };
  
  const alg = useHS256 ? 'HS256' : 'RS256';
  
  // Manually construct the JWT to preserve our custom exp
  const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Sign just the header.payload part to get a valid signature
  const signature = jwt.sign({ dummy: true }, secret, { algorithm: alg }).split('.')[2];
  
  return `${header}.${payloadB64}.${signature}`;
}

/**
 * Generate an invalid token (wrong signature)
 */
export function generateInvalidToken(user: Partial<AuthenticatedUser> = {}): string {
  const payload = {
    id: user.id ?? 1,
    email: user.email ?? 'test@example.com',
    role: user.role ?? 'USER',
  };
  
  // Sign with a different secret (not the private key)
  return jwt.sign(payload, 'wrong-secret-key', {
    algorithm: 'HS256', // Different algorithm
    expiresIn: '1h',
  });
}

/**
 * Generate a token without user ID (invalid payload)
 */
export function generateTokenWithoutUserId(): string {
  const payload = {
    email: 'test@example.com',
    role: 'USER',
    // Missing id/userId
  };
  
  return jwt.sign(payload, getPrivateKey(), {
    algorithm: useHS256 ? 'HS256' : 'RS256',
    expiresIn: '1h',
  });
}

/**
 * Verify a test token and return the payload
 */
export function verifyTestToken(token: string): any {
  return jwt.verify(token, getPublicKey(), {
    algorithms: useHS256 ? ['HS256'] : ['RS256'],
  });
}

/**
 * Create authorization header value for HTTP requests
 */
export function createAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Create authorization header with a test user token
 */
export function createTestAuthHeader(user: Partial<AuthenticatedUser> = {}): string {
  return createAuthHeader(generateTestToken(user));
}

/**
 * Create authorization header with an admin token
 */
export function createAdminAuthHeader(): string {
  return createAuthHeader(generateAdminToken());
}

/**
 * Create authorization header with a resolver token
 */
export function createResolverAuthHeader(): string {
  return createAuthHeader(generateResolverToken());
}

/**
 * Mock the getPublicKey function in auth middleware
 */
export function mockAuthPublicKey(): void {
  jest.mock('../../config/environment', () => ({
    getEnvironment: () => ({
      JWT_PUBLIC_KEY: getPublicKey(),
      JWT_PUBLIC_KEY_PATH: null,
    }),
  }));
}
