import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import {
  getInstances,
  getInstanceById,
  createInstance,
  updateInstance,
  deleteInstance,
  getInstanceStats,
  changeInstanceEstado,
} from '../controllers/instance.controller';
import { authenticateUser, authorizeRoles } from '../middlewares/platformAuth.middleware';
import { handleExpressValidatorErrors } from '../middlewares/validation.middleware';
import { AuthPayload } from '../services/platformAuth.service';
import { AppLogger } from '../config/logger';
import { InstanceService } from '../services/instance.service';
import { prismaService } from '../config/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

// Helper: validar acceso de usuario a instancia (para rutas inline)
interface InstanceAccessResult {
  allowed: boolean;
  instance?: any;
  errorStatus?: number;
  errorMessage?: string;
}

async function validateInstanceAccess(
  user: AuthPayload,
  instanceId: number,
  action: string
): Promise<InstanceAccessResult> {
  const instanceService = InstanceService.getInstance();
  const instance = await instanceService.findById(instanceId);
  
  if (!instance) {
    return { allowed: false, errorStatus: 404, errorMessage: 'Instancia no encontrada' };
  }

  if (user.role === UserRole.SUPERADMIN) {
    return { allowed: true, instance };
  }
  
  if ((user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR) && user.empresaId) {
    if (instance.empresaId !== user.empresaId) {
      AppLogger.warn(`⚠️ Usuario sin permisos para ${action} de esta instancia`, {
        instanceId,
        userId: user.userId,
        userEmpresaId: user.empresaId,
        instanceEmpresaId: instance.empresaId,
      });
      return { allowed: false, errorStatus: 403, errorMessage: `No tienes permisos para ${action} de esta instancia` };
    }
    return { allowed: true, instance };
  }
  
  return { allowed: false, errorStatus: 403, errorMessage: `No tienes permisos para ${action}` };
}

// Middleware de autenticación para todas las rutas
router.use(authenticateUser);

// Validaciones
const createInstanceValidation = [
  body('nombre')
    .isString()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre debe tener entre 1 y 150 caracteres')
    .trim(),
  body('serviceId')
    .isInt({ min: 1 })
    .withMessage('El ID del servicio debe ser un número entero positivo'),
  body('empresaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de la empresa debe ser un número entero positivo'),
  body('estado')
    .optional()
    .isIn(['activa', 'inactiva', 'error'])
    .withMessage('El estado debe ser: activa, inactiva o error'),
  body('configuracion')
    .optional()
    .isObject()
    .withMessage('La configuración debe ser un objeto JSON válido'),
];

const updateInstanceValidation = [
  body('nombre')
    .optional()
    .isString()
    .isLength({ min: 1, max: 150 })
    .withMessage('El nombre debe tener entre 1 y 150 caracteres')
    .trim(),
  body('serviceId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del servicio debe ser un número entero positivo'),
  body('estado')
    .optional()
    .isIn(['activa', 'inactiva', 'error'])
    .withMessage('El estado debe ser: activa, inactiva o error'),
  body('configuracion')
    .optional()
    .isObject()
    .withMessage('La configuración debe ser un objeto JSON válido'),
];

const changeEstadoValidation = [
  body('estado')
    .isIn(['activa', 'inactiva', 'error'])
    .withMessage('El estado debe ser: activa, inactiva o error'),
];

const instanceIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
];

const getInstancesValidation = [
  query('search')
    .optional()
    .isString()
    .withMessage('La búsqueda debe ser una cadena de texto'),
  query('serviceId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del servicio debe ser un número entero positivo'),
  query('estado')
    .optional()
    .isIn(['activa', 'inactiva', 'error'])
    .withMessage('El estado debe ser: activa, inactiva o error'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser entre 1 y 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El offset debe ser mayor o igual a 0'),
];

// Rutas públicas (requieren autenticación, permisos se validan en el controlador)
router.get('/', authorizeRoles(['ADMIN', 'SUPERADMIN']), getInstancesValidation, handleExpressValidatorErrors, getInstances);
router.get('/stats', authorizeRoles(['ADMIN', 'SUPERADMIN']), getInstanceStats);
router.get('/:id', authorizeRoles(['ADMIN', 'SUPERADMIN']), instanceIdValidation, handleExpressValidatorErrors, getInstanceById);

// Rutas protegidas (requieren superadmin o admin)
router.post(
  '/',
  authorizeRoles(['SUPERADMIN', 'ADMIN']),
  createInstanceValidation,
  handleExpressValidatorErrors,
  createInstance
);

router.put(
  '/:id',
  authorizeRoles(['SUPERADMIN']),
  instanceIdValidation,
  updateInstanceValidation,
  handleExpressValidatorErrors,
  updateInstance
);

router.delete(
  '/:id',
  authorizeRoles(['SUPERADMIN']),
  instanceIdValidation,
  handleExpressValidatorErrors,
  deleteInstance
);

router.patch(
  '/:id/estado',
  authorizeRoles(['SUPERADMIN']),
  instanceIdValidation,
  changeEstadoValidation,
  handleExpressValidatorErrors,
  changeInstanceEstado
);

// Legacy canales routes removed. Use Gateway microservice under /api/gateway/*.

// Rutas para gestión de permisos de instancias
router.get(
  '/:id/permisos',
  instanceIdValidation,
  handleExpressValidatorErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user as AuthPayload;
      const instanceId = parseInt(id);

      AppLogger.info('📋 Obteniendo permisos para instancia', {
        instanceId,
        userId: user.userId,
      });

      const access = await validateInstanceAccess(user, instanceId, 'ver permisos');
      if (!access.allowed) {
        return res.status(access.errorStatus!).json({ success: false, message: access.errorMessage });
      }

      // Obtener los permisos usando Prisma
      const permisos = await prismaService.getClient().permiso.findMany({
        where: {
          instanciaId: instanceId,
        },
        include: {
          endUser: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellido: true,
            },
          },
          pases: {
            select: {
              id: true,
              fechaInicio: true,
              fechaFin: true,
            },
          },
        },
        orderBy: {
          endUser: {
            email: 'asc',
          },
        },
      });

      AppLogger.info('✅ Permisos obtenidos exitosamente', {
        instanceId,
        count: permisos.length,
        userId: user.userId,
      });

      res.json({
        success: true,
        data: permisos,
      });
    } catch (error) {
      AppLogger.error('❌ Error al obtener permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

router.post(
  '/:id/permisos',
  instanceIdValidation,
  body('userId').isInt({ min: 1 }).withMessage('ID del usuario debe ser un número entero positivo'),
  body('esWhitelist').optional().isBoolean().withMessage('esWhitelist debe ser un boolean'),
  body('limiteTotal').optional().isInt({ min: 0 }).withMessage('limiteTotal debe ser un número entero no negativo'),
  body('periodoReseteo').optional().isIn(['NUNCA', 'DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL']).withMessage('periodoReseteo debe ser válido'),
  handleExpressValidatorErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, esWhitelist = false, limiteTotal = 0, periodoReseteo = 'NUNCA' } = req.body;
      const user = (req as any).user as AuthPayload;
      const instanceId = parseInt(id);

      AppLogger.info('👤 Creando permiso para usuario', {
        instanceId,
        userId,
        esWhitelist,
        limiteTotal,
        adminUserId: user.userId,
      });

      const access = await validateInstanceAccess(user, instanceId, 'crear permisos');
      if (!access.allowed) {
        return res.status(access.errorStatus!).json({ success: false, message: access.errorMessage });
      }

      // Verificar que el usuario target existe
      const targetUser = await prismaService.getClient().endUser.findUnique({
        where: { id: userId },
        select: { id: true, email: true, empresaId: true },
      });

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        });
      }

      // Validar que el usuario pertenece a la empresa correcta (si no es superadmin)
      if (user.role !== UserRole.SUPERADMIN && targetUser.empresaId !== user.empresaId) {
        AppLogger.warn('⚠️ Intento de crear permiso para usuario de otra empresa', {
          instanceId,
          targetUserId: userId,
          targetUserEmpresaId: targetUser.empresaId,
          adminEmpresaId: user.empresaId,
          adminUserId: user.userId,
        });
        return res.status(403).json({
          success: false,
          message: 'No puedes crear permisos para usuarios de otras empresas',
        });
      }

      // Verificar que no existe ya un permiso para este usuario en esta instancia
      const existingPermiso = await prismaService.getClient().permiso.findFirst({
        where: {
          endUserId: userId,
          instanciaId: instanceId,
        },
      });

      if (existingPermiso) {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya tiene un permiso para esta instancia',
        });
      }

      // Crear el permiso
      const permiso = await prismaService.getClient().permiso.create({
        data: {
          endUserId: userId,
          instanciaId: instanceId,
          esWhitelist,
          limiteTotal,
          consumido: 0,
          periodoReseteo,
        },
        include: {
          endUser: {
            select: {
              id: true,
              email: true,
              nombre: true,
              apellido: true,
            },
          },
        },
      });

      AppLogger.info('✅ Permiso creado exitosamente', {
        permisoId: permiso.id,
        instanceId,
        userId,
        targetUserEmail: targetUser.email,
        adminUserId: user.userId,
      });

      res.status(201).json({
        success: true,
        data: permiso,
      });
    } catch (error: any) {
      AppLogger.error('❌ Error al crear permiso:', error);

      // Manejar error de constraint único (si llegara a ocurrir)
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'El usuario ya tiene un permiso para esta instancia',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

// Rutas para logs de auditoría de instancias
router.get(
  '/:id/audit-logs',
  instanceIdValidation,
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe ser entre 1 y 100'),
  handleExpressValidatorErrors,
  async (req: Request, res: Response) => {
    try {
      const { id: _id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const _user = (req as any).user;
      
      // Por ahora devolver un array vacío hasta implementar la lógica completa
      res.json({
        success: true,
        data: [],
        total: 0,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: 0
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

// Rutas para usuarios disponibles de instancias
router.get(
  '/:id/users/available',
  instanceIdValidation,
  query('search').optional().isString().withMessage('La búsqueda debe ser una cadena de texto'),
  handleExpressValidatorErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { search } = req.query as { search?: string };
      const user = (req as any).user as AuthPayload;
      const instanceId = parseInt(id);

      AppLogger.info('👥 Obteniendo usuarios disponibles para instancia', {
        instanceId,
        search,
        userId: user.userId,
      });

      const access = await validateInstanceAccess(user, instanceId, 'gestionar usuarios');
      if (!access.allowed) {
        return res.status(access.errorStatus!).json({ success: false, message: access.errorMessage });
      }

      // Filtro de empresa según rol
      const empresaFilter = user.role === UserRole.SUPERADMIN ? {} : { empresaId: user.empresaId };

      // Construir filtros de búsqueda
      const searchFilter = search ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as any } },
          { nombre: { contains: search, mode: 'insensitive' as any } },
          { apellido: { contains: search, mode: 'insensitive' as any } },
        ]
      } : {};

      // Obtener usuarios disponibles (que NO tienen permiso para esta instancia)
      const availableUsers = await prismaService.getClient().endUser.findMany({
        where: {
          ...empresaFilter,
          ...searchFilter,
          // Excluir usuarios que ya tienen permiso para esta instancia
          permisos: {
            none: {
              instanciaId: instanceId,
            },
          },
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          empresaId: true,
        },
        orderBy: [
          { email: 'asc' },
        ],
        take: 50, // Limitar resultados para performance
      });

      AppLogger.info('✅ Usuarios disponibles obtenidos exitosamente', {
        instanceId,
        count: availableUsers.length,
        search,
        userId: user.userId,
      });

      res.json({
        success: true,
        data: availableUsers,
      });
    } catch (error) {
      AppLogger.error('❌ Error al obtener usuarios disponibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

// Rutas adicionales para operaciones con permisos específicos
router.put(
  '/:instanceId/permisos/:permisoId',
  instanceIdValidation,
  param('permisoId').isInt({ min: 1 }).withMessage('El ID del permiso debe ser un número entero positivo'),
  handleExpressValidatorErrors,
  async (req: Request, res: Response) => {
    try {
      const { instanceId: _instanceId, permisoId: _permisoId } = req.params;
      const _user = (req as any).user;
      
      // Por ahora devolver un objeto vacío hasta implementar la lógica completa
      res.json({
        success: true,
        data: { id: parseInt(_permisoId), ...req.body }
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

router.delete(
  '/:instanceId/permisos/:permisoId',
  instanceIdValidation,
  param('permisoId').isInt({ min: 1 }).withMessage('El ID del permiso debe ser un número entero positivo'),
  handleExpressValidatorErrors,
  async (req: Request, res: Response) => {
    try {
      const { instanceId: _instanceId, permisoId: _permisoId } = req.params;
      const _user = (req as any).user;
      
      // Por ahora devolver respuesta exitosa hasta implementar la lógica completa
      res.status(204).send();
    } catch (_error) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
);

export default router; 