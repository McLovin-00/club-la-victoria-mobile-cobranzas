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
      const mockLog = {
        id: 1,
        action: 'DOCUMENT_UPLOAD',
        userId: 1,
        entityType: 'DOCUMENT',
        entityId: 1,
        details: {},
        createdAt: new Date(),
      };

      prismaMock.auditLog.create.mockResolvedValue(mockLog);

      await AuditService.log({
        action: 'DOCUMENT_UPLOAD',
        userId: 1,
        entityType: 'DOCUMENT',
        entityId: 1,
        details: {},
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DOCUMENT_UPLOAD',
            userId: 1,
          }),
        })
      );
    });
  });

  describe('getByEntity', () => {
    it('should return audit logs for entity', async () => {
      const mockLogs = [
        { id: 1, action: 'DOCUMENT_UPLOAD', createdAt: new Date() },
        { id: 2, action: 'DOCUMENT_APPROVED', createdAt: new Date() },
      ];

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await AuditService.getByEntity('DOCUMENT', 1);

      expect(result).toHaveLength(2);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'DOCUMENT', entityId: 1 },
        })
      );
    });
  });

  describe('getByUser', () => {
    it('should return audit logs for user', async () => {
      const mockLogs = [
        { id: 1, action: 'DOCUMENT_UPLOAD', userId: 1, createdAt: new Date() },
      ];

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await AuditService.getByUser(1);

      expect(result).toHaveLength(1);
      expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
        })
      );
    });
  });
});



