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
 * @access Private - Roles según matriz de permisos
 */
router.post(
  '/register',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']),
  ValidationMiddleware.validateBody(z.object({
    email: z.string().email(),
    password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    role: z.enum([
      'SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'OPERATOR', 'OPERADOR_INTERNO',
      'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'
    ]).optional(),
    empresaId: z.number().int().positive().optional(),
    nombre: z.string().max(100).optional(),
    apellido: z.string().max(100).optional(),
    // Asociaciones por rol
    dadorCargaId: z.number().int().positive().optional(),
    empresaTransportistaId: z.number().int().positive().optional(),
    choferId: z.number().int().positive().optional(),
    clienteId: z.number().int().positive().optional(),
  })),
  logAction('PLATFORM_USER_REGISTER'),
  PlatformAuthController.register
);

/**
 * @route POST /api/platform/auth/wizard/register-client
 * @desc Crear usuario CLIENTE con contraseña temporal (se devuelve 1 sola vez)
 * @access Private - SUPERADMIN / ADMIN / ADMIN_INTERNO
 */
router.post(
  '/wizard/register-client',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO']),
  ValidationMiddleware.validateBody(z.object({
    email: z.string().email(),
    nombre: z.string().max(100).optional(),
    apellido: z.string().max(100).optional(),
    empresaId: z.number().int().positive().optional(),
    clienteId: z.number().int().positive(),
  })),
  logAction('PLATFORM_USER_WIZARD_REGISTER_CLIENT'),
  PlatformAuthController.registerClientWizard
);

/**
 * @route POST /api/platform/auth/wizard/register-dador
 * @desc Crear usuario DADOR_DE_CARGA con contraseña temporal
 * @access Private - SUPERADMIN / ADMIN / ADMIN_INTERNO
 */
router.post(
  '/wizard/register-dador',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO']),
  ValidationMiddleware.validateBody(z.object({
    email: z.string().email(),
    nombre: z.string().max(100).optional(),
    apellido: z.string().max(100).optional(),
    empresaId: z.number().int().positive().optional(),
    dadorCargaId: z.number().int().positive(),
  })),
  logAction('PLATFORM_USER_WIZARD_REGISTER_DADOR'),
  PlatformAuthController.registerDadorWizard
);

/**
 * @route POST /api/platform/auth/wizard/register-transportista
 * @desc Crear usuario TRANSPORTISTA con contraseña temporal
 * @access Private - SUPERADMIN / ADMIN / ADMIN_INTERNO / DADOR_DE_CARGA
 */
router.post(
  '/wizard/register-transportista',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA']),
  ValidationMiddleware.validateBody(z.object({
    email: z.string().email(),
    nombre: z.string().max(100).optional(),
    apellido: z.string().max(100).optional(),
    empresaId: z.number().int().positive().optional(),
    empresaTransportistaId: z.number().int().positive(),
  })),
  logAction('PLATFORM_USER_WIZARD_REGISTER_TRANSPORTISTA'),
  PlatformAuthController.registerTransportistaWizard
);

/**
 * @route POST /api/platform/auth/wizard/register-chofer
 * @desc Crear usuario CHOFER con contraseña temporal
 * @access Private - SUPERADMIN / ADMIN / ADMIN_INTERNO / DADOR_DE_CARGA / TRANSPORTISTA
 */
router.post(
  '/wizard/register-chofer',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']),
  ValidationMiddleware.validateBody(z.object({
    email: z.string().email(),
    nombre: z.string().max(100).optional(),
    apellido: z.string().max(100).optional(),
    empresaId: z.number().int().positive().optional(),
    choferId: z.number().int().positive(),
  })),
  logAction('PLATFORM_USER_WIZARD_REGISTER_CHOFER'),
  PlatformAuthController.registerChoferWizard
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
  authorizeRoles(['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO']),
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
 * @route PATCH /api/platform/auth/users/:id/toggle-activo
 * @desc Activar/desactivar usuario de plataforma
 * @access Private (Admin/Superadmin/Admin_Interno/Dador/Transportista según órbita)
 */
router.patch(
  '/users/:id/toggle-activo',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']),
  logAction('PLATFORM_USER_TOGGLE_ACTIVO'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const currentUser = req.user!;
      const targetId = parseInt(req.params.id);
      const { activo } = req.body;
      
      if (typeof activo !== 'boolean') {
        res.status(400).json({ success: false, message: 'El campo activo debe ser booleano' });
        return;
      }
      
      const prisma = prismaService.getClient();
      
      // Buscar usuario objetivo
      const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
      if (!targetUser) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        return;
      }
      
      // Verificar permisos según órbita
      const canModify = (() => {
        if (currentUser.role === 'SUPERADMIN') return true;
        if (currentUser.role === 'ADMIN' && targetUser.empresaId === currentUser.empresaId) return true;
        if (currentUser.role === 'ADMIN_INTERNO' && targetUser.empresaId === currentUser.empresaId) return true;
        if (currentUser.role === 'DADOR_DE_CARGA') {
          // Solo puede modificar transportistas/choferes que creó o de su dador
          return ['TRANSPORTISTA', 'CHOFER'].includes(targetUser.role) &&
            (targetUser.creadoPorId === currentUser.userId || targetUser.dadorCargaId === (currentUser as any).dadorCargaId);
        }
        if (currentUser.role === 'TRANSPORTISTA') {
          // Solo puede modificar choferes de su empresa transportista
          return targetUser.role === 'CHOFER' &&
            (targetUser.creadoPorId === currentUser.userId || targetUser.empresaTransportistaId === (currentUser as any).empresaTransportistaId);
        }
        return false;
      })();
      
      if (!canModify) {
        res.status(403).json({ success: false, message: 'No tiene permisos para modificar este usuario' });
        return;
      }
      
      // No permitir desactivarse a sí mismo
      if (targetId === currentUser.userId && !activo) {
        res.status(400).json({ success: false, message: 'No puede desactivarse a sí mismo' });
        return;
      }
      
      // Actualizar estado
      const updatedUser = await prisma.user.update({
        where: { id: targetId },
        data: { activo },
        select: { id: true, email: true, activo: true },
      });
      
      AppLogger.info(`Usuario ${activo ? 'activado' : 'desactivado'}`, { targetId, by: currentUser.userId });
      res.status(200).json({ success: true, data: updatedUser, message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente` });
    } catch (error) {
      AppLogger.error('Error al cambiar estado de usuario:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
);

/**
 * @route GET /api/platform/auth/usuarios
 * @desc Obtener lista de usuarios de plataforma
 * @access Private (Admin/Superadmin/Admin_Interno/Dador/Transportista)
 */
router.get(
  '/usuarios',
  authenticateUser,
  authorizeRoles(['ADMIN', 'SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { page = 1, limit = 10, search = '', role, empresaId } = req.query;

      // Construir filtros usando AND para combinar correctamente
      const conditions: any[] = [];

      // Filtro por texto de búsqueda (email, nombre, apellido o rol)
      if (search && typeof search === 'string' && search.trim()) {
        const searchTerm = search.trim();
        const searchUpper = searchTerm.toUpperCase();
        // Verificar si busca por rol
        const rolesMatch = ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO', 'OPERATOR', 'OPERADOR_INTERNO', 
          'DADOR_DE_CARGA', 'TRANSPORTISTA', 'CHOFER', 'CLIENTE'].filter(r => r.includes(searchUpper));
        
        const searchConditions: any[] = [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { nombre: { contains: searchTerm, mode: 'insensitive' } },
          { apellido: { contains: searchTerm, mode: 'insensitive' } },
        ];
        
        // Si el término coincide con roles, incluirlos
        if (rolesMatch.length > 0) {
          searchConditions.push({ role: { in: rolesMatch } });
        }
        
        conditions.push({ OR: searchConditions });
      }

      // Filtro por rol específico (del query param)
      if (role && typeof role === 'string') {
        conditions.push({ role: role.toUpperCase() });
      }

      // Filtro por empresa
      if (empresaId && typeof empresaId === 'string') {
        conditions.push({ empresaId: parseInt(empresaId) });
      }

      // Restricciones según el rol del usuario actual
      if (user.role === 'ADMIN') {
        // Admin solo puede ver usuarios de su empresa y no puede ver otros superadmins
        conditions.push({ empresaId: user.empresaId });
        conditions.push({ role: { not: 'SUPERADMIN' } });
      } else if (user.role === 'DADOR_DE_CARGA') {
        // Dador de carga solo puede ver usuarios que él creó o que tienen su dadorCargaId
        conditions.push({
          OR: [
            { creadoPorId: user.userId },
            { dadorCargaId: (user as any).dadorCargaId },
          ]
        });
        // Solo puede ver roles TRANSPORTISTA y CHOFER
        conditions.push({ role: { in: ['TRANSPORTISTA', 'CHOFER'] } });
      } else if (user.role === 'TRANSPORTISTA') {
        // Transportista: igual que dador pero con empresaTransportistaId
        conditions.push({
          OR: [
            { creadoPorId: user.userId },
            { empresaTransportistaId: (user as any).empresaTransportistaId },
          ]
        });
        conditions.push({ role: 'CHOFER' });
      }
      
      // Construir where final
      const where = conditions.length > 0 ? { AND: conditions } : {};

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
            activo: true,
            dadorCargaId: true,
            empresaTransportistaId: true,
            choferId: true,
            clienteId: true,
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