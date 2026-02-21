import { Request, Response } from 'express';
import { PlatformAuthService, LoginCredentials, RegisterData, PlatformUserProfile } from '../services/platformAuth.service';
import { AppLogger } from '../config/logger';
import { body, validationResult } from 'express-validator';

interface AuthRequest extends Request {
  user?: any;
}

// Helper: manejar respuesta de wizard de registro con contraseña temporal
function handleWizardRegisterResult(
  res: Response,
  result: { success: boolean; message?: string; platformUser?: any; tempPassword?: string },
  errorContext: string
): boolean {
  if (!result.success) {
    res.status(400).json({ success: false, message: result.message });
    return false;
  }
  res.status(201).json({
    success: true,
    message: result.message,
    user: result.platformUser,
    tempPassword: result.tempPassword,
  });
  return true;
}

function handleWizardError(res: Response, error: unknown, context: string): void {
  AppLogger.error(`Error en wizard ${context}:`, error);
  res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : 'Error interno del servidor',
  });
}

async function resolveActorProfile(req: AuthRequest, res: Response): Promise<PlatformUserProfile | null> {
  const tokenUser = req.user;
  if (!tokenUser) {
    res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    return null;
  }
  const profile = await PlatformAuthService.getUserProfile(tokenUser.userId);
  if (!profile) {
    res.status(401).json({ success: false, message: 'No se pudo obtener el perfil del usuario autenticado' });
    return null;
  }
  return profile;
}

export class PlatformAuthController {
  /**
   * Login de usuarios de plataforma
   * POST /api/platform/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginCredentials = req.body;

      AppLogger.info('🔐 Intento de login de plataforma', {
        email: credentials.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const result = await PlatformAuthService.login(credentials);

      if (result.success) {
        // Configurar cookie segura con el token
        res.cookie('platformToken', result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        });

        res.status(200).json({
          success: true,
          token: result.token,
          data: result.platformUser,
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      AppLogger.error('💥 Error en login de plataforma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Actualizar usuario de plataforma
   * PUT /api/platform/auth/users/:id
   */
  static async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, message: 'Datos de entrada inválidos', errors: errors.array() });
        return;
      }

      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      const id = parseInt(req.params.id, 10);
      const data = req.body;

      const result = await PlatformAuthService.updatePlatformUser(id, data, actorProfile);
      res.status(200).json({ success: true, user: result });
    } catch (error) {
      AppLogger.error('💥 Error actualizando usuario de plataforma:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  /**
   * Eliminar usuario de plataforma
   * DELETE /api/platform/auth/users/:id
   */
  static async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      const id = parseInt(req.params.id, 10);
      await PlatformAuthService.deletePlatformUser(id, actorProfile);
      res.status(200).json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (error: any) {
      const msg = error?.message ?? 'Error interno del servidor';
      const isBusinessError = msg.includes('permisos') || msg.includes('encontrado') || msg.includes('eliminarse') || msg.includes('Solo superadmin');
      if (isBusinessError) {
        res.status(403).json({ success: false, message: msg });
        return;
      }
      AppLogger.error('Error eliminando usuario de plataforma:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  static async toggleActivo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      const targetId = parseInt(req.params.id, 10);
      const { activo } = req.body;

      if (typeof activo !== 'boolean') {
        res.status(400).json({ success: false, message: 'El campo activo debe ser booleano' });
        return;
      }

      const updatedUser = await PlatformAuthService.toggleUserActivo(targetId, activo, actorProfile);
      res.status(200).json({ success: true, data: updatedUser, message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente` });
    } catch (error: any) {
      const msg = error?.message ?? 'Error interno del servidor';
      const isBusinessError = msg.includes('permisos') || msg.includes('encontrado') || msg.includes('desactivarse');
      if (isBusinessError) {
        const status = msg.includes('encontrado') ? 404 : 403;
        res.status(status).json({ success: false, message: msg });
        return;
      }
      AppLogger.error('Error al cambiar estado de usuario:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  /**
   * Registro de nuevos usuarios de plataforma
   * POST /api/platform/auth/register
   */
  static async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const registerData: RegisterData = req.body;
      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      AppLogger.info('Intento de registro en plataforma', {
        email: registerData.email,
        role: registerData.role,
        createdBy: actorProfile.id,
        ip: req.ip,
      });

      const result = await PlatformAuthService.register(registerData, actorProfile);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          user: result.platformUser,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      AppLogger.error('💥 Error en registro de plataforma:', error);
      
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
        });
      }
    }
  }

  /**
   * Wizard: crear usuario CLIENTE con contraseña temporal (se devuelve 1 sola vez)
   * POST /api/platform/auth/wizard/register-client
   * Access: SUPERADMIN / ADMIN / ADMIN_INTERNO
   */
  static async registerClientWizard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      const { email, nombre, apellido, empresaId, clienteId } = req.body;
      const result = await PlatformAuthService.registerClientWithTempPassword(
        { email, nombre, apellido, empresaId: empresaId ?? null, clienteId: Number(clienteId) },
        actorProfile
      );
      handleWizardRegisterResult(res, result, 'register-client');
    } catch (error) {
      handleWizardError(res, error, 'register-client');
    }
  }

  /**
   * Wizard: crear usuario DADOR_DE_CARGA con contraseña temporal
   * POST /api/platform/auth/wizard/register-dador
   */
  static async registerDadorWizard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      const { email, nombre, apellido, empresaId, dadorCargaId } = req.body;
      const result = await PlatformAuthService.registerDadorWithTempPassword(
        { email, nombre, apellido, empresaId: empresaId ?? null, dadorCargaId: Number(dadorCargaId) },
        actorProfile
      );
      handleWizardRegisterResult(res, result, 'register-dador');
    } catch (error) {
      handleWizardError(res, error, 'register-dador');
    }
  }

  /**
   * Wizard: crear usuario TRANSPORTISTA con contraseña temporal
   * POST /api/platform/auth/wizard/register-transportista
   */
  static async registerTransportistaWizard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      const { email, nombre, apellido, empresaId, empresaTransportistaId } = req.body;
      const result = await PlatformAuthService.registerTransportistaWithTempPassword(
        { email, nombre, apellido, empresaId: empresaId ?? null, empresaTransportistaId: Number(empresaTransportistaId) },
        actorProfile
      );
      handleWizardRegisterResult(res, result, 'register-transportista');
    } catch (error) {
      handleWizardError(res, error, 'register-transportista');
    }
  }

  /**
   * Wizard: crear usuario CHOFER con contraseña temporal
   * POST /api/platform/auth/wizard/register-chofer
   */
  static async registerChoferWizard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const actorProfile = await resolveActorProfile(req, res);
      if (!actorProfile) return;

      const { email, nombre, apellido, empresaId, choferId } = req.body;
      const result = await PlatformAuthService.registerChoferWithTempPassword(
        { email, nombre, apellido, empresaId: empresaId ?? null, choferId: Number(choferId) },
        actorProfile
      );
      handleWizardRegisterResult(res, result, 'register-chofer');
    } catch (error) {
      handleWizardError(res, error, 'register-chofer');
    }
  }

  /**
   * Logout de usuario de plataforma
   * POST /api/platform/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : req.cookies?.platformToken;
      if (token) {
        PlatformAuthService.revokeToken(token);
      }

      const authReq = req as AuthRequest;
      if (authReq.user?.userId) {
        await PlatformAuthService.revokeAllUserTokens(authReq.user.userId);
      }

      res.clearCookie('platformToken');

      AppLogger.info('Logout de plataforma exitoso', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Logout exitoso',
      });
    } catch (error) {
      AppLogger.error('Error en logout de plataforma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Renovar access token usando refresh token
   * POST /api/platform/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token requerido' });
        return;
      }

      const result = await PlatformAuthService.refreshAccessToken(refreshToken);
      if (!result.success) {
        res.status(401).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      AppLogger.error('Error en refresh token:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  /**
   * Obtener perfil del usuario autenticado
   * GET /api/platform/auth/profile
   */
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      const profile = await PlatformAuthService.getUserProfile(user.userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Perfil de usuario no encontrado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        user: profile,
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo perfil de plataforma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Cambiar contraseña
   * POST /api/platform/auth/change-password
   */
  static async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { currentPassword, newPassword } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      AppLogger.info('🔐 Intento de cambio de contraseña', {
        userId: user.userId,
        ip: req.ip,
      });

      const result = await PlatformAuthService.updatePassword(
        user.userId,
        currentPassword,
        newPassword
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      AppLogger.error('💥 Error cambiando contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }

  /**
   * Verificar token de autenticación
   * GET /api/platform/auth/verify
   */
  static async verifyToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Token inválido o expirado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          userId: user.userId,
          email: user.email,
          role: user.role,
          empresaId: user.empresaId,
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error verificando token:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
}

// ================================
// VALIDADORES
// ================================

export const platformAuthValidation = {
  updateUser: [
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('password').optional().isLength({ min: 8 }).withMessage('Contraseña debe tener al menos 8 caracteres'),
    body('role').optional().isIn([
      'SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'OPERATOR', 'OPERADOR_INTERNO',
      'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'
    ]).withMessage('Rol inválido'),
    body('empresaId').optional().isInt({ min: 1 }).withMessage('empresaId debe ser un número positivo'),
    body('nombre').optional().isLength({ max: 100 }),
    body('apellido').optional().isLength({ max: 100 }),
    body('dadorCargaId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('dadorCargaId debe ser un número positivo'),
    body('empresaTransportistaId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('empresaTransportistaId debe ser un número positivo'),
    body('choferId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('choferId debe ser un número positivo'),
    body('clienteId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('clienteId debe ser un número positivo'),
  ],
}; 