import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { AuthRequest, AuthUser } from '../types';
import { createError } from './error.middleware';
import { AppLogger } from '../config/logger';

// Cargar JWT_PUBLIC_KEY desde archivo o variable de entorno
function loadJwtPublicKey(): string {
  // Primero intentar desde PATH
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    try {
      return fs.readFileSync(keyPath, 'utf-8');
    } catch (err) {
      AppLogger.error('❌ Error leyendo JWT_PUBLIC_KEY_PATH:', err);
    }
  }
  // Fallback a variable directa
  return process.env.JWT_PUBLIC_KEY || '';
}

const JWT_PUBLIC_KEY = loadJwtPublicKey();

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError('Token de autenticación requerido', 401, 'UNAUTHORIZED');
    }
    
    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, { 
      algorithms: ['RS256'] 
    }) as any;
    
    // Mapear campos del JWT al formato esperado
    req.user = {
      id: decoded.userId || decoded.id || decoded.sub,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      empresaId: decoded.empresaId,
      tenantId: decoded.empresaId, // tenantId = empresaId
      dadorId: decoded.dadorCargaId,
      dadorCargaId: decoded.dadorCargaId,
      choferId: decoded.choferId,
      empresaTransportistaId: decoded.empresaTransportistaId,
    };
    next();
  } catch (error) {
    if ((error as any).name === 'JsonWebTokenError') {
      res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Token inválido' });
      return;
    }
    if ((error as any).name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'TOKEN_EXPIRED', message: 'Token expirado' });
      return;
    }
    next(error);
  }
}

export function authorize(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'No autenticado' });
      return;
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      AppLogger.warn(`🚫 Acceso denegado: ${req.user.email} (${req.user.role}) intentó acceder a recurso restringido`);
      res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Acceso denegado' });
      return;
    }
    
    next();
  };
}

// Roles que pueden subir remitos
export const ROLES_UPLOAD = ['SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER'];

// Roles que pueden aprobar/rechazar
export const ROLES_APPROVE = ['SUPERADMIN', 'ADMIN_INTERNO'];

// Roles que pueden ver todos los remitos
export const ROLES_VIEW_ALL = ['SUPERADMIN', 'ADMIN_INTERNO'];

// Roles que pueden configurar
export const ROLES_CONFIG = ['SUPERADMIN'];

