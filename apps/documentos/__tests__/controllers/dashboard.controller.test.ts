/**
 * Tests unitarios para DashboardController
 */
import { Request, Response } from 'express';
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mock database before importing
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

jest.mock('../../src/services/status.service', () => ({
  StatusService: {
    getGlobalStatusSummary: jest.fn(),
    getEntitiesWithAlarms: jest.fn(),
  },
}));

jest.mock('../../src/services/document.service', () => ({
  DocumentService: {
    getDocumentStats: jest.fn(),
  },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    getQueueStats: jest.fn(),
  },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    DOCS_DUE_SOON_DAYS: 30,
  }),
}));

import { DashboardController } from '../../src/controllers/dashboard.controller';
import { AuthRequest } from '../../src/types/auth.types';
import { StatusService } from '../../src/services/status.service';
import { DocumentService } from '../../src/services/document.service';
import { queueService } from '../../src/services/queue.service';

describe('DashboardController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe('getStatsPorRol', () => {
    it('should return stats for SUPERADMIN role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
      };

      // Mock counts for admin stats
      prismaMock.equipo.count.mockResolvedValue(10);
      prismaMock.document.count
        .mockResolvedValueOnce(50) // totalDocumentos
        .mockResolvedValueOnce(2)  // pendientesAprobacion
        .mockResolvedValueOnce(1)  // vencidosHoy
        .mockResolvedValueOnce(3); // rechazados
      prismaMock.user.count.mockResolvedValue(5);

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'SUPERADMIN',
          }),
        })
      );
    });

    it('should return stats for DADOR_DE_CARGA role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'DADOR_DE_CARGA',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
      };

      prismaMock.equipo.count.mockResolvedValue(5);
      prismaMock.document.count
        .mockResolvedValueOnce(2) // pendientesAprobacion
        .mockResolvedValueOnce(4); // proximosVencer
      prismaMock.empresaTransportista.count.mockResolvedValue(7);

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'DADOR_DE_CARGA',
          }),
        })
      );
    });

    it('should return stats for TRANSPORTISTA role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'TRANSPORTISTA',
          empresaId: 1,
          tenantEmpresaId: 1,
          empresaTransportistaId: 1,
        },
      };

      prismaMock.equipo.count.mockResolvedValue(3);
      prismaMock.document.count
        .mockResolvedValueOnce(1) // documentosRechazados
        .mockResolvedValueOnce(2); // proximosVencer

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'TRANSPORTISTA',
          }),
        })
      );
    });

    it('should return stats for CLIENTE role', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'CLIENTE',
          empresaId: 5,
          tenantEmpresaId: 1,
        },
      };

      prismaMock.equipoCliente.count.mockResolvedValue(8);
      prismaMock.equipoCliente.findMany.mockResolvedValue([
        { equipo: { estado: 'VIGENTE' } },
        { equipo: { estado: 'PROXIMO_VENCER' } },
        { equipo: { estado: 'VENCIDO' } },
      ]);

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            role: 'CLIENTE',
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockReq = {
        tenantId: 1,
        user: {
          userId: 1,
          role: 'SUPERADMIN',
          empresaId: 1,
          tenantEmpresaId: 1,
        },
      };

      prismaMock.equipo.count.mockRejectedValue(new Error('Database error'));

      await DashboardController.getStatsPorRol(mockReq as AuthRequest, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getSemaforosView', () => {
    it('should return semaforos for non-superadmin (single empresaId from user)', async () => {
      mockReq = {
        tenantId: 1,
        query: {},
        user: { userId: 1, role: 'ADMIN', empresaId: 99, tenantEmpresaId: 1 } as any,
      };

      // 4 groupBy calls for the single empresaId
      prismaMock.document.groupBy
        .mockResolvedValueOnce([{ entityType: 'CHOFER', _count: { status: 2 } }]) // totalByType
        .mockResolvedValueOnce([{ entityType: 'CHOFER', _count: { status: 1 } }]) // redByType
        .mockResolvedValueOnce([]) // yellowByType
        .mockResolvedValueOnce([{ entityType: 'CHOFER', _count: { status: 1 } }]); // greenByType

      await DashboardController.getSemaforosView(mockReq as any, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          semaforos: [
            expect.objectContaining({
              empresaId: 99,
              overallStatus: 'rojo',
            }),
          ],
        })
      );
    });

    it('should handle errors returning 500', async () => {
      mockReq = { tenantId: 1, query: {}, user: { userId: 1, role: 'ADMIN', empresaId: 1 } as any };
      prismaMock.document.groupBy.mockRejectedValue(new Error('boom'));

      await DashboardController.getSemaforosView(mockReq as any, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getPendingSummary', () => {
    it('should return empty template top list when groupBy returns none', async () => {
      mockReq = { tenantId: 1, user: { userId: 1, role: 'ADMIN', empresaId: 5 } as any } as any;
      prismaMock.document.count.mockResolvedValue(7);
      prismaMock.document.groupBy.mockResolvedValue([]);
      prismaMock.document.findMany.mockResolvedValue([{ id: 1 }]);

      await DashboardController.getPendingSummary(mockReq as any, mockRes as Response);

      expect(prismaMock.documentTemplate.findMany).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ total: 7, top: [] }),
        })
      );
    });

    it('should handle errors returning 500', async () => {
      mockReq = { tenantId: 1, user: { userId: 1, role: 'ADMIN', empresaId: 5 } as any } as any;
      prismaMock.document.count.mockRejectedValue(new Error('boom'));
      await DashboardController.getPendingSummary(mockReq as any, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('getGlobalStats', () => {
    it('SUPERADMIN with empresaId should call getDocumentStats with that empresa', async () => {
      mockReq = { tenantId: 1, query: { empresaId: '12' }, user: { userId: 1, role: 'SUPERADMIN', empresaId: 1 } as any } as any;
      (DocumentService as any).getDocumentStats.mockResolvedValue({ total: 1, pendiente: 1, validando: 0, aprobado: 0, rechazado: 0, vencido: 0 });
      (queueService as any).getQueueStats.mockResolvedValue({ waiting: 0 });

      await DashboardController.getGlobalStats(mockReq as any, mockRes as Response);

      expect((DocumentService as any).getDocumentStats).toHaveBeenCalledWith(1, 12);
      expect((queueService as any).getQueueStats).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('SUPERADMIN without empresaId should aggregate across global summary', async () => {
      mockReq = { tenantId: 1, query: {}, user: { userId: 1, role: 'SUPERADMIN', empresaId: 1 } as any } as any;
      (StatusService as any).getGlobalStatusSummary.mockResolvedValue([{ empresaId: 2 }, { empresaId: 3 }]);
      (DocumentService as any).getDocumentStats
        .mockResolvedValueOnce({ total: 2, pendiente: 1, validando: 0, aprobado: 1, rechazado: 0, vencido: 0 })
        .mockResolvedValueOnce({ total: 3, pendiente: 0, validando: 1, aprobado: 2, rechazado: 0, vencido: 0 });
      (queueService as any).getQueueStats.mockResolvedValue({ waiting: 0 });

      await DashboardController.getGlobalStats(mockReq as any, mockRes as Response);

      expect((DocumentService as any).getDocumentStats).toHaveBeenCalledTimes(2);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            documentStats: expect.objectContaining({ total: 5, pendiente: 1, validando: 1, aprobado: 3 }),
            queueStats: { waiting: 0 },
          }),
        })
      );
    });

    it('non-superadmin should use user empresaId and no queueStats', async () => {
      mockReq = { tenantId: 1, query: {}, user: { userId: 1, role: 'ADMIN', empresaId: 7 } as any } as any;
      (DocumentService as any).getDocumentStats.mockResolvedValue({ total: 1, pendiente: 0, validando: 0, aprobado: 1, rechazado: 0, vencido: 0 });

      await DashboardController.getGlobalStats(mockReq as any, mockRes as Response);

      expect((DocumentService as any).getDocumentStats).toHaveBeenCalledWith(1, 7);
      expect((queueService as any).getQueueStats).not.toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getEquipoKpis', () => {
    it('should return counts from equipoHistory', async () => {
      mockReq = { query: { since: '2024-01-01T00:00:00Z' }, tenantId: 1 } as any;
      prismaMock.equipoHistory.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);

      await DashboardController.getEquipoKpis(mockReq as any, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ created: 2, swaps: 3, deleted: 4 }) }));
    });
  });

  describe('getAlertsView', () => {
    it('should group alerts by entityType and return success', async () => {
      mockReq = { tenantId: 1, query: {}, user: { userId: 1, role: 'ADMIN', empresaId: 5 } as any } as any;
      (StatusService as any).getEntitiesWithAlarms.mockResolvedValue([
        { entityType: 'CHOFER' },
        { entityType: 'CAMION' },
        { entityType: 'ACOPLADO' },
        { entityType: 'DADOR' },
      ]);

      await DashboardController.getAlertsView(mockReq as any, mockRes as Response);

      expect((StatusService as any).getEntitiesWithAlarms).toHaveBeenCalledWith(5);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getFrontendConfig', () => {
    it('should return frontend config and feature flags', async () => {
      mockReq = { tenantId: 1, user: { userId: 1, email: 'a@b.com', role: 'SUPERADMIN', empresaId: 1 } as any } as any;
      await DashboardController.getFrontendConfig(mockReq as any, mockRes as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Object) }));
    });
  });

  describe('getApprovalKpis', () => {
    it('should return pending/approvedToday counts', async () => {
      mockReq = { tenantId: 1 } as any;
      prismaMock.document.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      await DashboardController.getApprovalKpis(mockReq as any, mockRes as Response);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ pending: 5, approvedToday: 2 }) }));
    });
  });
});


