import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService, TokenPayload } from '../services/auth.service';
import { AppLogger } from '../config/logger';

// Función para verificar token JWT
let CACHED_PUBLIC_KEY: string | null = null;
let CACHED_LEGACY_SECRET: string | null | undefined = undefined;
const getPublicKey = (): string => {
  if (!CACHED_PUBLIC_KEY) {
    let raw = process.env.JWT_PUBLIC_KEY;
    if (!raw && process.env.JWT_PUBLIC_KEY_PATH) {
      try {
        const fs = require('fs');
        raw = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, 'utf8');
      } catch (_e) {}
    }
    if (!raw) throw new Error('JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH is required');
    CACHED_PUBLIC_KEY = raw.includes('-----BEGIN') ? raw : raw.replace(/\n/g, '\n');
  }
  return CACHED_PUBLIC_KEY;
};
const getLegacySecret = (): string | null => {
  if (CACHED_LEGACY_SECRET !== undefined) return CACHED_LEGACY_SECRET;
  CACHED_LEGACY_SECRET = process.env.JWT_LEGACY_SECRET || process.env.JWT_SECRET || null;
  return CACHED_LEGACY_SECRET;
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] }) as TokenPayload;
  } catch (_error) {
    const legacy = getLegacySecret();
    if (legacy) {
      try {
        return jwt.verify(token, legacy, { algorithms: ['HS256'] }) as TokenPayload;
      } catch (_e) {
        return null;
      }
    }
    return null;
  }
};

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    AppLogger.debug('Token decodificado correctamente', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    // Verificar que el usuario exista en la base de datos
    const user = await authService.getProfile(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    // Añadir información del usuario al request
    (req as any).user = user;

    AppLogger.debug('Usuario autenticado correctamente', {
      id: (req as any).user.id,
      email: (req as any).user.email,
      role: (req as any).user.role,
    });

    next();
  } catch (_error) {
    AppLogger.error('Error en authenticateToken', {
      error: _error instanceof Error ? _error.message : 'Error desconocido',
      stack: _error instanceof Error ? _error.stack : undefined,
    });
    return res.status(500).json({ message: 'Error al autenticar token' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  AppLogger.debug('isAdmin middleware ejecutándose', {
    user: user
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      : null,
    method: req.method,
    url: req.url,
  });

  if (!user) {
    AppLogger.warn('Acceso denegado: usuario no autenticado', { url: req.url });
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (user.role !== 'admin' && user.role !== 'superadmin') {
    AppLogger.warn('Acceso denegado: rol insuficiente', {
      userId: user.id,
      email: user.email,
      role: user.role,
      url: req.url,
    });
    return res.status(403).json({ message: 'Requiere rol de administrador' });
  }

  AppLogger.debug('Acceso permitido: usuario es admin/superadmin', {
    userId: user.id,
    role: user.role,
  });

  next();
};

export const isSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  AppLogger.debug('isSuperAdmin middleware ejecutándose', {
    userId: user?.id,
    role: user?.role,
    method: req.method,
    url: req.url,
  });

  if (!user) {
    AppLogger.warn('Intento de acceso a isSuperAdmin sin autenticación', { ip: req.ip });
    return res.status(401).json({ message: 'No autenticado' });
  }

  // Solo superadmin puede acceder
  if (user.role !== 'superadmin') {
    AppLogger.warn('Intento de acceso a isSuperAdmin con rol insuficiente', {
      userId: user.id,
      role: user.role,
      ip: req.ip,
    });
    return res.status(403).json({ message: 'Solo superadministradores pueden acceder' });
  }

  AppLogger.debug('Acceso permitido a isSuperAdmin', { userId: user.id });
  next();
};

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  AppLogger.debug('isAuthenticated middleware ejecutándose', {
    user: user
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      : null,
    method: req.method,
    url: req.url,
  });

  if (!user) {
    AppLogger.warn('Acceso denegado: usuario no autenticado', { url: req.url });
    return res.status(401).json({ message: 'No autenticado' });
  }

  AppLogger.debug('Acceso permitido: usuario autenticado', {
    userId: user.id,
    role: user.role,
  });

  next();
};
