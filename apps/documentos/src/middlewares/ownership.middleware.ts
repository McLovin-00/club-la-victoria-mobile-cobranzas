import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';

/**
 * Middleware de Ownership - Verifica acceso a equipos según rol
 * 
 * Roles y accesos:
 * - SUPERADMIN / ADMIN_INTERNO: Acceso total
 * - DADOR_DE_CARGA: Equipos de su dadorCargaId (= tenantId)
 * - TRANSPORTISTA: Equipos donde empresaTransportistaId pertenece a su tenant
 * - CLIENTE: Equipos asignados a su cliente
 */
export function ownsEquipo() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      const equipoId = Number(req.params.id || req.params.equipoId);
      if (!equipoId || isNaN(equipoId)) {
        return res.status(400).json({ success: false, message: 'ID de equipo requerido' });
      }

      // Admin tiene acceso total
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_INTERNO') {
        return next();
      }

      // Obtener equipo con sus relaciones
      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
        select: {
          id: true,
          tenantEmpresaId: true,
          dadorCargaId: true,
          empresaTransportistaId: true,
          clientes: {
            where: { asignadoHasta: null },
            select: { clienteId: true },
          },
        },
      });

      if (!equipo) {
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }

      const userTenantId = user.empresaId;

      // Verificar acceso según rol
      switch (user.role) {
        case 'DADOR_DE_CARGA':
          // Dador solo accede a equipos de su tenant donde él es el dador
          if (equipo.tenantEmpresaId !== userTenantId) {
            AppLogger.warn('🚫 DADOR_DE_CARGA: acceso denegado a equipo de otro tenant', {
              userId: user.userId,
              equipoId,
              userTenant: userTenantId,
              equipoTenant: equipo.tenantEmpresaId,
            });
            return res.status(403).json({ success: false, message: 'No tiene acceso a este equipo' });
          }
          break;

        case 'TRANSPORTISTA':
          // Transportista solo accede a equipos de su tenant
          // donde la empresa transportista pertenece a su misma empresa
          if (equipo.tenantEmpresaId !== userTenantId) {
            AppLogger.warn('🚫 TRANSPORTISTA: acceso denegado a equipo de otro tenant', {
              userId: user.userId,
              equipoId,
            });
            return res.status(403).json({ success: false, message: 'No tiene acceso a este equipo' });
          }
          break;

        case 'CLIENTE':
          // Cliente solo puede ver equipos asignados a él
          // Necesitamos obtener el clienteId del usuario
          // Por ahora, asumimos que empresaId es el clienteId
          const clienteIds = equipo.clientes.map(c => c.clienteId);
          if (!clienteIds.includes(userTenantId!)) {
            AppLogger.warn('🚫 CLIENTE: acceso denegado a equipo no asignado', {
              userId: user.userId,
              equipoId,
              clientesEquipo: clienteIds,
              userClienteId: userTenantId,
            });
            return res.status(403).json({ success: false, message: 'No tiene acceso a este equipo' });
          }
          break;

        default:
          // Otros roles (OPERATOR, etc.) usan verificación de tenant
          if (equipo.tenantEmpresaId !== userTenantId) {
            return res.status(403).json({ success: false, message: 'No tiene acceso a este equipo' });
          }
      }

      next();
    } catch (error) {
      AppLogger.error('💥 Error en middleware ownership:', error);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  };
}

/**
 * Middleware para verificar si el usuario puede modificar un equipo
 * (más restrictivo que solo ver)
 */
export function canModifyEquipo() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      // Solo SUPERADMIN, ADMIN_INTERNO, DADOR_DE_CARGA y TRANSPORTISTA pueden modificar
      const allowedRoles = ['SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA', 'TRANSPORTISTA'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ success: false, message: 'No tiene permiso para modificar equipos' });
      }

      // Delegar verificación de ownership
      return ownsEquipo()(req, res, next);
    } catch (error) {
      AppLogger.error('💥 Error en middleware canModifyEquipo:', error);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  };
}

/**
 * Middleware para verificar si el usuario puede aprobar documentos
 */
export function canApproveDocuments() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      // Solo SUPERADMIN, ADMIN_INTERNO y DADOR_DE_CARGA pueden aprobar
      const allowedRoles = ['SUPERADMIN', 'ADMIN_INTERNO', 'DADOR_DE_CARGA'];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo Dadores de Carga o Administradores pueden aprobar documentos' 
        });
      }

      next();
    } catch (error) {
      AppLogger.error('💥 Error en middleware canApproveDocuments:', error);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  };
}

/**
 * Middleware para verificar si el usuario puede transferir equipos
 * (solo ADMIN_INTERNO)
 */
export function canTransferEquipo() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      // Solo ADMIN_INTERNO puede transferir equipos entre dadores
      if (user.role !== 'ADMIN_INTERNO' && user.role !== 'SUPERADMIN') {
        return res.status(403).json({ 
          success: false, 
          message: 'Solo Administradores Internos pueden transferir equipos' 
        });
      }

      next();
    } catch (error) {
      AppLogger.error('💥 Error en middleware canTransferEquipo:', error);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  };
}

