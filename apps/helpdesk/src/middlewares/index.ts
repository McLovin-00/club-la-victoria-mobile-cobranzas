import { Request, Response, NextFunction } from 'express';

export * from './auth.middleware';

// Re-export types
export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  nombre?: string;
  apellido?: string;
  empresaId?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Type guard para verificar si request tiene usuario
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return 'user' in req && req.user !== undefined;
}

// Helper para extraer usuario del request con tipado
export function getAuthenticatedUser(req: Request): AuthenticatedUser | null {
  if (isAuthenticatedRequest(req) && req.user) {
    return req.user ?? null;
  }
  return null;
}
