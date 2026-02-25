/**
 * @jest-environment node
 */

const mockPrisma = {
  equipo: { count: jest.fn(), findMany: jest.fn() },
  document: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
  empresaTransportista: { count: jest.fn(), findUnique: jest.fn() },
  equipoCliente: { count: jest.fn(), findMany: jest.fn() },
  equipoHistory: { count: jest.fn() },
  documentTemplate: { findMany: jest.fn() },
  chofer: { findUnique: jest.fn(), findMany: jest.fn() },
  camion: { findUnique: jest.fn(), findMany: jest.fn() },
  acoplado: { findUnique: jest.fn(), findMany: jest.fn() },
  dadorCarga: { findUnique: jest.fn() },
  $queryRaw: jest.fn(),
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockPrisma },
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/services/status.service', () => ({
  StatusService: {
    getGlobalStatusSummary: jest.fn().mockResolvedValue([]),
    getEntitiesWithAlarms: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../src/services/document.service', () => ({
  DocumentService: {
    getDocumentStats: jest.fn().mockResolvedValue({
      total: 0, pendiente: 0, validando: 0, aprobado: 0, rechazado: 0, vencido: 0,
    }),
  },
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: { getQueueStats: jest.fn().mockResolvedValue({ waiting: 0, active: 0 }) },
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: { getSignedUrl: jest.fn().mockResolvedValue('https://signed-url') },
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({ DOCS_DUE_SOON_DAYS: 30 }),
}));

jest.mock('../src/utils/params', () => ({
  parseParamId: jest.fn((params: Record<string, string>, key: string) => parseInt(params[key])),
}));

jest.mock('../src/types/roles', () => ({
  UserRole: {
    SUPERADMIN: 'SUPERADMIN',
    ADMIN: 'ADMIN',
    ADMIN_INTERNO: 'ADMIN_INTERNO',
    DADOR_DE_CARGA: 'DADOR_DE_CARGA',
    TRANSPORTISTA: 'TRANSPORTISTA',
    CHOFER: 'CHOFER',
    CLIENTE: 'CLIENTE',
  },
}));

import { DashboardController } from '../src/controllers/dashboard.controller';
import { StatusService } from '../src/services/status.service';
import { DocumentService } from '../src/services/document.service';
import { queueService } from '../src/services/queue.service';
import { minioService } from '../src/services/minio.service';

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    user: { userId: 1, role: 'SUPERADMIN', empresaId: 10, email: 'test@test.com' },
    tenantId: 1,
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('DashboardController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getSemaforosView', () => {
    it('should return semaforos for SUPERADMIN without empresaId filter', async () => {
      mockPrisma.document.findMany.mockResolvedValue([{ dadorCargaId: 10 }, { dadorCargaId: 20 }]);
      mockPrisma.document.groupBy.mockResolvedValue([]);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        semaforos: expect.any(Array),
      }));
    });

    it('should return semaforos for SUPERADMIN with empresaId filter', async () => {
      mockPrisma.document.groupBy.mockResolvedValue([]);

      const req = mockReq({ query: { empresaId: '10' } });
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return semaforos for non-SUPERADMIN', async () => {
      mockPrisma.document.groupBy.mockResolvedValue([]);

      const req = mockReq({ user: { userId: 2, role: 'ADMIN', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should compute overallStatus rojo when red docs exist', async () => {
      mockPrisma.document.groupBy
        .mockResolvedValueOnce([{ entityType: 'CHOFER', _count: { status: 5 } }])
        .mockResolvedValueOnce([{ entityType: 'CHOFER', _count: { status: 3 } }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const req = mockReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10 },
      });
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.semaforos[0].overallStatus).toBe('rojo');
    });

    it('should compute overallStatus amarillo when only yellow docs exist', async () => {
      mockPrisma.document.groupBy
        .mockResolvedValueOnce([{ entityType: 'CAMION', _count: { status: 2 } }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ entityType: 'CAMION', _count: { status: 1 } }])
        .mockResolvedValueOnce([]);

      const req = mockReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10 },
      });
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.semaforos[0].overallStatus).toBe('amarillo');
    });

    it('should compute overallStatus verde when no red/yellow', async () => {
      mockPrisma.document.groupBy
        .mockResolvedValueOnce([{ entityType: 'ACOPLADO', _count: { status: 1 } }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ entityType: 'ACOPLADO', _count: { status: 1 } }]);

      const req = mockReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10 },
      });
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.semaforos[0].overallStatus).toBe('verde');
    });

    it('should handle entity types including EMPRESA_TRANSPORTISTA', async () => {
      mockPrisma.document.groupBy
        .mockResolvedValueOnce([
          { entityType: 'EMPRESA_TRANSPORTISTA', _count: { status: 3 } },
          { entityType: 'CHOFER', _count: { status: 2 } },
          { entityType: 'CAMION', _count: { status: 1 } },
          { entityType: 'ACOPLADO', _count: { status: 4 } },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const req = mockReq({ user: { userId: 2, role: 'ADMIN', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.semaforos[0].counts.empresa).toBe(3);
      expect(body.semaforos[0].counts.choferes).toBe(2);
      expect(body.semaforos[0].counts.camiones).toBe(1);
      expect(body.semaforos[0].counts.acoplados).toBe(4);
    });

    it('should return 500 on error', async () => {
      mockPrisma.document.findMany.mockRejectedValue(new Error('DB error'));

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getSemaforosView(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  describe('getPendingSummary', () => {
    it('should return pending summary for SUPERADMIN', async () => {
      mockPrisma.document.count.mockResolvedValue(5);
      mockPrisma.document.groupBy.mockResolvedValue([
        { templateId: 1, _count: { templateId: 3 } },
      ]);
      mockPrisma.documentTemplate.findMany.mockResolvedValue([
        { id: 1, name: 'DNI' },
      ]);
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, uploadedAt: new Date(), fileName: 'test.pdf', dadorCargaId: 10 },
      ]);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getPendingSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ total: 5 }),
      }));
    });

    it('should filter by empresaId for non-SUPERADMIN', async () => {
      mockPrisma.document.count.mockResolvedValue(2);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      const req = mockReq({ user: { userId: 2, role: 'ADMIN', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getPendingSummary(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should handle empty templateIds', async () => {
      mockPrisma.document.count.mockResolvedValue(0);
      mockPrisma.document.groupBy.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getPendingSummary(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.top).toEqual([]);
    });

    it('should fallback template name when not found', async () => {
      mockPrisma.document.count.mockResolvedValue(1);
      mockPrisma.document.groupBy.mockResolvedValue([
        { templateId: 999, _count: { templateId: 1 } },
      ]);
      mockPrisma.documentTemplate.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getPendingSummary(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.top[0].templateName).toBe('Plantilla #999');
    });

    it('should return 500 on error', async () => {
      mockPrisma.document.count.mockRejectedValue(new Error('fail'));

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getPendingSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getGlobalStats', () => {
    it('should return global stats for SUPERADMIN without empresaId', async () => {
      (StatusService.getGlobalStatusSummary as jest.Mock).mockResolvedValue([
        { empresaId: 10 }, { empresaId: 20 },
      ]);
      (DocumentService.getDocumentStats as jest.Mock)
        .mockResolvedValueOnce({ total: 5, pendiente: 1, validando: 1, aprobado: 1, rechazado: 1, vencido: 1 })
        .mockResolvedValueOnce({ total: 3, pendiente: 0, validando: 0, aprobado: 2, rechazado: 0, vencido: 1 });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getGlobalStats(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.documentStats.total).toBe(8);
      expect(body.data.queueStats).toBeDefined();
    });

    it('should return stats for SUPERADMIN with empresaId filter', async () => {
      (DocumentService.getDocumentStats as jest.Mock).mockResolvedValue({
        total: 10, pendiente: 2, validando: 1, aprobado: 5, rechazado: 1, vencido: 1,
      });

      const req = mockReq({ query: { empresaId: '10' } });
      const res = mockRes();

      await DashboardController.getGlobalStats(req, res);

      expect(DocumentService.getDocumentStats).toHaveBeenCalledWith(1, 10);
    });

    it('should return stats for non-SUPERADMIN', async () => {
      (DocumentService.getDocumentStats as jest.Mock).mockResolvedValue({
        total: 5, pendiente: 1, validando: 0, aprobado: 3, rechazado: 0, vencido: 1,
      });

      const req = mockReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getGlobalStats(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.queueStats).toBeNull();
    });

    it('should return 500 on error', async () => {
      (DocumentService.getDocumentStats as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq({ user: { userId: 2, role: 'ADMIN', empresaId: 10 }, query: {} });
      const res = mockRes();

      await DashboardController.getGlobalStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getEquipoKpis', () => {
    it('should return kpis with default since', async () => {
      mockPrisma.equipoHistory.count.mockResolvedValue(5);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getEquipoKpis(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('created');
      expect(body.data).toHaveProperty('swaps');
      expect(body.data).toHaveProperty('deleted');
    });

    it('should accept custom since query param', async () => {
      mockPrisma.equipoHistory.count.mockResolvedValue(2);

      const req = mockReq({ query: { since: '2025-01-01' } });
      const res = mockRes();

      await DashboardController.getEquipoKpis(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getAlertsView', () => {
    it('should return alerts for SUPERADMIN without empresaId', async () => {
      (StatusService.getEntitiesWithAlarms as jest.Mock).mockResolvedValue([
        { entityType: 'CHOFER' },
        { entityType: 'CAMION' },
        { entityType: 'DADOR' },
        { entityType: 'ACOPLADO' },
      ]);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getAlertsView(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.alerts.choferes).toHaveLength(1);
      expect(body.data.alerts.camiones).toHaveLength(1);
    });

    it('should return alerts for SUPERADMIN with empresaId', async () => {
      (StatusService.getEntitiesWithAlarms as jest.Mock).mockResolvedValue([]);

      const req = mockReq({ query: { empresaId: '10' } });
      const res = mockRes();

      await DashboardController.getAlertsView(req, res);

      expect(StatusService.getEntitiesWithAlarms).toHaveBeenCalledWith(10);
    });

    it('should return alerts for non-SUPERADMIN', async () => {
      (StatusService.getEntitiesWithAlarms as jest.Mock).mockResolvedValue([]);

      const req = mockReq({ user: { userId: 2, role: 'ADMIN', empresaId: 10 }, query: {} });
      const res = mockRes();

      await DashboardController.getAlertsView(req, res);

      expect(StatusService.getEntitiesWithAlarms).toHaveBeenCalledWith(10);
    });

    it('should return 500 on error', async () => {
      (StatusService.getEntitiesWithAlarms as jest.Mock).mockRejectedValue(new Error('fail'));

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getAlertsView(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFrontendConfig', () => {
    it('should return config for SUPERADMIN', async () => {
      const req = mockReq();
      const res = mockRes();

      await DashboardController.getFrontendConfig(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.features.canManageTemplates).toBe(true);
      expect(body.data.features.canViewAllCompanies).toBe(true);
      expect(body.data.features.canViewQueueStats).toBe(true);
    });

    it('should return config for ADMIN role', async () => {
      const req = mockReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10, email: 'admin@test.com' },
      });
      const res = mockRes();

      await DashboardController.getFrontendConfig(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.features.canManageTemplates).toBe(false);
      expect(body.data.features.canUploadDocuments).toBe(true);
      expect(body.data.features.canDeleteDocuments).toBe(true);
    });

    it('should return config for OPERATOR role', async () => {
      const req = mockReq({
        user: { userId: 3, role: 'OPERATOR', empresaId: 10, email: 'op@test.com' },
      });
      const res = mockRes();

      await DashboardController.getFrontendConfig(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.features.canUploadDocuments).toBe(true);
      expect(body.data.features.canDeleteDocuments).toBe(false);
    });

    it('should return config for role without upload/delete permissions', async () => {
      const req = mockReq({
        user: { userId: 4, role: 'CHOFER', empresaId: 10, email: 'ch@test.com' },
      });
      const res = mockRes();

      await DashboardController.getFrontendConfig(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.features.canUploadDocuments).toBe(false);
      expect(body.data.features.canDeleteDocuments).toBe(false);
      expect(body.data.features.canManageTemplates).toBe(false);
      expect(body.data.features.canViewAllCompanies).toBe(false);
    });

    it('should return 500 on error', async () => {
      const req = { user: null } as any;
      const res = mockRes();

      await DashboardController.getFrontendConfig(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getApprovalKpis', () => {
    it('should return approval KPIs', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{
        pending: BigInt(5),
        approvedToday: BigInt(3),
        rejectedToday: BigInt(1),
        avgReviewMinutes: 15,
      }]);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getApprovalKpis(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.pending).toBe(5);
      expect(body.data.approvedToday).toBe(3);
      expect(body.data.rejectedToday).toBe(1);
      expect(body.data.avgReviewMinutes).toBe(15);
    });

    it('should handle null kpis result', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([undefined]);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getApprovalKpis(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.pending).toBe(0);
      expect(body.data.avgReviewMinutes).toBe(0);
    });

    it('should handle null avgReviewMinutes', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{
        pending: BigInt(0),
        approvedToday: BigInt(0),
        rejectedToday: BigInt(0),
        avgReviewMinutes: null,
      }]);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getApprovalKpis(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.avgReviewMinutes).toBe(0);
    });

    it('should return 500 on error', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('fail'));

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getApprovalKpis(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getStatsPorRol', () => {
    it('should return stats for SUPERADMIN', async () => {
      mockPrisma.equipo.count.mockResolvedValue(10);
      mockPrisma.document.count.mockResolvedValue(5);

      const req = mockReq({ user: { userId: 1, role: 'SUPERADMIN', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ role: 'SUPERADMIN' }),
      }));
    });

    it('should return stats for ADMIN_INTERNO', async () => {
      mockPrisma.equipo.count.mockResolvedValue(8);
      mockPrisma.document.count.mockResolvedValue(3);

      const req = mockReq({ user: { userId: 2, role: 'ADMIN_INTERNO', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.role).toBe('ADMIN_INTERNO');
      expect(body.data).toHaveProperty('totalEquipos');
    });

    it('should return stats for DADOR_DE_CARGA', async () => {
      mockPrisma.equipo.count.mockResolvedValue(4);
      mockPrisma.document.count.mockResolvedValue(2);
      mockPrisma.empresaTransportista.count.mockResolvedValue(3);

      const req = mockReq({ user: { userId: 3, role: 'DADOR_DE_CARGA', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.role).toBe('DADOR_DE_CARGA');
      expect(body.data).toHaveProperty('misEquipos');
    });

    it('should return stats for TRANSPORTISTA', async () => {
      mockPrisma.equipo.count.mockResolvedValue(2);
      mockPrisma.document.count.mockResolvedValue(1);

      const req = mockReq({ user: { userId: 4, role: 'TRANSPORTISTA', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.role).toBe('TRANSPORTISTA');
      expect(body.data).toHaveProperty('documentosRechazados');
    });

    it('should return stats for EMPRESA_TRANSPORTISTA', async () => {
      mockPrisma.equipo.count.mockResolvedValue(2);
      mockPrisma.document.count.mockResolvedValue(1);

      const req = mockReq({ user: { userId: 5, role: 'EMPRESA_TRANSPORTISTA', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data).toHaveProperty('misEquipos');
    });

    it('should return stats for CLIENTE with empresaId', async () => {
      mockPrisma.equipoCliente.count.mockResolvedValue(3);
      mockPrisma.equipoCliente.findMany.mockResolvedValue([
        { equipo: { estado: 'VIGENTE' } },
        { equipo: { estado: 'OK' } },
        { equipo: { estado: 'PROXIMO_VENCER' } },
        { equipo: { estado: 'WARNING' } },
        { equipo: { estado: 'VENCIDO' } },
        { equipo: { estado: 'EXPIRED' } },
        { equipo: { estado: 'OTRO' } },
        { equipo: { estado: null } },
        { equipo: null },
      ]);

      const req = mockReq({ user: { userId: 6, role: 'CLIENTE', empresaId: 20 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.role).toBe('CLIENTE');
      expect(body.data.vigentes).toBe(2);
      expect(body.data.proximosVencer).toBe(2);
      expect(body.data.vencidos).toBe(2);
    });

    it('should return stats for CLIENTE without empresaId', async () => {
      const req = mockReq({ user: { userId: 6, role: 'CLIENTE', empresaId: undefined } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.equiposAsignados).toBe(0);
    });

    it('should return empty roleStats for unknown role', async () => {
      const req = mockReq({ user: { userId: 7, role: 'UNKNOWN', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.role).toBe('UNKNOWN');
    });

    it('should return 500 on error', async () => {
      mockPrisma.equipo.count.mockRejectedValue(new Error('fail'));

      const req = mockReq({ user: { userId: 1, role: 'SUPERADMIN', empresaId: 10 } });
      const res = mockRes();

      await DashboardController.getStatsPorRol(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getRejectedDocuments', () => {
    const baseDoc = {
      id: 1,
      entityType: 'CHOFER',
      entityId: 100,
      status: 'RECHAZADO',
      filePath: 'bucket/path/to/file.pdf',
      fileName: 'file.pdf',
      rejectionReason: 'Blurry',
      reviewNotes: null,
      rejectedAt: new Date(),
      rejectedBy: 'admin',
      uploadedAt: new Date(),
      updatedAt: new Date(),
      template: { id: 1, name: 'DNI', entityType: 'CHOFER' },
    };

    it('should return rejected docs for SUPERADMIN', async () => {
      mockPrisma.document.findMany.mockResolvedValue([baseDoc]);
      mockPrisma.document.count.mockResolvedValue(1);
      mockPrisma.chofer.findUnique.mockResolvedValue({ nombre: 'Juan', apellido: 'Perez', dni: '12345678' });

      const req = mockReq({ query: { page: '1', limit: '10' } });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data[0].previewUrl).toBe('https://signed-url');
      expect(body.pagination.total).toBe(1);
    });

    it('should handle doc without filePath', async () => {
      mockPrisma.document.findMany.mockResolvedValue([{ ...baseDoc, filePath: null }]);
      mockPrisma.document.count.mockResolvedValue(1);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].previewUrl).toBeNull();
    });

    it('should handle filePath with only bucket no path parts', async () => {
      mockPrisma.document.findMany.mockResolvedValue([{ ...baseDoc, filePath: 'bucketonly' }]);
      mockPrisma.document.count.mockResolvedValue(1);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].previewUrl).toBeNull();
    });

    it('should handle signed URL generation failure', async () => {
      mockPrisma.document.findMany.mockResolvedValue([baseDoc]);
      mockPrisma.document.count.mockResolvedValue(1);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      (minioService.getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error('minio error'));

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].previewUrl).toBeNull();
    });

    it('should use entityType filter from query', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({ query: { entityType: 'CAMION' } });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should paginate correctly', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(50);

      const req = mockReq({ query: { page: '3', limit: '10' } });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.pagination.page).toBe(3);
      expect(body.pagination.pages).toBe(5);
    });

    it('should return 500 on error', async () => {
      mockPrisma.document.findMany.mockRejectedValue(new Error('fail'));

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getRejectedStats', () => {
    it('should return rejection stats', async () => {
      mockPrisma.document.groupBy
        .mockResolvedValueOnce([{ entityType: 'CHOFER', _count: { entityType: 3 } }])
        .mockResolvedValueOnce([{ templateId: 1, _count: { templateId: 2 } }]);
      mockPrisma.documentTemplate.findMany.mockResolvedValue([{ id: 1, name: 'DNI' }]);
      mockPrisma.document.findMany.mockResolvedValue([
        { rejectionReason: 'Blurry' },
        { rejectionReason: 'Blurry' },
        { rejectionReason: 'Expired doc' },
        { rejectionReason: null },
      ]);
      mockPrisma.document.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(10);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getRejectedStats(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.totalRejected).toBe(10);
      expect(body.data.rejectedToday).toBe(2);
      expect(body.data.rejectedLast7Days).toBe(5);
      expect(body.data.rejectedByEntityType).toHaveLength(1);
      expect(body.data.byTemplate[0].templateName).toBe('DNI');
      expect(body.data.rejectedByReason.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty templateIds in stats', async () => {
      mockPrisma.document.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getRejectedStats(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.totalRejected).toBe(0);
    });

    it('should fallback template name', async () => {
      mockPrisma.document.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ templateId: 999, _count: { templateId: 1 } }]);
      mockPrisma.documentTemplate.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getRejectedStats(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.byTemplate[0].templateName).toBe('Template #999');
    });

    it('should return 500 on error', async () => {
      mockPrisma.document.groupBy.mockRejectedValue(new Error('fail'));

      const req = mockReq();
      const res = mockRes();

      await DashboardController.getRejectedStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('buildRejectedDocsFilter (via getRejectedDocuments)', () => {
    it('should filter for ADMIN role', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter for ADMIN_INTERNO role', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 2, role: 'ADMIN_INTERNO', empresaId: 10 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter for DADOR_DE_CARGA role', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 3, role: 'DADOR_DE_CARGA', empresaId: 15 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter for TRANSPORTISTA with entities', async () => {
      mockPrisma.chofer.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.camion.findMany.mockResolvedValue([{ id: 2 }]);
      mockPrisma.acoplado.findMany.mockResolvedValue([{ id: 3 }]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 4, role: 'TRANSPORTISTA', empresaId: 10, empresaTransportistaId: 5 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter for TRANSPORTISTA with no entities (empty result)', async () => {
      mockPrisma.chofer.findMany.mockResolvedValue([]);
      mockPrisma.camion.findMany.mockResolvedValue([]);
      mockPrisma.acoplado.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 4, role: 'TRANSPORTISTA', empresaId: 10, empresaTransportistaId: 5 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter for CHOFER role', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 5, role: 'CHOFER', empresaId: 10, choferId: 99 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter for default role with empresaId', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 6, role: 'OTHER_ROLE', empresaId: 10 },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should filter for default role without empresaId', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({
        user: { userId: 7, role: 'OTHER_ROLE', empresaId: undefined },
        query: {},
      });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getEntityNaturalId (via getRejectedDocuments)', () => {
    function setupRejectedDoc(entityType: string, entityId: number) {
      mockPrisma.document.findMany.mockResolvedValue([{
        id: 1, entityType, entityId, status: 'RECHAZADO', filePath: null,
        fileName: 'f.pdf', rejectionReason: null, reviewNotes: null,
        rejectedAt: new Date(), rejectedBy: null, uploadedAt: new Date(),
        updatedAt: new Date(), template: { id: 1, name: 'T', entityType },
      }]);
      mockPrisma.document.count.mockResolvedValue(1);
    }

    it('should resolve EMPRESA_TRANSPORTISTA entity', async () => {
      setupRejectedDoc('EMPRESA_TRANSPORTISTA', 1);
      mockPrisma.empresaTransportista.findUnique.mockResolvedValue({ razonSocial: 'Trans SA', cuit: '20-12345678-1' });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toContain('Trans SA');
    });

    it('should resolve CHOFER entity', async () => {
      setupRejectedDoc('CHOFER', 2);
      mockPrisma.chofer.findUnique.mockResolvedValue({ nombre: 'Juan', apellido: 'Gomez', dni: '33333333' });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toContain('Juan Gomez');
    });

    it('should resolve CAMION entity', async () => {
      setupRejectedDoc('CAMION', 3);
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ABC123' });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toContain('ABC123');
    });

    it('should resolve ACOPLADO entity', async () => {
      setupRejectedDoc('ACOPLADO', 4);
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'XYZ789' });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toContain('XYZ789');
    });

    it('should resolve DADOR entity', async () => {
      setupRejectedDoc('DADOR', 5);
      mockPrisma.dadorCarga.findUnique.mockResolvedValue({ razonSocial: 'Dador SRL', cuit: '30-99999999-0' });

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toContain('Dador SRL');
    });

    it('should return null for unknown entity type', async () => {
      setupRejectedDoc('UNKNOWN_TYPE', 99);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toBeNull();
    });

    it('should return null when entity not found', async () => {
      setupRejectedDoc('CHOFER', 999);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toBeNull();
    });

    it('should return null on entity lookup error', async () => {
      setupRejectedDoc('EMPRESA_TRANSPORTISTA', 1);
      mockPrisma.empresaTransportista.findUnique.mockRejectedValue(new Error('db error'));

      const req = mockReq({ query: {} });
      const res = mockRes();

      await DashboardController.getRejectedDocuments(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data[0].entityNaturalId).toBeNull();
    });
  });
});
