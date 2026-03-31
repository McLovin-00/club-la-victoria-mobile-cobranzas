import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
  // Asociaciones por rol
  dadorCargaId?: number | null;
  empresaTransportistaId?: number | null;
  choferId?: number | null;
  clienteId?: number | null;
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
  telegramUsername?: string | null;
  // Asociaciones por rol
  dadorCargaId?: number | null;
  empresaTransportistaId?: number | null;
  choferId?: number | null;
  clienteId?: number | null;
}

export interface PlatformUserProfile {
  id: number;
  email: string;
  role: UserRole;
  empresaId?: number | null;
  mustChangePassword?: boolean | null;
  nombre?: string | null;
  apellido?: string | null;
  telegramUsername?: string | null;
  telegramUserId?: string | null;
  telegramLinkedAt?: Date | null;
  empresa?: {
    id: number;
    nombre: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  // Asociaciones por rol
  dadorCargaId?: number | null;
  empresaTransportistaId?: number | null;
  choferId?: number | null;
  clienteId?: number | null;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  platformUser?: PlatformUserProfile;
  message?: string;
  tempPassword?: string;
}

/**
 * Servicio de autenticación y gestión de perfiles para PlatformUser.
 * Lógica de negocio centralizada, profesional y robusta.
 */
const tokenBlacklist = new Map<string, number>();

function cleanupBlacklist(): void {
  const now = Date.now();
  for (const [token, expiresAt] of tokenBlacklist) {
    if (now > expiresAt) tokenBlacklist.delete(token);
  }
}

setInterval(cleanupBlacklist, 10 * 60 * 1000);

// ============================================================================
// REFRESH TOKENS
// ============================================================================
const REFRESH_TOKEN_DAYS = 30;

async function createRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  const prisma = prismaService.getClient();
  await prisma.refreshToken.create({
    data: { userId, token, expiresAt },
  });
  return token;
}

async function validateRefreshToken(token: string): Promise<number | null> {
  const prisma = prismaService.getClient();
  const record = await prisma.refreshToken.findUnique({
    where: { token },
    select: { userId: true, expiresAt: true, revokedAt: true },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) return null;
  return record.userId;
}

async function rotateRefreshToken(oldToken: string, userId: number): Promise<string> {
  const prisma = prismaService.getClient();
  await prisma.refreshToken.updateMany({
    where: { token: oldToken },
    data: { revokedAt: new Date() },
  });
  return createRefreshToken(userId);
}

async function revokeAllRefreshTokens(userId: number): Promise<void> {
  const prisma = prismaService.getClient();
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export class PlatformAuthService {
  private static readonly SALT_ROUNDS = 12;
  private static privateKey: string;
  private static publicKey: string;
  private static legacySecret: string | null = null;

  // --- SOLUCIÓN DEFINITIVA AL ERROR DE TIPOS DE JWT ---
  // Manejamos tanto valores en segundos como strings como "7d", "1h", etc.
  private static getJwtExpiresIn(): string | number {
    const expiresIn = (process.env.JWT_EXPIRES_IN || '1h');
    
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
      await bcrypt.compare(password, '$2b$12$Olf0Njlx54W8pdbeiNwgHui0yCmOqIkDO5dU3.x3UsY3JU5vRzwOm');
      return { success: false, message: 'Credenciales inválidas' };
    }

    if (platformUser.activo === false) {
      AppLogger.info('Intento de login a cuenta desactivada', { email: platformUser.email });
      return { success: false, message: 'Credenciales inválidas' };
    }

    const isLikelyBcryptHash = (value: string | null | undefined): boolean => {
      if (!value) return false;
      return value.length === 60 && /^\$2[aby]\$\d{2}\$/.test(value);
    };

    if (!isLikelyBcryptHash(platformUser.password)) {
      AppLogger.warn('Detectado hash de contraseña con formato inválido', {
        userId: platformUser.id,
        email: platformUser.email,
        currentLength: platformUser.password?.length ?? 0,
      });

      const seedEmailsCsv = process.env.SEED_REPAIR_EMAILS || '';
      const seedPasswordsCsv = process.env.SEED_REPAIR_PASSWORDS || '';
      const seedEmails = new Set(seedEmailsCsv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean));
      const seedPasswords = new Set(seedPasswordsCsv.split(',').map(p => p.trim()).filter(Boolean));

      const isSeedAccount = seedEmails.has(platformUser.email.toLowerCase());
      const isKnownPassword = seedPasswords.has(password);

      if (isSeedAccount && isKnownPassword) {
        const repairedHash = await bcrypt.hash(password, this.SALT_ROUNDS);
        await prisma.user.update({
          where: { id: platformUser.id },
          data: { password: repairedHash },
        });
        platformUser.password = repairedHash;
        AppLogger.info('Hash de contraseña reparado para cuenta semilla', {
          userId: platformUser.id,
          email: platformUser.email,
        });
      } else {
        AppLogger.error('Formato de hash inválido; solicitar reset de contraseña', {
          userId: platformUser.id,
        });
        return { success: false, message: 'Credenciales inválidas' };
      }
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
      dadorCargaId: platformUser.dadorCargaId,
      empresaTransportistaId: platformUser.empresaTransportistaId,
      choferId: platformUser.choferId,
      clienteId: platformUser.clienteId,
    };
    const token = this.generateToken(payload);

    let refreshToken: string | undefined;
    try {
      refreshToken = await createRefreshToken(platformUser.id);
    } catch (err) {
      AppLogger.warn('No se pudo crear refresh token', { error: (err as Error).message });
    }

    return {
      success: true,
      token,
      refreshToken,
      platformUser: this.formatUserProfile(platformUser),
    };
  }

  static async register(registerData: RegisterData, createdBy: PlatformUserProfile): Promise<AuthResponse> {
    this.validateRegistrationPermissions(createdBy, registerData.role || 'OPERATOR');

    const prisma = prismaService.getClient();
    const {
      email,
      password,
      role,
      empresaId,
      nombre,
      apellido,
      telegramUsername,
      empresaTransportistaId,
      choferId,
      clienteId,
    } = registerData;
    let { dadorCargaId } = registerData;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return { success: false, message: 'El email ya está en uso' };
    }

    if (role === 'TRANSPORTISTA' && !dadorCargaId && empresaTransportistaId) {
      dadorCargaId = await this.resolveDadorFromEntity(
        'documentos.empresas_transportistas', empresaTransportistaId,
        'La empresa transportista no existe o no tiene un Dador de Carga asignado. No se puede crear el usuario TRANSPORTISTA sin dador.'
      );
    }

    if (role === 'CHOFER' && !dadorCargaId && choferId) {
      dadorCargaId = await this.resolveDadorFromEntity(
        'documentos.choferes', choferId,
        'El chofer no existe o no tiene un Dador de Carga asignado. No se puede crear el usuario CHOFER sin dador.'
      );
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
        telegramUsername: this.normalizeTelegramUsername(telegramUsername),
        dadorCargaId: dadorCargaId ?? null,
        empresaTransportistaId: empresaTransportistaId ?? null,
        choferId: choferId ?? null,
        clienteId: clienteId ?? null,
        creadoPorId: createdBy.id,
      },
    });

    return {
      success: true,
      platformUser: this.formatUserProfile(newUser),
    };
  }

  static async verifyToken(token: string): Promise<AuthPayload | null> {
    if (tokenBlacklist.has(token)) return null;

    try {
      return jwt.verify(token, this.getPublicKey(), { algorithms: ['RS256'] }) as AuthPayload;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        AppLogger.warn('Token RS256 inválido (HS256 deshabilitado en producción)');
        return null;
      }

      const secret = this.getLegacySecret();
      if (secret) {
        try {
          AppLogger.warn('Token verificado con HS256 (legacy) — deshabilitado en producción');
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

  static async refreshAccessToken(refreshTokenValue: string): Promise<AuthResponse> {
    const userId = await validateRefreshToken(refreshTokenValue);
    if (!userId) {
      return { success: false, message: 'Refresh token inválido o expirado' };
    }

    const profile = await this.getUserProfile(userId);
    if (!profile) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const prisma = prismaService.getClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.activo === false) {
      return { success: false, message: 'Refresh token inválido o expirado' };
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      empresaId: user.empresaId,
      dadorCargaId: user.dadorCargaId,
      empresaTransportistaId: user.empresaTransportistaId,
      choferId: user.choferId,
      clienteId: user.clienteId,
    };
    const newToken = this.generateToken(payload);
    const newRefreshToken = await rotateRefreshToken(refreshTokenValue, userId);

    return {
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
      platformUser: this.formatUserProfile(user),
    };
  }

  static async revokeAllUserTokens(userId: number): Promise<void> {
    await revokeAllRefreshTokens(userId);
  }

  static revokeToken(token: string): void {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
      tokenBlacklist.set(token, expiresAt);
    } catch {
      tokenBlacklist.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  static async getUserProfile(userId: number): Promise<PlatformUserProfile | null> {
    const prisma = prismaService.getClient();
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user ? this.formatUserProfile(user) : null;
  }

  private static async validateUpdatePermissions(
    prisma: ReturnType<typeof prismaService.getClient>,
    id: number,
    data: Partial<RegisterData & { role: UserRole }>,
    actor: PlatformUserProfile,
  ): Promise<void> {
    if (actor.role === 'SUPERADMIN') return;

    const targetUser = await prisma.user.findUnique({ where: { id }, select: { empresaId: true } });
    if (!targetUser) throw new Error('Usuario no encontrado');
    if (targetUser.empresaId !== actor.empresaId) throw new Error('No tiene permisos para modificar este usuario');

    if (data.empresaId && data.empresaId !== actor.empresaId) {
      throw new Error('No puede asignar otra empresa');
    }

    if (actor.role === 'ADMIN' && data.role && data.role !== 'OPERATOR') {
      throw new Error('Un administrador no puede cambiar el rol a ADMIN o SUPERADMIN');
    }

    const forbiddenForInterno: UserRole[] = ['SUPERADMIN' as UserRole, 'ADMIN' as UserRole];
    if (actor.role === 'ADMIN_INTERNO' && data.role && forbiddenForInterno.includes(data.role)) {
      throw new Error('ADMIN_INTERNO no puede asignar rol SUPERADMIN ni ADMIN');
    }
  }

  private static async prepareUpdateData(data: Partial<RegisterData & { role: UserRole }>): Promise<any> {
    const update: any = { ...data };
    if (data.password) {
      const strengthErrors = this.validatePasswordStrength(data.password);
      if (strengthErrors.length > 0) throw new Error(strengthErrors.join('. '));
      update.password = await this.hashPassword(data.password);
    }
    if (data.email) {
      update.email = data.email.toLowerCase().trim();
    }
    if ('telegramUsername' in data) {
      update.telegramUsername = this.normalizeTelegramUsername(data.telegramUsername);
    }
    return update;
  }

  static async updatePlatformUser(id: number, data: Partial<RegisterData & { role: UserRole }>, actor: PlatformUserProfile): Promise<PlatformUserProfile> {
    const prisma = prismaService.getClient();
    await this.validateUpdatePermissions(prisma, id, data, actor);
    const update = await this.prepareUpdateData(data);
    const user = await prisma.user.update({ where: { id }, data: update });
    return this.formatUserProfile(user);
  }

  private static async softDeleteUser(prisma: ReturnType<typeof prismaService.getClient>, id: number): Promise<void> {
    const anonymizedEmail = `deleted_${id}_${Date.now()}@removed.local`;
    const invalidatedHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), this.SALT_ROUNDS);
    await prisma.user.update({
      where: { id },
      data: {
        activo: false,
        deletedAt: new Date(),
        email: anonymizedEmail,
        password: invalidatedHash,
        nombre: null,
        apellido: null,
      },
    });
    await revokeAllRefreshTokens(id);
  }

  static async deletePlatformUser(id: number, actor: PlatformUserProfile): Promise<void> {
    const prisma = prismaService.getClient();
    
    if (actor.role === 'SUPERADMIN') {
      await this.softDeleteUser(prisma, id);
      return;
    }
    
    if (actor.role === 'ADMIN_INTERNO') {
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        throw new Error('Usuario no encontrado');
      }
      if (targetUser.empresaId !== actor.empresaId) {
        throw new Error('No tiene permisos para eliminar usuarios de otra empresa');
      }
      // No puede eliminar SUPERADMIN ni ADMIN
      if (['SUPERADMIN', 'ADMIN'].includes(targetUser.role)) {
        throw new Error('No tiene permisos para eliminar usuarios con ese rol');
      }
      // No puede eliminarse a sí mismo
      if (targetUser.id === actor.id) {
        throw new Error('No puede eliminarse a sí mismo');
      }
      await this.softDeleteUser(prisma, id);
      return;
    }
    
    throw new Error('Solo superadmin y admin interno pueden eliminar usuarios');
  }

  static async toggleUserActivo(
    targetId: number,
    activo: boolean,
    actor: PlatformUserProfile
  ): Promise<{ id: number; email: string; activo: boolean }> {
    const prisma = prismaService.getClient();

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) {
      throw new Error('Usuario no encontrado');
    }

    if (!this.canModifyUser(actor, targetUser)) {
      throw new Error('No tiene permisos para modificar este usuario');
    }

    if (targetId === actor.id && !activo) {
      throw new Error('No puede desactivarse a sí mismo');
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { activo },
      select: { id: true, email: true, activo: true },
    });

    AppLogger.info(`Usuario ${activo ? 'activado' : 'desactivado'}`, { targetId, by: actor.id });
    return updated;
  }

  private static canModifyUser(actor: PlatformUserProfile, target: { role: string; empresaId: number | null; creadoPorId?: number | null; dadorCargaId?: number | null; empresaTransportistaId?: number | null }): boolean {
    if (actor.role === 'SUPERADMIN') return true;
    if (['ADMIN', 'ADMIN_INTERNO'].includes(actor.role) && target.empresaId === actor.empresaId) return true;
    if (actor.role === 'DADOR_DE_CARGA') {
      return ['TRANSPORTISTA', 'CHOFER'].includes(target.role) &&
        (target.creadoPorId === actor.id || target.dadorCargaId === actor.dadorCargaId);
    }
    if (actor.role === 'TRANSPORTISTA') {
      return target.role === 'CHOFER' &&
        (target.creadoPorId === actor.id || target.empresaTransportistaId === actor.empresaTransportistaId);
    }
    return false;
  }

  static async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const strengthErrors = this.validatePasswordStrength(newPassword);
    if (strengthErrors.length > 0) {
      return { success: false, message: strengthErrors.join('. ') };
    }

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
      data: { password: hashedNewPassword, mustChangePassword: false, passwordChangedAt: new Date() },
    });

    await this.revokeAllUserTokens(userId);
    AppLogger.info('Contraseña actualizada y tokens revocados', { userId });

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  }

  private static validatePasswordStrength(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 8) errors.push('La contraseña debe tener al menos 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Debe contener al menos una letra mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Debe contener al menos una letra minúscula');
    if (!/\d/.test(password)) errors.push('Debe contener al menos un número');
    return errors;
  }

  private static generateToken(payload: AuthPayload): string {
    return jwt.sign(payload, this.getPrivateKey(), this.getJwtOptions());
  }

  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  private static normalizeTelegramUsername(username?: string | null): string | null {
    if (!username) {
      return null;
    }

    const trimmed = username.trim().slice(0, 64);
    const withoutAt = trimmed.replace(/^@+/, '');
    return withoutAt ? withoutAt.toLowerCase() : null;
  }

  private static formatUserProfile(user: PlatformUserWithRelations): PlatformUserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      empresaId: user.empresaId,
      mustChangePassword: (user as any).mustChangePassword ?? false,
      nombre: user.nombre,
      apellido: user.apellido,
      telegramUsername: (user as any).telegramUsername ?? null,
      telegramUserId: (user as any).telegramUserId != null ? String((user as any).telegramUserId) : null,
      telegramLinkedAt: (user as any).telegramLinkedAt ?? null,
      empresa: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Asociaciones por rol
      dadorCargaId: (user as any).dadorCargaId ?? null,
      empresaTransportistaId: (user as any).empresaTransportistaId ?? null,
      choferId: (user as any).choferId ?? null,
      clienteId: (user as any).clienteId ?? null,
    };
  }

  private static generateTempPassword(): string {
    const pick = (chars: string) => chars[Math.floor(crypto.randomInt(0, chars.length))];
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const all = upper + lower + digits;
    const len = 12;
    const base = [pick(upper), pick(lower), pick(digits)];
    while (base.length < len) base.push(pick(all));
    // Shuffle
    for (let i = base.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [base[i], base[j]] = [base[j], base[i]];
    }
    return base.join('');
  }

  private static readonly ENTITY_TABLE_MAP: Record<string, string> = {
    clienteId: 'documentos.clientes',
    dadorCargaId: 'documentos.dadores_carga',
    empresaTransportistaId: 'documentos.empresas_transportistas',
    choferId: 'documentos.choferes',
  };

  private static readonly ALLOWED_TABLES = new Set(Object.values(PlatformAuthService.ENTITY_TABLE_MAP));

  private static assertAllowedTable(table: string): void {
    if (!this.ALLOWED_TABLES.has(table)) {
      throw new Error('Tabla no permitida para consulta de entidad');
    }
  }

  private static async resolveDadorFromEntity(table: string, entityId: number, errorMsg: string): Promise<number> {
    this.assertAllowedTable(table);
    const prisma = prismaService.getClient();
    const rows = await prisma.$queryRawUnsafe<{ dador_carga_id: number | null }[]>(
      `SELECT dador_carga_id FROM ${table} WHERE id = $1 LIMIT 1`,
      Number(entityId)
    );
    if (rows.length === 0 || !rows[0].dador_carga_id) {
      throw new Error(errorMsg);
    }
    return rows[0].dador_carga_id;
  }

  private static async validateEntityExists(
    roleSpecificData: Record<string, any>,
    createdBy: PlatformUserProfile
  ): Promise<void> {
    const prisma = prismaService.getClient();
    for (const [key, table] of Object.entries(this.ENTITY_TABLE_MAP)) {
      const entityId = roleSpecificData[key];
      if (entityId === undefined || entityId === null) continue;
      this.assertAllowedTable(table);
      const hasDadorCol = table !== 'documentos.dadores_carga';
      const cols = hasDadorCol ? 'id, dador_carga_id' : 'id';
      const rows = await prisma.$queryRawUnsafe<{ id: number; dador_carga_id?: number }[]>(
        `SELECT ${cols} FROM ${table} WHERE id = $1 LIMIT 1`,
        Number(entityId)
      );
      if (rows.length === 0) {
        throw new Error(`La entidad ${key}=${entityId} no existe`);
      }
      this.validateEntityAccess(key, rows[0], createdBy);
    }
  }

  private static validateEntityAccess(
    key: string,
    entity: { id: number; dador_carga_id?: number },
    createdBy: PlatformUserProfile
  ): void {
    if (['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(createdBy.role)) return;

    const entityDadorId = entity.dador_carga_id;
    if (!entityDadorId) return;

    if (createdBy.role === 'DADOR_DE_CARGA' && createdBy.dadorCargaId) {
      if (entityDadorId !== createdBy.dadorCargaId) {
        throw new Error(`No tiene permisos sobre la entidad ${key}=${entity.id}`);
      }
      return;
    }
    if (createdBy.role === 'TRANSPORTISTA' && createdBy.dadorCargaId) {
      if (entityDadorId !== createdBy.dadorCargaId) {
        throw new Error(`No tiene permisos sobre la entidad ${key}=${entity.id}`);
      }
    }
  }

  private static async createUserWithTempPassword(
    input: { email: string; nombre?: string; apellido?: string; empresaId?: number | null; telegramUsername?: string | null },
    createdBy: PlatformUserProfile,
    role: UserRole,
    allowedRoles: string[],
    roleSpecificData: Record<string, any>,
    roleLabel: string
  ): Promise<AuthResponse> {
    if (!allowedRoles.includes(createdBy.role)) {
      throw new Error(`No tiene permisos para crear usuarios ${roleLabel}`);
    }

    await this.validateEntityExists(roleSpecificData, createdBy);

    const prisma = prismaService.getClient();
    const email = input.email.toLowerCase().trim();
    const tempPassword = this.generateTempPassword();
    const hashedPassword = await this.hashPassword(tempPassword);
    const finalEmpresaId = this.determineFinalEmpresaId(role, input.empresaId ?? null, createdBy);

    const newUser = await prisma.$transaction(async (tx: any) => {
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) return null;

      return tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
          empresaId: finalEmpresaId,
          nombre: input.nombre,
          apellido: input.apellido,
          telegramUsername: this.normalizeTelegramUsername(input.telegramUsername),
          mustChangePassword: true as any,
          creadoPorId: createdBy.id,
          ...roleSpecificData,
        } as any,
      });
    });

    if (!newUser) {
      return { success: false, message: 'El email ya está en uso' };
    }

    return {
      success: true,
      platformUser: this.formatUserProfile(newUser),
      tempPassword,
      message: `Usuario ${roleLabel} creado con contraseña temporal`,
    };
  }

  static async registerClientWithTempPassword(
    input: { email: string; nombre?: string; apellido?: string; empresaId?: number | null; telegramUsername?: string | null; clienteId: number },
    createdBy: PlatformUserProfile
  ): Promise<AuthResponse> {
    return this.createUserWithTempPassword(
      input, createdBy, 'CLIENTE' as UserRole,
      ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'],
      { clienteId: input.clienteId }, 'CLIENTE'
    );
  }

  static async registerDadorWithTempPassword(
    input: { email: string; nombre?: string; apellido?: string; empresaId?: number | null; telegramUsername?: string | null; dadorCargaId: number },
    createdBy: PlatformUserProfile
  ): Promise<AuthResponse> {
    return this.createUserWithTempPassword(
      input, createdBy, 'DADOR_DE_CARGA' as UserRole,
      ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'],
      { dadorCargaId: input.dadorCargaId }, 'DADOR_DE_CARGA'
    );
  }

  static async registerTransportistaWithTempPassword(
    input: { email: string; nombre?: string; apellido?: string; empresaId?: number | null; telegramUsername?: string | null; empresaTransportistaId: number },
    createdBy: PlatformUserProfile
  ): Promise<AuthResponse> {
    const dadorCargaId = await this.resolveDadorFromEntity(
      'documentos.empresas_transportistas', input.empresaTransportistaId,
      'La empresa transportista no existe o no tiene un Dador de Carga asignado'
    );
    return this.createUserWithTempPassword(
      input, createdBy, 'TRANSPORTISTA' as UserRole,
      ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA'],
      { empresaTransportistaId: input.empresaTransportistaId, dadorCargaId }, 'TRANSPORTISTA'
    );
  }

  static async registerChoferWithTempPassword(
    input: { email: string; nombre?: string; apellido?: string; empresaId?: number | null; telegramUsername?: string | null; choferId: number },
    createdBy: PlatformUserProfile
  ): Promise<AuthResponse> {
    const dadorCargaId = await this.resolveDadorFromEntity(
      'documentos.choferes', input.choferId,
      'El chofer no existe o no tiene un Dador de Carga asignado'
    );
    return this.createUserWithTempPassword(
      input, createdBy, 'CHOFER' as UserRole,
      ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'],
      { choferId: input.choferId, dadorCargaId }, 'CHOFER'
    );
  }

  // Matriz de permisos: quién puede crear qué rol
  private static readonly PERMISOS_CREACION: Record<string, string[]> = {
    SUPERADMIN: ['SUPERADMIN'],
    ADMIN: ['SUPERADMIN'],
    ADMIN_INTERNO: ['SUPERADMIN', 'ADMIN'],
    OPERATOR: ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'],
    OPERADOR_INTERNO: ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'],
    DADOR_DE_CARGA: ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'],
    TRANSPORTISTA: ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA'],
    CHOFER: ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'],
    CLIENTE: ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'],
  };

  private static validateRegistrationPermissions(createdBy: PlatformUserProfile, role: UserRole): void {
    const rolesPermitidos = this.PERMISOS_CREACION[role] || [];
    if (!rolesPermitidos.includes(createdBy.role)) {
      throw new Error(`El rol ${createdBy.role} no tiene permiso para crear usuarios con rol ${role}`);
    }
  }

  private static determineFinalEmpresaId(role: UserRole | undefined, requestedEmpresaId: number | null | undefined, createdBy: PlatformUserProfile): number {
    if (createdBy.role === 'SUPERADMIN') {
      // SUPERADMIN debe especificar empresaId obligatoriamente
      if (requestedEmpresaId && requestedEmpresaId > 0) {
        return requestedEmpresaId;
      }
      // Si no especificó, usar la empresa del superadmin
      if (createdBy.empresaId) {
        return createdBy.empresaId;
      }
      // Fallback: usar empresa 1 (BCA) - esto no debería ocurrir en producción
      return 1;
    }

    // Para cualquier otro rol, siempre usar la empresa del creador
    if (createdBy.empresaId) {
      return createdBy.empresaId;
    }
    // Fallback: empresa 1 (BCA)
    return 1;
  }
} 
