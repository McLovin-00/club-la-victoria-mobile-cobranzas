import { prisma } from '../config/database';
import { UserRole } from '../types/roles';

type MinimalUser = {
  userId?: number;
  role: string;
  empresaId?: number;
  metadata?: Record<string, any>;
};

// Roles con acceso admin completo
const ADMIN_ROLES = [UserRole.ADMIN, UserRole.OPERATOR, UserRole.OPERADOR_INTERNO, UserRole.ADMIN_INTERNO];

// Helper: extrae metadata numérica de forma segura
function getMetaNumber(metadata: Record<string, any> | undefined, key: string): number | undefined {
  const val = metadata?.[key];
  return typeof val === 'number' ? val : undefined;
}

// Helper: extrae metadata string de forma segura  
function getMetaString(metadata: Record<string, any> | undefined, key: string): string | undefined {
  const val = metadata?.[key];
  return typeof val === 'string' ? val : undefined;
}

export class PermissionsService {
  static async canAccessEquipo(user: MinimalUser, equipoId: number): Promise<boolean> {
    const role = String(user.role);
    
    // Superadmin siempre tiene acceso
    if (role === UserRole.SUPERADMIN) return true;

    const eq = await prisma.equipo.findUnique({
      where: { id: equipoId },
      select: { id: true, tenantEmpresaId: true, dadorCargaId: true, empresaTransportistaId: true, driverId: true, driverDniNorm: true },
    });
    if (!eq) return false;

    // Verificar mismo tenant
    const sameTenant = typeof user.empresaId === 'number' && eq.tenantEmpresaId === user.empresaId;
    if (!sameTenant) return false;

    // Roles admin tienen acceso total en su tenant
    if (ADMIN_ROLES.includes(role as UserRole)) return true;

    // Verificaciones específicas por rol
    const meta = user.metadata;
    
    if (role === UserRole.DADOR_DE_CARGA) {
      const dadorId = getMetaNumber(meta, 'dadorCargaId');
      return !!dadorId && eq.dadorCargaId === dadorId;
    }
    
    if (role === UserRole.TRANSPORTISTA) {
      const empresaId = getMetaNumber(meta, 'empresaTransportistaId');
      return !!empresaId && eq.empresaTransportistaId === empresaId;
    }
    
    if (role === UserRole.CHOFER) {
      const choferId = getMetaNumber(meta, 'choferId');
      const choferDni = getMetaString(meta, 'choferDniNorm');
      return (!!choferId && eq.driverId === choferId) || (!!choferDni && eq.driverDniNorm === choferDni);
    }
    
    if (role === UserRole.CLIENTE) {
      const assigned = await prisma.equipoCliente.findFirst({ where: { equipoId } });
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
      const dadorId: number | undefined = typeof user.metadata?.dadorCargaId === 'number' ? user.metadata.dadorCargaId : undefined;
      return !!dadorId && doc.dadorCargaId === dadorId;
    }
    return false;
  }
}


