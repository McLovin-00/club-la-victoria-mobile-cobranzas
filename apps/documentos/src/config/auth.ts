import * as jwt from 'jsonwebtoken';
import { UserRole } from '../types/roles';
import { AppLogger } from './logger';
import { getEnvironment } from './environment';

// Interfaces compartidas con el backend principal
export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
  empresaId?: number | null;
  // Asociaciones por rol
  dadorCargaId?: number | null;
  empresaTransportistaId?: number | null;
  choferId?: number | null;
  clienteId?: number | null;
}

/** Extrae y valida un AuthPayload de un token decodificado */
function extractAuthPayload(decoded: any): AuthPayload | null {
  if (!decoded.userId || !decoded.email || !decoded.role) return null;
  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    empresaId: decoded.empresaId || null,
    dadorCargaId: decoded.dadorCargaId || null,
    empresaTransportistaId: decoded.empresaTransportistaId || null,
    choferId: decoded.choferId || null,
    clienteId: decoded.clienteId || null,
  };
}

// Servicio de autenticación minimalista
export class DocumentosAuthService {
  private static publicKey: string;
  private static legacySecret: string | null = null;

  private static getJwtPublicKey(): string {
    if (!this.publicKey) {
      const env = getEnvironment();
      let raw = env.JWT_PUBLIC_KEY;
      if (!raw && env.JWT_PUBLIC_KEY_PATH) {
        try {
          const fs = require('fs');
          raw = fs.readFileSync(env.JWT_PUBLIC_KEY_PATH, 'utf8');
        } catch (_unused) { /* noop */ }
      }
      if (!raw) {
        throw new Error('JWT_PUBLIC_KEY is required (or JWT_PUBLIC_KEY_PATH)');
      }
      this.publicKey = raw.includes('-----BEGIN') ? raw : raw.replace(/\\n/g, '\n');
    }
    return this.publicKey;
  }

  private static getLegacySecret(): string | null {
    if (this.legacySecret !== null) return this.legacySecret;
    const env = getEnvironment();
    this.legacySecret = env.JWT_LEGACY_SECRET || null;
    return this.legacySecret;
  }

  /**
   * Verificar token JWT - Elegancia en su forma más pura
   */
  public static async verifyToken(token: string): Promise<AuthPayload | null> {
    try {
      const decoded = jwt.verify(token, this.getJwtPublicKey(), { algorithms: ['RS256'] }) as any;
      const payload = extractAuthPayload(decoded);
      if (!payload) {
        AppLogger.warn('Token JWT con estructura inválida');
        return null;
      }
      AppLogger.debug('Token JWT verificado exitosamente', { userId: payload.userId, email: payload.email, role: payload.role });
      return payload;
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        AppLogger.warn('Token RS256 inválido (HS256 deshabilitado en producción)');
        return null;
      }

      const secret = this.getLegacySecret();
      if (secret) {
        try {
          const decoded: any = jwt.verify(token, secret, { algorithms: ['HS256'] });
          const payload = extractAuthPayload(decoded);
          if (!payload) {
            AppLogger.warn('Token JWT (legacy) con estructura inválida');
            return null;
          }
          AppLogger.warn('Token HS256 aceptado por compatibilidad temporal — deshabilitado en producción');
          return payload;
        } catch (e2) {
          AppLogger.warn('Token JWT inválido:', e2);
          return null;
        }
      }
      AppLogger.warn('Token JWT inválido:', err);
      return null;
    }
  }

  /**
   * Verificar si el usuario tiene acceso a una empresa específica
   */
  public static hasEmpresaAccess(user: AuthPayload, targetEmpresaId: number): boolean {
    // Superadmin tiene acceso total
    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    // Admin y operadores solo a su empresa
    if (user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR) {
      return user.empresaId === targetEmpresaId;
    }

    return false;
  }

  /**
   * Verificar si el servicio documentos está habilitado
   */
  public static isServiceEnabled(): boolean {
    return getEnvironment().ENABLE_DOCUMENTOS;
  }
}