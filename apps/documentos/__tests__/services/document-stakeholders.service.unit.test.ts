import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { DocumentStakeholdersService } from '../../src/services/document-stakeholders.service';
import { AppLogger } from '../../src/config/logger';

describe('DocumentStakeholdersService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('getDocumentStakeholders', () => {
    it('should return empty array when document not found', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce(null);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(999);

      expect(result).toEqual([]);
      expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Documento 999 no encontrado'));
    });

    it('should return all stakeholders types for a valid document', async () => {
      const mockDocument = {
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      };

      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocument as any);

      // Mock admin users
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 1, email: 'admin@test.com', role: 'SUPERADMIN' },
        { id: 2, email: 'admin2@test.com', role: 'ADMIN' },
      ]);

      // Mock dador stakeholders
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 3, email: 'dador@test.com' },
      ]);

      // Mock transportista stakeholders (empresaTransportistaId from chofer query)
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 4, email: 'transportista@test.com' },
      ]);

      // Mock chofer stakeholders
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 5, email: 'chofer@test.com' },
      ]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result).toHaveLength(5); // 2 admins + 1 dador + 1 transportista + 1 chofer
    });

    it('should only get admins and dador stakeholders when entityType is not CHOFER', async () => {
      const mockDocument = {
        id: 1,
        entityType: 'CAMION',
        entityId: 20,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      };

      prismaMock.document.findUnique.mockResolvedValueOnce(mockDocument as any);

      // Mock admin users
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 1, email: 'admin@test.com', role: 'SUPERADMIN' },
      ]);

      // Mock dador stakeholders
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 3, email: 'dador@test.com' },
      ]);

      // Mock transportista stakeholders (from camion)
      prismaMock.camion.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 4, email: 'transportista@test.com' },
      ]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result).toHaveLength(3); // 1 admin + 1 dador + 1 transportista (no chofer)
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.document.findUnique.mockRejectedValueOnce(new Error('DB Error'));

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result).toEqual([]);
      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error obteniendo stakeholders'), expect.any(Error));
    });
  });

  describe('getAdminUsers', () => {
    it('should return admin users with SUPERADMIN, ADMIN, ADMIN_INTERNO roles', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 1, email: 'super@test.com', role: 'SUPERADMIN' },
        { id: 2, email: 'admin@test.com', role: 'ADMIN' },
        { id: 3, email: 'interno@test.com', role: 'ADMIN_INTERNO' },
      ]);

      // Access via public method that triggers this private logic
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CAMION',
        entityId: 1,
        dadorCargaId: 1,
        tenantEmpresaId: 1,
      } as any);

      // Empty responses for other stakeholder types
      prismaMock.$queryRaw.mockResolvedValue([]);
      prismaMock.$queryRaw.mockResolvedValue([]);
      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.filter((s: any) => ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(s.role))).toHaveLength(3);
    });

    it('should return empty array on error', async () => {
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Query Error'));

      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CAMION',
        entityId: 1,
        dadorCargaId: 1,
        tenantEmpresaId: 1,
      } as any);

      // Empty responses for other stakeholder types
      prismaMock.$queryRaw.mockResolvedValue([]);
      prismaMock.$queryRaw.mockResolvedValue([]);
      prismaMock.$queryRaw.mockResolvedValue([]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      // Should have 0 admins due to error
      expect(result.filter((s: any) => ['SUPERADMIN', 'ADMIN', 'ADMIN_INTERNO'].includes(s.role))).toHaveLength(0);
    });
  });

  describe('getTransportistaStakeholders', () => {
    it('should handle EMPRESA_TRANSPORTISTA entity type', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'EMPRESA_TRANSPORTISTA',
        entityId: 50,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 10, email: 'transportista@test.com' },
      ]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.some((s: any) => s.role === 'TRANSPORTISTA')).toBe(true);
    });

    it('should handle CHOFER entity type and query chofer for empresaTransportistaId', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 10, email: 'transportista@test.com' },
      ]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.some((s: any) => s.role === 'TRANSPORTISTA')).toBe(true);
      expect(prismaMock.chofer.findFirst).toHaveBeenCalledWith({
        where: { id: 10, dadorCargaId: 2, tenantEmpresaId: 1 },
        select: { empresaTransportistaId: true },
      });
    });

    it('should handle CAMION entity type and query camion for empresaTransportistaId', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CAMION',
        entityId: 20,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.camion.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 10, email: 'transportista@test.com' },
      ]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.some((s: any) => s.role === 'TRANSPORTISTA')).toBe(true);
      expect(prismaMock.camion.findFirst).toHaveBeenCalledWith({
        where: { id: 20, dadorCargaId: 2, tenantEmpresaId: 1 },
        select: { empresaTransportistaId: true },
      });
    });

    it('should handle ACOPLADO entity type and query acoplado for empresaTransportistaId', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'ACOPLADO',
        entityId: 30,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.acoplado.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 10, email: 'transportista@test.com' },
      ]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.some((s: any) => s.role === 'TRANSPORTISTA')).toBe(true);
      expect(prismaMock.acoplado.findFirst).toHaveBeenCalledWith({
        where: { id: 30, dadorCargaId: 2, tenantEmpresaId: 1 },
        select: { empresaTransportistaId: true },
      });
    });

    it('should return empty when empresaTransportistaId is null', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: null,
      } as any);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.filter((s: any) => s.role === 'TRANSPORTISTA')).toHaveLength(0);
    });

    it('should handle getTransportistaStakeholders errors', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Dador query error'));
      prismaMock.$queryRaw.mockResolvedValueOnce([]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      // Should handle error gracefully
      expect(result).toBeDefined();
    });
  });

  describe('getChoferStakeholders', () => {
    it('should return chofer stakeholders', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 100, email: 'chofer@test.com' },
      ]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.some((s: any) => s.role === 'CHOFER')).toBe(true);
    });

    it('should handle getChoferStakeholders errors', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CHOFER',
        entityId: 10,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.chofer.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Chofer query error'));

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      // Should handle error gracefully
      expect(result).toBeDefined();
    });
  });

  describe('getDadorStakeholders', () => {
    it('should return dador stakeholders', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CAMION',
        entityId: 20,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockResolvedValueOnce([
        { id: 50, email: 'dador@test.com' },
      ]);

      prismaMock.camion.findFirst.mockResolvedValueOnce({
        empresaTransportistaId: 5,
      } as any);
      prismaMock.$queryRaw.mockResolvedValueOnce([]);

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      expect(result.some((s: any) => s.role === 'DADOR_DE_CARGA')).toBe(true);
    });

    it('should handle getDadorStakeholders errors', async () => {
      prismaMock.document.findUnique.mockResolvedValueOnce({
        id: 1,
        entityType: 'CAMION',
        entityId: 20,
        dadorCargaId: 2,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.$queryRaw.mockResolvedValueOnce([]);
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Dador error'));

      const result = await DocumentStakeholdersService.getDocumentStakeholders(1);

      // Should handle error gracefully
      expect(result).toBeDefined();
    });
  });
});
