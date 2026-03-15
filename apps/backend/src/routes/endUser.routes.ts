import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { EndUserService } from '../services/endUser.service';
import {
  authenticateUser,
  authorizeRoles,
  logAction,
  AuthRequest
} from '../middlewares/platformAuth.middleware';
import { AppLogger } from '../config/logger';
import { UserRole } from '@prisma/client';
import { prismaService } from '../config/prisma';

const router = Router();

/**
 * @route GET /api/end-users
 * @desc Obtener lista de usuarios finales con filtros
 * @access Private (Admin/Superadmin)
 */
router.get(
  '/',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  [
    query('empresaId').optional().isInt({ min: 1 }).withMessage('empresaId debe ser un número positivo'),
    query('identifierType').optional().isIn(['email', 'whatsapp', 'telegram', 'facebook']).withMessage('Tipo de identificador inválido'),
    query('isActive').optional().isBoolean().withMessage('isActive debe ser boolean'),
    query('search').optional().isLength({ max: 100 }).withMessage('Búsqueda no puede exceder 100 caracteres'),
    query('page').optional().isInt({ min: 1 }).withMessage('page debe ser un número positivo'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit debe estar entre 1 y 100'),
  ],
  logAction('END_USER_LIST'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Parámetros inválidos',
          errors: errors.array(),
        });
        return;
      }

      const user = req.user!;
      const {
        empresaId: queryEmpresaId,
        identifierType,
        isActive,
        search,
        page = 1,
        limit = 50,
      } = req.query;

      // Determinar empresaId según el rol del usuario
      let empresaId: number | undefined;
      if (user.role === UserRole.SUPERADMIN) {
        empresaId = queryEmpresaId ? parseInt(queryEmpresaId as string) : undefined;
      } else if (user.role === UserRole.ADMIN) {
        empresaId = user.empresaId || undefined;
      }

      const result = await EndUserService.searchEndUsers({
        empresaId,
        identifierType: identifierType as any,
        isActive: isActive ? isActive === 'true' : undefined,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({
        success: true,
        data: result.users,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo usuarios finales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

/**
 * @route POST /api/end-users
 * @desc Crear un nuevo usuario final
 * @access Private (Admin/Superadmin)
 */
router.post(
  '/',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  [
    body('identifierType').isIn(['email', 'whatsapp', 'telegram', 'facebook']).withMessage('Tipo de identificador inválido'),
    body('identifierValue').notEmpty().isLength({ max: 255 }).withMessage('Valor de identificador requerido (máx. 255 caracteres)'),
    body('empresaId').optional().isInt({ min: 1 }).withMessage('empresaId debe ser un número positivo'),
    body('nombre').optional().isLength({ max: 100 }).withMessage('Nombre no puede exceder 100 caracteres'),
    body('apellido').optional().isLength({ max: 100 }).withMessage('Apellido no puede exceder 100 caracteres'),
  ],
  logAction('END_USER_CREATE'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array(),
        });
        return;
      }

      const user = req.user!;
      const createData: any = req.body;

      // Normalizar nombres de campos: aceptar identifierValue desde el frontend
      if (createData.identifierValue && !createData.identifier_value) {
        createData.identifier_value = createData.identifierValue;
      }

      // Validar empresaId según el rol del usuario
      if (user.role === UserRole.ADMIN) {
        if (createData.empresaId && createData.empresaId !== user.empresaId) {
          res.status(403).json({
            success: false,
            message: 'No puede crear usuarios para otras empresas',
          });
          return;
        }
        createData.empresaId = user.empresaId;
      }

      const endUser = await EndUserService.createEndUser(createData);

      res.status(201).json({
        success: true,
        message: 'Usuario final creado exitosamente',
        data: endUser,
      });
    } catch (error) {
      AppLogger.error('💥 Error creando usuario final:', error);
      
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
);

/**
 * @route PUT /api/end-users/:id
 * @desc Actualizar un usuario final
 * @access Private (Admin/Superadmin)
 */
router.put(
  '/:id',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  [
    body('nombre').optional().isLength({ max: 100 }).withMessage('Nombre no puede exceder 100 caracteres'),
    body('apellido').optional().isLength({ max: 100 }).withMessage('Apellido no puede exceder 100 caracteres'),
    body('isActive').optional().isBoolean().withMessage('isActive debe ser boolean'),
  ],
  logAction('END_USER_UPDATE'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array(),
        });
        return;
      }

      const userId = parseInt(req.params.id);
      const actor = req.user;

      if (actor?.role !== 'SUPERADMIN') {
        const target = await prismaService.getClient().endUser.findUnique({
          where: { id: userId },
          select: { empresaId: true },
        });
        if (target && actor?.empresaId && target.empresaId !== actor.empresaId) {
          res.status(403).json({ success: false, message: 'No tiene permisos para modificar este usuario' });
          return;
        }
      }

      const { nombre, apellido, direccion, localidad, provincia, pais, metadata, isActive } = req.body;
      const updateData = { nombre, apellido, direccion, localidad, provincia, pais, metadata, isActive };

      const endUser = await EndUserService.updateEndUser(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Usuario final actualizado exitosamente',
        data: endUser,
      });
    } catch (error) {
      AppLogger.error('💥 Error actualizando usuario final:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

/**
 * @route DELETE /api/end-users/:id
 * @desc Desactivar un usuario final
 * @access Private (Admin/Superadmin)
 */
router.delete(
  '/:id',
  authenticateUser,
  authorizeRoles(['SUPERADMIN']),
  logAction('END_USER_DEACTIVATE'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.id);

      const endUser = await EndUserService.deactivateEndUser(userId);

      res.status(200).json({
        success: true,
        message: 'Usuario final desactivado exitosamente',
        data: endUser,
      });
    } catch (error) {
      AppLogger.error('💥 Error desactivando usuario final:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

/**
 * @route GET /api/end-users/stats
 * @desc Obtener estadísticas de usuarios finales
 * @access Private (Admin/Superadmin)
 */
router.get(
  '/stats',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  logAction('END_USER_STATS'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;

      // Determinar empresaId según el rol del usuario
      let empresaId: number | undefined;
      if (user.role === UserRole.ADMIN) {
        empresaId = user.empresaId || undefined;
      }

      const stats = await EndUserService.getEndUserStats(empresaId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      AppLogger.error('💥 Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

/**
 * @route POST /api/end-users/identify
 * @desc Identificar un usuario final por su identificador
 * @access Private (Admin/Superadmin)
 */
router.post(
  '/identify',
  authenticateUser,
  authorizeRoles(['SUPERADMIN', 'ADMIN', 'OPERATOR']),
  [
    body('identifierType').isIn(['email', 'whatsapp', 'telegram', 'facebook']).withMessage('Tipo de identificador inválido'),
    body('identifierValue').notEmpty().isLength({ max: 255 }).withMessage('Valor de identificador requerido'),
  ],
  logAction('END_USER_IDENTIFY'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array(),
        });
        return;
      }

      const { identifierType, identifierValue } = req.body;

      const endUser = await EndUserService.identifyUser(identifierType, identifierValue);

      if (!endUser) {
        res.status(404).json({
          success: false,
          message: 'Usuario final no encontrado',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: endUser,
      });
    } catch (error) {
      AppLogger.error('💥 Error identificando usuario final:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

export default router; 