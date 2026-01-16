import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

import { PermissionsService } from '../../src/services/permissions.service';
import { UserRole } from '../../src/types/roles';

describe('PermissionsService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('canAccessEquipo', () => {
    it('returns false when equipo does not exist', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.ADMIN, empresaId: 1 }, 1)).resolves.toBe(false);
    });

    it('superadmin can access', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 9, dadorCargaId: 1, empresaTransportistaId: 2, driverId: 3, driverDniNorm: '1' });
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.SUPERADMIN }, 1)).resolves.toBe(true);
    });

    it('tenant mismatch denies', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 9, dadorCargaId: 1, empresaTransportistaId: 2, driverId: 3, driverDniNorm: '1' });
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.ADMIN, empresaId: 1 }, 1)).resolves.toBe(false);
    });

    it('admin/operator roles allowed when same tenant', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 1, empresaTransportistaId: 2, driverId: 3, driverDniNorm: '1' });
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.ADMIN, empresaId: 1 }, 1)).resolves.toBe(true);
    });

    it('dador/transportista/chofer/client branches', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 1, dadorCargaId: 10, empresaTransportistaId: 20, driverId: 30, driverDniNorm: '301' });

      await expect(PermissionsService.canAccessEquipo({ role: UserRole.DADOR_DE_CARGA, empresaId: 1, metadata: { dadorCargaId: 10 } }, 1)).resolves.toBe(true);
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.TRANSPORTISTA, empresaId: 1, metadata: { empresaTransportistaId: 20 } }, 1)).resolves.toBe(true);
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.CHOFER, empresaId: 1, metadata: { choferId: 30 } }, 1)).resolves.toBe(true);
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.CHOFER, empresaId: 1, metadata: { choferDniNorm: '301' } }, 1)).resolves.toBe(true);

      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ id: 1 });
      await expect(PermissionsService.canAccessEquipo({ role: UserRole.CLIENTE, empresaId: 1 }, 1)).resolves.toBe(true);
    });
  });

  describe('canApproveDocument', () => {
    it('returns false when doc missing or tenant mismatch', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);
      await expect(PermissionsService.canApproveDocument({ role: UserRole.ADMIN, empresaId: 1 }, 1)).resolves.toBe(false);

      prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, dadorCargaId: 3, status: 'PENDIENTE' });
      await expect(PermissionsService.canApproveDocument({ role: UserRole.ADMIN, empresaId: 1 }, 1)).resolves.toBe(false);
    });

    it('superadmin/admin allowed; dador allowed only if matching', async () => {
      prismaMock.document.findUnique.mockResolvedValue({ id: 1, tenantEmpresaId: 1, dadorCargaId: 10, status: 'PENDIENTE' });
      await expect(PermissionsService.canApproveDocument({ role: UserRole.SUPERADMIN }, 1)).resolves.toBe(true);
      await expect(PermissionsService.canApproveDocument({ role: UserRole.ADMIN, empresaId: 1 }, 1)).resolves.toBe(true);
      await expect(PermissionsService.canApproveDocument({ role: UserRole.DADOR_DE_CARGA, empresaId: 1, metadata: { dadorCargaId: 10 } }, 1)).resolves.toBe(true);
      await expect(PermissionsService.canApproveDocument({ role: UserRole.DADOR_DE_CARGA, empresaId: 1, metadata: { dadorCargaId: 11 } }, 1)).resolves.toBe(false);
    });
  });
});


