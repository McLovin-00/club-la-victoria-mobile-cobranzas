/**
 * Tests para StatusService - Sistema de Semáforos
 * @jest-environment node
 */

const mockDocument = {
  groupBy: jest.fn(),
  count: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  db: {
    getClient: () => ({ document: mockDocument }),
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { StatusService } from '../../src/services/status.service';

describe('StatusService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEntityStatus', () => {
    it('should return rojo when no documents', () => {
      const result = StatusService.calculateEntityStatus({
        total: 0,
        aprobado: 0,
        pendiente: 0,
        rechazado: 0,
        vencido: 0,
      });
      expect(result).toBe('rojo');
    });

    it('should return rojo when documents are vencido', () => {
      const result = StatusService.calculateEntityStatus({
        total: 5,
        aprobado: 3,
        pendiente: 0,
        rechazado: 1,
        vencido: 1,
      });
      expect(result).toBe('rojo');
    });

    it('should return rojo when more than 50% rechazados', () => {
      const result = StatusService.calculateEntityStatus({
        total: 10,
        aprobado: 2,
        pendiente: 2,
        rechazado: 6,
        vencido: 0,
      });
      expect(result).toBe('rojo');
    });

    it('should return verde when all documents aprobados', () => {
      const result = StatusService.calculateEntityStatus({
        total: 5,
        aprobado: 5,
        pendiente: 0,
        rechazado: 0,
        vencido: 0,
      });
      expect(result).toBe('verde');
    });

    it('should return amarillo when documents in progress', () => {
      const result = StatusService.calculateEntityStatus({
        total: 5,
        aprobado: 3,
        pendiente: 2,
        rechazado: 0,
        vencido: 0,
      });
      expect(result).toBe('amarillo');
    });

    it('should return amarillo with some rechazados below threshold', () => {
      const result = StatusService.calculateEntityStatus({
        total: 10,
        aprobado: 7,
        pendiente: 0,
        rechazado: 3,
        vencido: 0,
      });
      expect(result).toBe('amarillo');
    });
  });

  describe('getEntityStatus', () => {
    it('should return entity status with document counts', async () => {
      mockDocument.groupBy.mockResolvedValue([
        { status: 'APROBADO', _count: { status: 3 } },
        { status: 'PENDIENTE', _count: { status: 1 } },
        { status: 'RECHAZADO', _count: { status: 1 } },
      ]);
      mockDocument.count.mockResolvedValue(0);

      const result = await StatusService.getEntityStatus(100, 50, 'CHOFER' as any, 200);

      expect(result).not.toBeNull();
      expect(result?.entityType).toBe('CHOFER');
      expect(result?.entityId).toBe(200);
      expect(result?.documentCount.total).toBe(5);
      expect(result?.documentCount.aprobado).toBe(3);
    });

    it('should count VALIDANDO as pendiente', async () => {
      mockDocument.groupBy.mockResolvedValue([
        { status: 'VALIDANDO', _count: { status: 2 } },
        { status: 'CLASIFICANDO', _count: { status: 1 } },
      ]);
      mockDocument.count.mockResolvedValue(0);

      const result = await StatusService.getEntityStatus(100, 50, 'CAMION' as any, 300);

      expect(result?.documentCount.pendiente).toBe(3);
    });

    it('should adjust vencido count based on expiration date', async () => {
      mockDocument.groupBy.mockResolvedValue([
        { status: 'APROBADO', _count: { status: 5 } },
      ]);
      mockDocument.count.mockResolvedValue(2); // 2 expired by date

      const result = await StatusService.getEntityStatus(100, 50, 'CHOFER' as any, 200);

      expect(result?.documentCount.vencido).toBe(2);
      expect(result?.status).toBe('rojo'); // Has vencidos
    });

    it('should return null on error', async () => {
      mockDocument.groupBy.mockRejectedValue(new Error('DB error'));

      const result = await StatusService.getEntityStatus(100, 50, 'CHOFER' as any, 200);

      expect(result).toBeNull();
    });
  });
});



