import { prismaService } from '../config/prisma';
import { BaseService } from './base.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnvironment } from '../config/environment';
import { AppLogger } from '../config/logger';
import { User, Prisma, UserRole } from '@prisma/client';

// Tipos específicos derivados de Prisma para autenticación
type UserCreateInput = Prisma.UserCreateInput;
type UserUpdateInput = Prisma.UserUpdateInput;

// Tipos de negocio para autenticación
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role?: UserRole;
  empresaId?: number | null;
}

export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
  empresaId?: number;
}

export interface AuthResponse {
  success: boolean;
  data: AuthPayload; // Usar AuthPayload unificado
  token: string;
  message: string;
  timestamp: string;
}

export interface TokenPayload {
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

/**
 * Servicio de autenticación profesional con Prisma
 * Implementa todas las funcionalidades de autenticación y autorización
 */
class AuthService extends BaseService<User, UserCreateInput, UserUpdateInput> {
  private JWT_PRIVATE_KEY: string;
  private JWT_PUBLIC_KEY: string;
  private JWT_LEGACY_SECRET?: string;
  private readonly JWT_EXPIRES_IN = '24h';
  private readonly SALT_ROUNDS = 12;

  constructor() {
    super(prismaService.getClient(), 'User');
    const env = getEnvironment();
    // Cargar claves desde env centralizado (inline o path ya resuelto)
    this.JWT_PRIVATE_KEY = env.jwtPrivateKey || this.loadKey(env.JWT_PRIVATE_KEY, env.JWT_PRIVATE_KEY_PATH, 'PRIVATE');
    this.JWT_PUBLIC_KEY = env.jwtPublicKey || this.loadKey(env.JWT_PUBLIC_KEY, env.JWT_PUBLIC_KEY_PATH, 'PUBLIC');
    // Fallback temporal (legacy HS256)
    this.JWT_LEGACY_SECRET = env.JWT_LEGACY_SECRET || process.env.JWT_SECRET;
  }

  // Implementaciones requeridas por BaseService
  protected async findByIdImplementation(id: number): Promise<User | null> {
    return prismaService.getClient().user.findUnique({ where: { id } });
  }

  protected async findManyImplementation(filters?: any): Promise<User[]> {
    return prismaService.getClient().user.findMany(filters);
  }

  protected async createImplementation(data: UserCreateInput): Promise<User> {
    return prismaService.getClient().user.create({ data });
  }

  protected async updateImplementation(id: number, data: UserUpdateInput): Promise<User> {
    return prismaService.getClient().user.update({ where: { id }, data });
  }

  protected async deleteImplementation(id: number): Promise<void> {
    await prismaService.getClient().user.delete({ where: { id } });
  }

  protected async countImplementation(filters?: any): Promise<number> {
    return prismaService.getClient().user.count(filters);
  }

  /**
   * Autentica un usuario con email y contraseña
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      AppLogger.debug('🔐 Intento de login iniciado', { email });

      // Buscar usuario
      const user = await prismaService.getClient().user.findUnique({
        where: {
          email: email.toLowerCase().trim(),
        },
      });

      if (!user) {
        AppLogger.warn('❌ Intento de login fallido: usuario no encontrado', { email });
        throw new Error('Credenciales inválidas');
      }

      // Verificar contraseña
      const isValidPassword = await this.verifyPassword(password, user.password);

      if (!isValidPassword) {
        AppLogger.warn('❌ Intento de login fallido: contraseña incorrea', {
          email,
          userId: user.id,
        });
        throw new Error('Credenciales inválidas');
      }

      // Generar token JWT con asociaciones por rol
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        empresaId: user.empresaId ?? null,
        dadorCargaId: user.dadorCargaId ?? null,
        empresaTransportistaId: user.empresaTransportistaId ?? null,
        choferId: user.choferId ?? null,
        clienteId: user.clienteId ?? null,
      });

      // Formatear respuesta del usuario
      const authUser = this.formatAuthUser(user);

      AppLogger.info('✅ Login exitoso', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        success: true,
        data: authUser,
        token,
        message: 'Login exitoso',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      AppLogger.error('❌ Error en servicio de login:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async register(registerData: RegisterData, authUser: AuthPayload): Promise<AuthResponse> {
    try {
      const { email, password, role = UserRole.OPERATOR, empresaId } = registerData;

      AppLogger.debug('📝 Intento de registro iniciado', {
        email,
        role,
        empresaId,
        createdBy: authUser.userId,
      });

      // Validaciones de permisos
      this.validateRegistrationPermissions(authUser, role);

      // Validar empresa_id según el rol
      this.validateEmpresaIdRequirement(role, empresaId);

      // Verificar si el email ya existe
      const existingUser = await prismaService.getClient().user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Hashear contraseña
      const hashedPassword = await this.hashPassword(password);

      // Determinar empresa_id final basado en el rol y usuario creador
      const finalEmpresaId = this.determineFinalEmpresaId(role, empresaId, authUser);

      // Crear usuario
      const newUser = await prismaService.getClient().user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: role,
          empresaId: finalEmpresaId,
        },
      });

      // Generar token para el nuevo usuario
      const token = this.generateToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        empresaId: (newUser as any).empresaId ?? null,
        dadorCargaId: (newUser as any).dadorCargaId ?? null,
        empresaTransportistaId: (newUser as any).empresaTransportistaId ?? null,
        choferId: (newUser as any).choferId ?? null,
        clienteId: (newUser as any).clienteId ?? null,
      });

      const authUserResponse = this.formatAuthUser(newUser);

      AppLogger.info('✅ Usuario registrado exitosamente', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdBy: authUser.userId,
      });

      return {
        success: true,
        data: authUserResponse,
        token,
        message: 'Usuario registrado exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      AppLogger.error('❌ Error en servicio de registro:', error);
      throw error;
    }
  }

  /**
   * Obtiene el perfil del usuario actual
   */
  async getProfile(userId: number): Promise<AuthPayload> {
    try {
      const user = await prismaService.getClient().user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      return this.formatAuthUser(user);
    } catch (error) {
      AppLogger.error('❌ Error al obtener perfil de usuario:', error);
      throw error;
    }
  }

  /**
   * Busca un usuario por email
   */
  async findByEmail(email: string): Promise<AuthPayload | null> {
    try {
      const user = await prismaService.getClient().user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      return user ? this.formatAuthUser(user) : null;
    } catch (error) {
      AppLogger.error('❌ Error al buscar usuario por email:', error);
      throw error;
    }
  }

  /**
   * Cambiar contraseña del usuario
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const user = await prismaService.getClient().user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isValidPassword = await this.verifyPassword(currentPassword, user.password);
      if (!isValidPassword) {
        throw new Error('Contraseña actual incorrecta');
      }

      // Hashear nueva contraseña
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Actualizar contraseña
      await prismaService.getClient().user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      AppLogger.info('✅ Contraseña actualizada exitosamente', { userId });
    } catch (error) {
      AppLogger.error('❌ Error al cambiar contraseña:', error);
      throw error;
    }
  }

  /**
   * Refresca un token JWT
   */
  async refreshToken(token: string): Promise<{ token: string; user: AuthPayload }> {
    try {
      // Verificar y decodificar token actual
      const decoded = jwt.verify(token, this.JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as TokenPayload;

      // Obtener información actualizada del usuario
      const user = await this.getProfile(decoded.userId);

      // Generar nuevo token con asociaciones
      const newToken = this.generateToken({
        userId: user.userId,
        email: user.email,
        role: user.role,
        empresaId: user.empresaId ?? null,
        dadorCargaId: (user as any).dadorCargaId ?? null,
        empresaTransportistaId: (user as any).empresaTransportistaId ?? null,
        choferId: (user as any).choferId ?? null,
        clienteId: (user as any).clienteId ?? null,
      });

      return {
        token: newToken,
        user,
      };
    } catch (_error) {
      return null;
    }
  }

  /**
   * Generar token JWT
   */
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.JWT_PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  /**
   * Hashea una contraseña
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verifica una contraseña contra su hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Verifica un token JWT
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as TokenPayload;
    } catch (_error) {
      // Fallback temporal HS256
      if (this.JWT_LEGACY_SECRET) {
        try {
          return jwt.verify(token, this.JWT_LEGACY_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
        } catch {
          /* Fallback HS256 también falló */
          return null;
        }
      }
      return null;
    }
  }

  private loadKey(inline: string | undefined, pathVar: string | undefined, label: 'PRIVATE' | 'PUBLIC'): string {
    let raw = inline;
    if (!raw && pathVar) {
      try {
        const fs = require('fs');
        raw = fs.readFileSync(pathVar, 'utf8');
      } catch { /* Archivo no accesible, se usará inline */ }
    }
    if (!raw) {
      throw new Error(`JWT_${label}_KEY or JWT_${label}_KEY_PATH is required`);
    }
    return raw.includes('-----BEGIN') ? raw : raw.replace(/\\n/g, '\n');
  }

  /**
   * Formatea un usuario para respuesta de autenticación
   */
  private formatAuthUser(user: User): AuthPayload {
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      empresaId: user.empresaId || undefined,
    };
  }

  /**
   * Actualizar empresa del usuario y generar nuevo JWT
   */
  async updateUserEmpresa(userId: number, empresaId: number | null): Promise<AuthResponse> {
    try {
      AppLogger.debug('🏢 Iniciando actualización de empresa', {
        userId,
        empresaId,
      });

      // Actualizar usuario en la base de datos
      const updatedUser = await prismaService.getClient().user.update({
        where: { id: userId },
        data: { empresaId: empresaId },
      });

      if (!updatedUser) {
        throw new Error('Usuario no encontrado');
      }

      // Generar nuevo token JWT con la información actualizada
      const token = this.generateToken({
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        empresaId: updatedUser.empresaId ?? null,
        dadorCargaId: updatedUser.dadorCargaId ?? null,
        empresaTransportistaId: updatedUser.empresaTransportistaId ?? null,
        choferId: updatedUser.choferId ?? null,
        clienteId: updatedUser.clienteId ?? null,
      });

      // Formatear respuesta del usuario
      const authUser = this.formatAuthUser(updatedUser);

      AppLogger.info('✅ Empresa del usuario actualizada exitosamente', {
        userId: updatedUser.id,
        empresaId: updatedUser.empresaId,
      });

      return {
        success: true,
        data: authUser,
        token,
        message: 'Empresa actualizada exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      AppLogger.error('❌ Error al actualizar empresa del usuario:', error);
      throw error;
    }
  }

  /**
   * Valida permisos para registro de usuarios
   */
  private validateRegistrationPermissions(authUser: AuthPayload, role: UserRole): void {
    if (authUser.role === UserRole.ADMIN) {
      // Admin puede crear usuarios 'user' y 'admin'
      if (role !== UserRole.OPERATOR && role !== UserRole.ADMIN) {
        throw new Error('Los administradores solo pueden crear usuarios con rol "OPERATOR" o "ADMIN"');
      }
    } else if (authUser.role === UserRole.SUPERADMIN) {
      // Superadmin puede crear cualquier rol excepto otro superadmin
      if (role === UserRole.SUPERADMIN) {
        throw new Error('No se puede crear otro superadministrador');
      }
    } else {
      // Solo admin y superadmin pueden crear usuarios
      throw new Error('No tienes permisos para crear usuarios');
    }
  }

  /**
   * Valida que empresa_id sea requerido para usuarios que no son superadmin
   */
  private validateEmpresaIdRequirement(role: UserRole, empresaId?: number | null): void {
    if (role !== UserRole.SUPERADMIN && !empresaId) {
      throw new Error('Los usuarios admin y operator deben tener una empresa asignada');
    }
  }

  /**
   * Determina la empresa_id final basado en el rol y usuario creador
   */
  private determineFinalEmpresaId(
    role: UserRole,
    empresaId?: number | null,
    authUser?: AuthPayload
  ): number | null {
    // Superadmin puede no tener empresa (la selecciona dinámicamente)
    if (role === UserRole.SUPERADMIN) {
      return null;
    }

    // Si se proporciona empresaId, usarlo
    if (empresaId) {
      return empresaId;
    }

    // Si el usuario creador es admin, heredar su empresa
    if (authUser?.role === UserRole.ADMIN && authUser.empresaId) {
      return authUser.empresaId;
    }

    // Si llegamos aquí, hay un problema de validación
    throw new Error('No se pudo determinar la empresa para el usuario');
  }
}

let authServiceInstance: AuthService | null = null;

const getAuthService = (): AuthService => {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
};

export const authService = getAuthService();
