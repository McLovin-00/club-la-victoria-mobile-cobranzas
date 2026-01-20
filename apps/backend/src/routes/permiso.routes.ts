import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { authenticateUser, authorizeRoles, tenantResolver } from '../middlewares/platformAuth.middleware';
import { AuthPayload } from '../services/auth.service';
import { AppLogger } from '../config/logger';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateUser, tenantResolver);

// Middleware de validación
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array(),
    });
  }
  next();
};

const permisoIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('El ID del permiso debe ser un número entero positivo'),
];

// Ruta para eliminar permiso específico
router.delete(
  '/:id',
  authorizeRoles(['SUPERADMIN','ADMIN']),
  permisoIdValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = (req as any).user as AuthPayload;
      const permisoId = parseInt(id);

      AppLogger.info('🗑️ Eliminando permiso', {
        permisoId,
        userId: user.userId,
      });

      // Verificar que el permiso existe
      const existingPermiso = await prisma.permiso.findUnique({
        where: { id: permisoId },
        include: {
          instancia: true,
        },
      });

      if (!existingPermiso) {
        AppLogger.warn('⚠️ Permiso no encontrado', {
          permisoId,
          userId: user.userId,
        });
        return res.status(404).json({
          success: false,
          message: 'Permiso no encontrado',
        });
      }

      // Validar permisos según el rol
      if (user.role === UserRole.SUPERADMIN) {
        // Superadmin puede ver permisos de cualquier instancia
      } else if ((user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR) && user.empresaId) {
        // Admin y user solo pueden eliminar permisos de instancias de su empresa
        if (existingPermiso.instancia.empresaId !== user.empresaId) {
          AppLogger.warn('⚠️ Usuario sin permisos para eliminar este permiso', {
            permisoId,
            userId: user.userId,
            userEmpresaId: user.empresaId,
            instanceEmpresaId: existingPermiso.instancia.empresaId,
          });
          return res.status(403).json({
            success: false,
            message: 'No tienes permisos para eliminar este permiso',
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar permisos',
        });
      }

      // Eliminar el permiso (esto eliminará automáticamente los pases temporales por CASCADE)
      await prisma.permiso.delete({
        where: { id: permisoId },
      });

      AppLogger.info('✅ Permiso eliminado exitosamente', {
        permisoId,
        instanceId: existingPermiso.instanciaId,
        userId: user.userId,
      });

      res.status(204).send();
    } catch (error) {
      AppLogger.error('❌ Error al eliminar permiso:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }
  }
);

export default router; 