import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  nombre?: string;
  apellido?: string;
  empresaId?: number;
  empresaNombre?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

let publicKey: string | null = null;

const getPublicKey = (): string => {
  if (publicKey) return publicKey;

  const env = getEnvironment();

  // Option 1: Direct key in env
  if (env.JWT_PUBLIC_KEY) {
    publicKey = env.JWT_PUBLIC_KEY;
    return publicKey;
  }

  // Option 2: Key from file path
  if (env.JWT_PUBLIC_KEY_PATH) {
    const keyPath = path.resolve(process.cwd(), env.JWT_PUBLIC_KEY_PATH);
    if (fs.existsSync(keyPath)) {
      publicKey = fs.readFileSync(keyPath, 'utf8');
      return publicKey;
    }
  }

  // Option 3: Try default paths
  const defaultPaths = [
    path.resolve(process.cwd(), 'keys/jwt-dev-public.pem'),
    path.resolve(process.cwd(), '../../keys/jwt-dev-public.pem'),
    path.resolve(__dirname, '../../../keys/jwt-dev-public.pem'),
  ];

  for (const keyPath of defaultPaths) {
    if (fs.existsSync(keyPath)) {
      publicKey = fs.readFileSync(keyPath, 'utf8');
      return publicKey;
    }
  }

  throw new Error('JWT public key not found. Set JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH');
};

/**
 * Middleware de autenticación JWT RS256
 * Valida el token y adjunta el usuario a req.user
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido',
        error: 'MISSING_TOKEN',
      });
      return;
    }

    const token = authHeader.substring(7);
    const pubKey = getPublicKey();

    const decoded = jwt.verify(token, pubKey, {
      algorithms: ['RS256'],
    }) as AuthenticatedUser & { userId?: number; empresaNombre?: string | null };

    const numericId = decoded.id ?? decoded.userId;
    if (numericId === undefined || typeof numericId !== 'number' || !Number.isFinite(numericId)) {
      res.status(401).json({
        success: false,
        message: 'Token inválido: falta identificador de usuario',
        error: 'INVALID_TOKEN',
      });
      return;
    }

    req.user = {
      id: numericId,
      email: decoded.email,
      role: decoded.role,
      nombre: decoded.nombre,
      apellido: decoded.apellido,
      empresaId: decoded.empresaId,
      empresaNombre: decoded.empresaNombre ?? null,
    };
    next();
  } catch (error) {
    AppLogger.warn('Token inválido:', { error: error instanceof Error ? error.message : error });

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: 'TOKEN_EXPIRED',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: 'INVALID_TOKEN',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Error de autenticación',
      error: 'AUTH_ERROR',
    });
  }
};

/**
 * Middleware opcional - no falla si no hay token
 */
export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const pubKey = getPublicKey();

      const decoded = jwt.verify(token, pubKey, {
        algorithms: ['RS256'],
      }) as AuthenticatedUser & { userId?: number; empresaNombre?: string | null };

      const numericId = decoded.id ?? decoded.userId;
      if (numericId !== undefined && typeof numericId === 'number' && Number.isFinite(numericId)) {
        req.user = {
          id: numericId,
          email: decoded.email,
          role: decoded.role,
          nombre: decoded.nombre,
          apellido: decoded.apellido,
          empresaId: decoded.empresaId,
          empresaNombre: decoded.empresaNombre ?? null,
        };
      }
    }
    next();
  } catch {
    // Ignorar errores en auth opcional
    next();
  }
};
