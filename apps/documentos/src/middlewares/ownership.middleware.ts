import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../config/database';
import { AppLogger } from '../config/logger';

type EquipoData = {
  id: number;
  tenantEmpresaId: number;
  dadorCargaId: number;
  empresaTransportistaId: number | null;
  clientes: Array<{ clienteId: number }>;
};

type UserData = { userId: number; role: string; empresaId?: number | null };

// Helper: verificar acceso de cliente a equipo
function checkClienteAccess(equipo: EquipoData, user: UserData, equipoId: number): string | null {
  const clienteIds = equipo.clientes.map(c => c.clienteId);
  if (!clienteIds.includes(user.empresaId!)) {
    AppLogger.warn('🚫 CLIENTE: acceso denegado a equipo no asignado', {
      userId: user.userId,
      equipoId,
      clientesEquipo: clienteIds,
      userClienteId: user.empresaId,
    });
    return 'No tiene acceso a este equipo';
  }
  return null;
}

// Helper: verificar acceso por tenant
function checkTenantAccess(equipo: EquipoData, user: UserData, equipoId: number, role: string): string | null {
  if (equipo.tenantEmpresaId !== user.empresaId) {
    AppLogger.warn(`🚫 ${role}: acceso denegado a equipo de otro tenant`, {
      userId: user.userId,
      equipoId,
      userTenant: user.empresaId,
      equipoTenant: equipo.tenantEmpresaId,
    });
    return 'No tiene acceso a este equipo';
  }
  return null;
}

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

      const equipo = await prisma.equipo.findUnique({
        where: { id: equipoId },
        select: {
          id: true,
          tenantEmpresaId: true,
          dadorCargaId: true,
          empresaTransportistaId: true,
          clientes: { where: { asignadoHasta: null }, select: { clienteId: true } },
        },
      });

      if (!equipo) {
        return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
      }

      // Verificar acceso según rol
      let error: string | null = null;
      
      if (user.role === 'CLIENTE') {
        error = checkClienteAccess(equipo, user, equipoId);
      } else {
        error = checkTenantAccess(equipo, user, equipoId, user.role);
      }

      if (error) {
        return res.status(403).json({ success: false, message: error });
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

