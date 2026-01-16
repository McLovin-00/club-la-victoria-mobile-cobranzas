/**
 * Tests para StatusService - Sistema de Semáforos
 * @jest-environment node
 */

const mockDocument = {
  groupBy: jest.fn(),
  count: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
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

    it('calculates estado rojo con documentos vencidos', () => {
      const result = StatusService.calculateEntityStatus({
        total: 5,
        aprobado: 3,
        pendiente: 0,
        rechazado: 0,
        vencido: 2,
      });
      expect(result).toBe('rojo');
    });

    it('calculates estado rojo cuando rechazados > 50%', () => {
      const result = StatusService.calculateEntityStatus({
        total: 10,
        aprobado: 0,
        pendiente: 0,
        rechazado: 6,
        vencido: 0,
      });
      expect(result).toBe('rojo');
    });

    it('calculates estado amarillo cuando hay documentos pendientes sin vencidos', () => {
      const result = StatusService.calculateEntityStatus({
        total: 10,
        aprobado: 5,
        pendiente: 3,
        rechazado: 0,
        vencido: 0,
      });
      expect(result).toBe('amarillo');
    });

    it('calculates estado rojo cuando no hay documentos', () => {
      const result = StatusService.calculateEntityStatus({
        total: 0,
        aprobado: 0,
        pendiente: 0,
        rechazado: 0,
        vencido: 0,
      });
      expect(result).toBe('rojo');
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
      mockDocument.count.mockResolvedValue(2);

      const result = await StatusService.getEntityStatus(100, 50, 'CHOFER' as any, 200);

      expect(result?.documentCount.vencido).toBe(2);
      expect(result?.status).toBe('rojo');
    });

    it('should return null on error', async () => {
      mockDocument.groupBy.mockRejectedValue(new Error('DB error'));

      const result = await StatusService.getEntityStatus(100, 50, 'CHOFER' as any, 200);

      expect(result).toBeNull();
    });

    it('maneja error y retorna null', async () => {
      mockDocument.groupBy.mockRejectedValue(new Error('DB error'));
      
      const result = await StatusService.getEntityStatus(1, 1, 'CHOFER' as any, 1);
      expect(result).toBeNull();
    });
  });

  describe('getEmpresaStatusSummary', () => {
    it('calcula overall status rojo cuando algún entity tiene estado rojo', async () => {
      mockDocument.findMany.mockResolvedValue([
        { entityType: 'CHOFER', entityId: 100 },
        { entityType: 'CHOFER', entityId: 101 },
      ]);
      
      jest.spyOn(StatusService, 'getEntityStatus')
        .mockResolvedValueOnce({ entityType: 'CHOFER', entityId: 100, status: 'rojo' as any, documentCount: {} as any })
        .mockResolvedValueOnce({ entityType: 'CHOFER', entityId: 101, status: 'verde' as any, documentCount: {} as any });
      
      const result = await StatusService.getEmpresaStatusSummary(1, 1);
      expect(result.overallStatus).toBe('rojo');
    });

    it('calcula overall status amarillo cuando todos son amarillo o verde', async () => {
      mockDocument.findMany.mockResolvedValue([
        { entityType: 'CHOFER', entityId: 100 },
      ]);
      
      jest.spyOn(StatusService, 'getEntityStatus')
        .mockResolvedValueOnce({ entityType: 'CHOFER', entityId: 100, status: 'amarillo' as any, documentCount: {} as any });
      
      const result = await StatusService.getEmpresaStatusSummary(1, 1);
      expect(result.overallStatus).toBe('amarillo');
    });

    it('retorna resumen fallback cuando hay error', async () => {
      mockDocument.findMany.mockRejectedValue(new Error('DB error'));
      
      const result = await StatusService.getEmpresaStatusSummary(1, 1);
      expect(result.empresaId).toBe(1);
      expect(result.overallStatus).toBe('rojo');
    });
  });

  describe('getGlobalStatusSummary', () => {
    it('agrega resúmenes de múltiples empresas', async () => {
      mockDocument.findMany.mockResolvedValue([
        { dadorCargaId: 1 },
        { dadorCargaId: 2 },
      ]);
      
      jest.spyOn(StatusService, 'getEmpresaStatusSummary')
        .mockResolvedValueOnce({ empresaId: 1, overallStatus: 'verde' as any, entities: {} as any })
        .mockResolvedValueOnce({ empresaId: 2, overallStatus: 'rojo' as any, entities: {} as any });
      
      const result = await StatusService.getGlobalStatusSummary(1);
      expect(result).toHaveLength(2);
    });

    it('retorna array vacío en error de getGlobalStatusSummary', async () => {
      mockDocument.findMany.mockRejectedValue(new Error('DB error'));
      
      const result = await StatusService.getGlobalStatusSummary(1);
      expect(result).toEqual([]);
    });
  });

  describe('getEntitiesWithAlarms', () => {
    it('requiere tenant cuando se busca por empresaId específico', async () => {
      const mockEntity = { status: 'rojo' as any, entityType: 'DADOR' as any, entityId: 1, documentCount: { total: 1, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 1 } };
      mockDocument.findFirst.mockResolvedValue({ tenantEmpresaId: 1 });
      
      jest.spyOn(StatusService, 'getEmpresaStatusSummary').mockResolvedValueOnce({
        empresaId: 1,
        overallStatus: 'verde' as any,
        entities: { empresa: mockEntity, empresasTransportistas: [], choferes: [], camiones: [], acoplados: [] } as any
      });
      
      const result = await StatusService.getEntitiesWithAlarms(1);
      
      expect(StatusService.getEmpresaStatusSummary).toHaveBeenCalledWith(1, 1);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('rojo');
    });

    it('agrega dador con estado rojo', async () => {
      const mockEntity = { status: 'rojo' as any, entityType: 'DADOR' as any, entityId: 1, documentCount: { total: 1, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 1 } };
      mockDocument.findFirst.mockResolvedValue({ tenantEmpresaId: 1 });
      
      jest.spyOn(StatusService, 'getEmpresaStatusSummary').mockResolvedValueOnce({
        empresaId: 1,
        overallStatus: 'verde' as any,
        entities: { empresa: mockEntity, empresasTransportistas: [], choferes: [], camiones: [], acoplados: [] } as any
      });
      
      const result = await StatusService.getEntitiesWithAlarms(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('rojo');
    });

    it('agrega choferes con estado rojo', async () => {
      const mockEntity = { status: 'rojo' as any, entityType: 'CHOFER' as any, entityId: 1, documentCount: { total: 1, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 1 } };
      mockDocument.findFirst.mockResolvedValue({ tenantEmpresaId: 1 });
      
      jest.spyOn(StatusService, 'getEmpresaStatusSummary').mockResolvedValueOnce({
        empresaId: 1,
        overallStatus: 'verde' as any,
        entities: { empresa: null, empresasTransportistas: [], choferes: [mockEntity], camiones: [], acoplados: [] } as any
      });
      
      const result = await StatusService.getEntitiesWithAlarms(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('rojo');
    });

    it('agrega solo camiones cuando acoplados no tienen estado rojo', async () => {
      const mockCamion = { status: 'rojo' as any, entityType: 'CAMION' as any, entityId: 1, documentCount: { total: 1, aprobado: 0, pendiente: 0, rechazado: 0, vencido: 1 } };
      const mockAcoplado = { status: 'verde' as any, entityType: 'ACOPLADO' as any, entityId: 2, documentCount: { total: 1, aprobado: 1, pendiente: 0, rechazado: 0, vencido: 0 } };
      mockDocument.findFirst.mockResolvedValue({ tenantEmpresaId: 1 });
      
      jest.spyOn(StatusService, 'getEmpresaStatusSummary').mockResolvedValueOnce({
        empresaId: 1,
        overallStatus: 'verde' as any,
        entities: { empresa: null, empresasTransportistas: [], choferes: [], camiones: [mockCamion], acoplados: [mockAcoplado] } as any
      });
      
      const result = await StatusService.getEntitiesWithAlarms(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('rojo');
    });

    it('retorna array vacío cuando hay error', async () => {
      mockDocument.findFirst.mockRejectedValue(new Error('DB error'));
      
      const result = await StatusService.getEntitiesWithAlarms(1);
      expect(result).toEqual([]);
    });

    it('retorna array vacío cuando hay error en getGlobalStatusSummary', async () => {
      mockDocument.findMany.mockRejectedValue(new Error('DB error'));
      
      const result = await StatusService.getEntitiesWithAlarms(undefined);
      expect(result).toEqual([]);
    });
  });
});
