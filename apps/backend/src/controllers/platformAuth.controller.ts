import { Request, Response } from 'express';
import { PlatformAuthService, LoginCredentials, RegisterData } from '../services/platformAuth.service';
import { AppLogger } from '../config/logger';
import { body, validationResult } from 'express-validator';

interface AuthRequest extends Request {
  user?: any;
}

export class PlatformAuthController {
  /**
   * Login de usuarios de plataforma
   * POST /api/platform/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array(),
        });
        return;
      }

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

      const actor = req.user;
      if (!actor) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        return;
      }

      const id = parseInt(req.params.id, 10);
      const data = req.body;

      const result = await PlatformAuthService.updatePlatformUser(id, data, actor);
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
      const actor = req.user;
      if (!actor) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        return;
      }
      const id = parseInt(req.params.id, 10);
      await PlatformAuthService.deletePlatformUser(id, actor);
      res.status(200).json({ success: true });
    } catch (error) {
      AppLogger.error('💥 Error eliminando usuario de plataforma:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
  /**
   * Registro de nuevos usuarios de plataforma
   * POST /api/platform/auth/register
   */
  static async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array(),
        });
        return;
      }

      const registerData: RegisterData = req.body;
      const createdBy = req.user;

      if (!createdBy) {
        res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        });
        return;
      }

      AppLogger.info('📝 Intento de registro en plataforma', {
        email: registerData.email,
        role: registerData.role,
        createdBy: createdBy.userId,
        ip: req.ip,
      });

      const result = await PlatformAuthService.register(registerData, createdBy);

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
   * Logout de usuario de plataforma
   * POST /api/platform/auth/logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // Limpiar cookie del token
      res.clearCookie('platformToken');

      AppLogger.info('👋 Logout de plataforma exitoso', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Logout exitoso',
      });
    } catch (error) {
      AppLogger.error('💥 Error en logout de plataforma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
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
      // Validar errores de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: errors.array(),
        });
        return;
      }

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
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email válido requerido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Contraseña debe tener al menos 6 caracteres'),
  ],

  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email válido requerido'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'),
    body('role')
      .optional()
      .customSanitizer((v) => (typeof v === 'string' ? v.toUpperCase() : v))
      .isIn(['ADMIN', 'OPERATOR', 'SUPERADMIN'])
      .withMessage('Rol inválido'),
    body('empresaId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('ID de empresa debe ser un número positivo'),
    body('nombre')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Nombre no puede exceder 100 caracteres'),
    body('apellido')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Apellido no puede exceder 100 caracteres'),
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Contraseña actual requerida'),
    body('newPassword')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'),
  ],

  updateUser: [
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('password').optional().isLength({ min: 8 }).withMessage('Contraseña debe tener al menos 8 caracteres'),
    body('role').optional().isIn(['ADMIN','OPERATOR','SUPERADMIN']).withMessage('Rol inválido'),
    body('empresaId').optional().isInt({ min: 1 }).withMessage('empresaId debe ser un número positivo'),
    body('nombre').optional().isLength({ max: 100 }),
    body('apellido').optional().isLength({ max: 100 }),
  ],
}; 