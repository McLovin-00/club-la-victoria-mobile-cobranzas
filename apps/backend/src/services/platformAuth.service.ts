import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';
import { prismaService } from '../config/prisma';

// --- TIPOS DERIVADOS DE PRISMA ---
// Esta es la forma más robusta de obtener tipos de modelos con relaciones incluidas.
// Asegura que si el schema.prisma cambia, estos tipos se actualizan automáticamente.
export type PlatformUserWithRelations = Prisma.UserGetPayload<{}>;

// --- INTERFACES PARA LA LÓGICA DE NEGOCIO ---

export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
  empresaId?: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role?: UserRole;
  empresaId?: number | null;
  nombre?: string;
  apellido?: string;
}

export interface PlatformUserProfile {
  id: number;
  email: string;
  role: UserRole;
  empresaId?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  empresa?: {
    id: number;
    nombre: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  platformUser?: PlatformUserProfile;
  message?: string;
}

/**
 * Servicio de autenticación y gestión de perfiles para PlatformUser.
 * Lógica de negocio centralizada, profesional y robusta.
 */
export class PlatformAuthService {
  private static readonly SALT_ROUNDS = 12;
  private static privateKey: string;
  private static publicKey: string;
  private static legacySecret: string | null = null;

  // --- SOLUCIÓN DEFINITIVA AL ERROR DE TIPOS DE JWT ---
  // Manejamos tanto valores en segundos como strings como "7d", "1h", etc.
  private static getJwtExpiresIn(): string | number {
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d'); // Default: 7 días
    
    // Si es solo números, lo interpretamos como segundos
    if (/^\d+$/.test(expiresIn)) {
      return parseInt(expiresIn, 10);
    }
    
    // Si es un string con formato de tiempo (7d, 1h, etc.), lo usamos directamente
    return expiresIn;
  }

  private static getJwtOptions(): SignOptions {
    const expiresIn = PlatformAuthService.getJwtExpiresIn();
    return {
      expiresIn: expiresIn as any,
      algorithm: 'RS256',
    };
  }

  private static getPrivateKey(): string {
    if (!this.privateKey) {
      const env = getEnvironment();
      const raw = env.jwtPrivateKey || env.JWT_PRIVATE_KEY || (env.JWT_PRIVATE_KEY_PATH ? require('fs').readFileSync(env.JWT_PRIVATE_KEY_PATH, 'utf8') : undefined);
      if (!raw) throw new Error('JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH is required');
      this.privateKey = raw.includes('-----BEGIN') ? raw : raw.replace(/\\n/g, '\n');
    }
    return this.privateKey;
  }

  private static getPublicKey(): string {
    if (!this.publicKey) {
      const env = getEnvironment();
      const raw = env.jwtPublicKey || env.JWT_PUBLIC_KEY || (env.JWT_PUBLIC_KEY_PATH ? require('fs').readFileSync(env.JWT_PUBLIC_KEY_PATH, 'utf8') : undefined);
      if (!raw) throw new Error('JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH is required');
      this.publicKey = raw.includes('-----BEGIN') ? raw : raw.replace(/\\n/g, '\n');
    }
    return this.publicKey;
  }

  private static getLegacySecret(): string | null {
    if (this.legacySecret !== null) return this.legacySecret;
    const env = getEnvironment();
    this.legacySecret = env.JWT_LEGACY_SECRET || process.env.JWT_SECRET || null;
    return this.legacySecret;
  }

  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;
    const prisma = prismaService.getClient();

    const platformUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!platformUser) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    const isPasswordValid = await bcrypt.compare(password, platformUser.password);
    if (!isPasswordValid) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    const payload: AuthPayload = {
      userId: platformUser.id,
      email: platformUser.email,
      role: platformUser.role,
      empresaId: platformUser.empresaId,
    };
    const token = this.generateToken(payload);

    return {
      success: true,
      token,
      platformUser: this.formatUserProfile(platformUser),
    };
  }

  static async register(registerData: RegisterData, createdBy: PlatformUserProfile): Promise<AuthResponse> {
    this.validateRegistrationPermissions(createdBy, registerData.role || 'OPERATOR');

    const prisma = prismaService.getClient();
    const { email, password, role, empresaId, nombre, apellido } = registerData;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return { success: false, message: 'El email ya está en uso' };
    }

    const hashedPassword = await this.hashPassword(password);
    const finalEmpresaId = this.determineFinalEmpresaId(role, empresaId, createdBy);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: (role as UserRole) || 'OPERATOR',
        empresaId: finalEmpresaId,
        nombre,
        apellido,
      },

    });

    return {
      success: true,
      platformUser: this.formatUserProfile(newUser as PlatformUserWithRelations),
    };
  }

  static async verifyToken(token: string): Promise<AuthPayload | null> {
    try {
      return jwt.verify(token, this.getPublicKey(), { algorithms: ['RS256'] }) as AuthPayload;
    } catch (error) {
      // Fallback temporal HS256
      const secret = this.getLegacySecret();
      if (secret) {
        try {
          return jwt.verify(token, secret, { algorithms: ['HS256'] }) as AuthPayload;
        } catch (e2) {
          AppLogger.warn('Error al verificar token JWT (legacy HS256)', { error: e2 });
          return null;
        }
      }
      AppLogger.warn('Error al verificar token JWT', { error });
      return null;
    }
  }

  static async getUserProfile(userId: number): Promise<PlatformUserProfile | null> {
    const prisma = prismaService.getClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user ? this.formatUserProfile(user) : null;
  }

  static async updatePlatformUser(id: number, data: Partial<RegisterData & { role: UserRole }>, actor: PlatformUserProfile): Promise<PlatformUserProfile> {
    const prisma = prismaService.getClient();
    // Reglas: ADMIN no puede elevar roles ni modificar fuera de su empresa
    if (actor.role === 'ADMIN') {
      if (data.role && data.role !== 'OPERATOR') {
        throw new Error('Un administrador no puede cambiar el rol a ADMIN o SUPERADMIN');
      }
      if (data.empresaId && data.empresaId !== actor.empresaId) {
        throw new Error('No puede asignar otra empresa');
      }
    }

    const update: any = { ...data };
    if (data.password) {
      update.password = await this.hashPassword(data.password);
    }
    if (data.email) {
      update.email = data.email.toLowerCase().trim();
    }

    const user = await prisma.user.update({ where: { id }, data: update });
    return this.formatUserProfile(user);
  }

  static async deletePlatformUser(id: number, actor: PlatformUserProfile): Promise<void> {
    const prisma = prismaService.getClient();
    if (actor.role !== 'SUPERADMIN') {
      throw new Error('Solo superadmin puede eliminar usuarios');
    }
    await prisma.user.delete({ where: { id } });
  }

  static async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const prisma = prismaService.getClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, message: 'La contraseña actual es incorrecta' };
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  }

  private static generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, this.getPrivateKey(), this.getJwtOptions());
  }

  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  private static formatUserProfile(user: PlatformUserWithRelations): PlatformUserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      empresaId: user.empresaId,
      nombre: user.nombre,
      apellido: user.apellido,
      empresa: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private static validateRegistrationPermissions(createdBy: PlatformUserProfile, role: UserRole): void {
    if (createdBy.role === 'ADMIN' && (role === 'SUPERADMIN' || role === 'ADMIN')) {
      throw new Error('Un administrador no puede crear otros administradores o superadministradores.');
    }
  }

  private static determineFinalEmpresaId(role: UserRole | undefined, requestedEmpresaId: number | null | undefined, createdBy: PlatformUserProfile): number | null {
    if (createdBy.role === 'SUPERADMIN') {
      // Si el superadmin NO especifica empresaId, usar su propia empresa como contexto
      // Esto permite crear usuarios asociados a la empresa que el superadmin está gestionando
      return requestedEmpresaId !== undefined ? requestedEmpresaId : (createdBy.empresaId || null);
    }

    // Para ADMIN, siempre usar su propia empresa
    return createdBy.empresaId || null;
  }
} 