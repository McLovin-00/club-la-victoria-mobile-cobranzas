import { prisma } from '../config/database';
import { UserRole } from '../types/roles';

type MinimalUser = {
  userId?: number;
  role: string;
  empresaId?: number;
  metadata?: Record<string, any>;
};

export class PermissionsService {
  static async canAccessEquipo(user: MinimalUser, equipoId: number): Promise<boolean> {
    const eq = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { id: true, tenantEmpresaId: true, dadorCargaId: true, empresaTransportistaId: true, driverId: true, driverDniNorm: true },
    });
    if (!eq) return false;

    const role = String(user.role);
    if (role === UserRole.SUPERADMIN) return true;

    const sameTenant = typeof user.empresaId === 'number' && eq.tenantEmpresaId === user.empresaId;
    if (!sameTenant) return false;

    if (role === UserRole.ADMIN || role === UserRole.OPERATOR || role === UserRole.OPERADOR_INTERNO || role === UserRole.ADMIN_INTERNO) {
      return true;
    }

    const dadorId: number | undefined =
      typeof user.metadata?.dadorCargaId === 'number' ? user.metadata!.dadorCargaId : undefined;
    if (role === UserRole.DADOR_DE_CARGA) {
      return !!dadorId && eq.dadorCargaId === dadorId;
    }

    const empresaTransportistaId: number | undefined =
      typeof user.metadata?.empresaTransportistaId === 'number' ? user.metadata!.empresaTransportistaId : undefined;
    const choferId: number | undefined = typeof user.metadata?.choferId === 'number' ? user.metadata!.choferId : undefined;
    const choferDniNorm: string | undefined = typeof user.metadata?.choferDniNorm === 'string' ? user.metadata!.choferDniNorm : undefined;

    if (role === UserRole.TRANSPORTISTA) {
      return !!empresaTransportistaId && eq.empresaTransportistaId === empresaTransportistaId;
    }
    if (role === UserRole.CHOFER) {
      return (typeof choferId === 'number' && eq.driverId === choferId) ||
             (!!choferDniNorm && eq.driverDniNorm === choferDniNorm);
    }
    if (role === UserRole.CLIENTE) {
      // Cliente solo por equipos asignados: verificación más estricta podría requerir join
      const assigned = await prisma.equipoCliente.findFirst({ where: { equipoId: equipoId } });
      return !!assigned;
    }
    return false;
  }

  static async canApproveDocument(user: MinimalUser, documentId: number): Promise<boolean> {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, tenantEmpresaId: true, dadorCargaId: true, status: true },
    });
    if (!doc) return false;
    const role = String(user.role);
    if (role === UserRole.SUPERADMIN) return true;
    const sameTenant = typeof user.empresaId === 'number' && doc.tenantEmpresaId === user.empresaId;
    if (!sameTenant) return false;
    if (role === UserRole.ADMIN || role === UserRole.OPERATOR || role === UserRole.OPERADOR_INTERNO || role === UserRole.ADMIN_INTERNO) {
      return true;
    }
    if (role === UserRole.DADOR_DE_CARGA) {
      // Política acotada: permitir si doc pertenece a su dador (ajustable por flag en el futuro)
      const dadorId: number | undefined = typeof user.metadata?.dadorCargaId === 'number' ? user.metadata!.dadorCargaId : undefined;
      return !!dadorId && doc.dadorCargaId === dadorId;
    }
    return false;
  }
}


