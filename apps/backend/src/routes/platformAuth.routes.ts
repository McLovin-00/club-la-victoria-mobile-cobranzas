import { Router, Response } from 'express';
import { PlatformAuthController, platformAuthValidation } from '../controllers/platformAuth.controller';
import { z } from 'zod';
import { ValidationMiddleware } from '../middlewares/validation.middleware';
import {
  authenticateUser,
  authorizeRoles,
  logAction,
  AuthRequest
} from '../middlewares/platformAuth.middleware';
import { prismaService } from '../config/prisma';
import { AppLogger } from '../config/logger';

const router = Router();

/**
 * @route POST /api/platform/auth/login
 * @desc Login de usuario de plataforma
 * @access Public
 */
router.post(
  '/login',
  ValidationMiddleware.validateBody(z.object({
    email: z.string().email(),
    password: z.string().min(6),
  })),
  logAction('PLATFORM_LOGIN_ATTEMPT'),
  PlatformAuthController.login
);

/**
 * @route POST /api/platform/auth/logout
 * @desc Logout de usuario de plataforma
 * @access Public
 */
router.post(
  '/logout',
  logAction('PLATFORM_LOGOUT'),
  PlatformAuthController.logout
);

/**
 * @route POST /api/platform/auth/register
 * @desc Registro de nuevo usuario de plataforma
 * @access Private (Admin/Superadmin)
 */
router.post(
  '/register',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  ValidationMiddleware.validateBody(z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    role: z.enum(['ADMIN','OPERATOR','SUPERADMIN']).optional(),
    empresaId: z.number().int().positive().optional(),
    nombre: z.string().max(100).optional(),
    apellido: z.string().max(100).optional(),
  })),
  logAction('PLATFORM_USER_REGISTER'),
  PlatformAuthController.register
);

/**
 * @route GET /api/platform/auth/profile
 * @desc Obtener perfil del usuario autenticado
 * @access Private
 */
router.get(
  '/profile',
  authenticateUser,
  logAction('PLATFORM_GET_PROFILE'),
  PlatformAuthController.getProfile
);

/**
 * @route POST /api/platform/auth/change-password
 * @desc Cambiar contraseña del usuario autenticado
 * @access Private
 */
router.post(
  '/change-password',
  authenticateUser,
  ValidationMiddleware.validateBody(z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  })),
  logAction('PLATFORM_CHANGE_PASSWORD'),
  PlatformAuthController.changePassword
);

/**
 * @route GET /api/platform/auth/verify
 * @desc Verificar token de autenticación
 * @access Private
 */
router.get(
  '/verify',
  authenticateUser,
  PlatformAuthController.verifyToken
);

/**
 * @route PUT /api/platform/auth/users/:id
 * @desc Actualizar usuario de plataforma
 * @access Private (Admin/Superadmin)
 */
router.put(
  '/users/:id',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  platformAuthValidation.updateUser,
  logAction('PLATFORM_USER_UPDATE'),
  PlatformAuthController.updateUser
);

/**
 * @route DELETE /api/platform/auth/users/:id
 * @desc Eliminar usuario de plataforma
 * @access Private (Superadmin)
 */
router.delete(
  '/users/:id',
  authenticateUser,
  authorizeRoles(['SUPERADMIN']),
  logAction('PLATFORM_USER_DELETE'),
  PlatformAuthController.deleteUser
);

/**
 * @route GET /api/platform/auth/usuarios
 * @desc Obtener lista de usuarios de plataforma (admins/superadmins)
 * @access Private (Admin/Superadmin)
 */
router.get(
  '/usuarios',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { page = 1, limit = 10, search = '', role, empresaId } = req.query;

      // Construir filtros
      const where: any = {};

      // Filtro por texto de búsqueda
      if (search && typeof search === 'string' && search.trim()) {
        where.OR = [
          { email: { contains: search.trim(), mode: 'insensitive' } },
          { nombre: { contains: search.trim(), mode: 'insensitive' } },
          { apellido: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      // Filtro por rol
      if (role && typeof role === 'string') {
        where.role = role.toUpperCase();
      }

      // Filtro por empresa
      if (empresaId && typeof empresaId === 'string') {
        where.empresaId = parseInt(empresaId);
      }

      // Restricciones según el rol del usuario actual
      if (user.role === 'ADMIN') {
        // Admin solo puede ver usuarios de su empresa y no puede ver otros superadmins
        where.empresaId = user.empresaId;
        where.role = { not: 'SUPERADMIN' };
      }

      // Paginación
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;

      // Obtener usuarios y total
      const [usuarios, total] = await Promise.all([
        prismaService.getClient().user.findMany({
          where,
          skip,
          take: limitNum,
          select: {
            id: true,
            email: true,
            role: true,
            nombre: true,
            apellido: true,
            empresaId: true,
            createdAt: true,
            updatedAt: true,
            empresa: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prismaService.getClient().user.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: usuarios,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo usuarios de plataforma:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

/**
 * @route POST /api/platform/auth/update-empresa
 * @desc Actualizar empresa del usuario (solo para superadmin) - Ruta de compatibilidad
 * @access Private (Superadmin)
 */
router.post(
  '/update-empresa',
  authenticateUser,
  authorizeRoles(['SUPERADMIN']),
  async (req: any, res: any) => {
    // Redirigir a la nueva ruta principal
    return res.status(302).json({
      success: false,
      message: 'Esta ruta ha sido movida. Use /api/usuarios/update-empresa',
      newEndpoint: '/api/usuarios/update-empresa',
    });
  }
);

export default router; 