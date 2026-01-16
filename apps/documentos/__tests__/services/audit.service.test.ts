/**
 * Tests unitarios para AuditService
 */
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { AuditService } from '../../src/services/audit.service';

describe('AuditService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      prismaMock.auditLog.create.mockResolvedValue({ id: 1 });

      await AuditService.log({
        method: 'POST',
        path: '/api/docs/documents',
        statusCode: 201,
        action: 'DOCUMENT_UPLOAD',
        tenantEmpresaId: 1,
        userId: 1,
        entityType: 'DOCUMENT',
        entityId: 1,
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'DOCUMENT_UPLOAD',
            method: 'POST',
            path: '/api/docs/documents',
            statusCode: 201,
          }),
        })
      );
    });
  });

  describe('getEquipoHistory', () => {
    it('returns [] when no model is available', async () => {
      prismaMock.equipoAuditLog = undefined as any;
      const result = await AuditService.getEquipoHistory(1);
      expect(result).toEqual([]);
    });

    it('calls equipoAuditLog.findMany when available', async () => {
      prismaMock.equipoAuditLog = { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) } as any;
      const result = await AuditService.getEquipoHistory(10);
      expect(result).toEqual([{ id: 1 }]);
      expect(prismaMock.equipoAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { equipoId: 10 } })
      );
    });
  });
});


