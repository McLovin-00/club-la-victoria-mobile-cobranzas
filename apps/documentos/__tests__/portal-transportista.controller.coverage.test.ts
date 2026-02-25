/**
 * Coverage tests for portal-transportista.controller.ts
 * Covers: helpers (buildEquipoFilter, transformEquipoResponse, getEntityNameForPortal, getDadorCargaIdForUser),
 *         buildEmpresasFilter, getMisEntidades, getMisEquipos, getDocumentosRechazados, getDocumentosPendientes.
 * @jest-environment node
 */

const mockPrisma = {
  empresaTransportista: { findMany: jest.fn(), findUnique: jest.fn() },
  chofer: { findMany: jest.fn(), findUnique: jest.fn() },
  camion: { findMany: jest.fn(), findUnique: jest.fn() },
  acoplado: { findMany: jest.fn(), findUnique: jest.fn() },
  dadorCarga: { findUnique: jest.fn() },
  equipo: { findMany: jest.fn() },
  document: { findMany: jest.fn(), count: jest.fn() },
};

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { PortalTransportistaController } from '../src/controllers/portal-transportista.controller';

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    tenantId: 1,
    user: { userId: 1, role: 'ADMIN', empresaTransportistaId: undefined, dadorCargaId: undefined },
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

describe('PortalTransportistaController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ====================================================================
  // getMisEntidades
  // ====================================================================
  describe('getMisEntidades', () => {
    it('should return empty for TRANSPORTISTA without empresaTransportistaId', async () => {
      const req = mockReq({ user: { userId: 1, role: 'TRANSPORTISTA' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.empresas).toEqual([]);
    });

    it('should return empty for EMPRESA_TRANSPORTISTA without empresaTransportistaId', async () => {
      const req = mockReq({ user: { userId: 1, role: 'EMPRESA_TRANSPORTISTA' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.empresas).toEqual([]);
    });

    it('should return empty for CHOFER without empresaTransportistaId', async () => {
      const req = mockReq({ user: { userId: 1, role: 'CHOFER' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.empresas).toEqual([]);
    });

    it('should return empty when no empresas found', async () => {
      mockPrisma.empresaTransportista.findMany.mockResolvedValue([]);
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.empresas).toEqual([]);
    });

    it('should return full data for ADMIN', async () => {
      mockPrisma.empresaTransportista.findMany.mockResolvedValue([
        { id: 1, razonSocial: 'Trans SA', cuit: '20-111-1', dadorCargaId: 10 },
      ]);
      mockPrisma.chofer.findMany.mockResolvedValue([{ id: 1, dni: '123' }]);
      mockPrisma.camion.findMany.mockResolvedValue([{ id: 1, patente: 'ABC' }]);
      mockPrisma.acoplado.findMany.mockResolvedValue([{ id: 1, patente: 'XYZ' }]);
      mockPrisma.document.count
        .mockResolvedValueOnce(5)   // pendientes
        .mockResolvedValueOnce(3)   // rechazados
        .mockResolvedValueOnce(1);  // porVencer

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.empresas).toHaveLength(1);
      expect(body.data.contadores.pendientes).toBe(5);
    });

    it('should filter by empresaTransportistaId for TRANSPORTISTA', async () => {
      mockPrisma.empresaTransportista.findMany.mockResolvedValue([
        { id: 5, razonSocial: 'Mi Empresa', cuit: '20-222-2', dadorCargaId: 10 },
      ]);
      mockPrisma.chofer.findMany.mockResolvedValue([]);
      mockPrisma.camion.findMany.mockResolvedValue([]);
      mockPrisma.acoplado.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({ user: { userId: 1, role: 'TRANSPORTISTA', empresaTransportistaId: 5 } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
    });

    it('should filter by dadorCargaId for DADOR_DE_CARGA', async () => {
      mockPrisma.empresaTransportista.findMany.mockResolvedValue([
        { id: 1, razonSocial: 'E', cuit: '20-333-3', dadorCargaId: 20 },
      ]);
      mockPrisma.chofer.findMany.mockResolvedValue([]);
      mockPrisma.camion.findMany.mockResolvedValue([]);
      mockPrisma.acoplado.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({ user: { userId: 1, role: 'DADOR_DE_CARGA', dadorCargaId: 20 } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should handle DADOR_DE_CARGA without dadorCargaId', async () => {
      mockPrisma.empresaTransportista.findMany.mockResolvedValue([
        { id: 1, razonSocial: 'E', cuit: '20-333-3', dadorCargaId: 20 },
      ]);
      mockPrisma.chofer.findMany.mockResolvedValue([]);
      mockPrisma.camion.findMany.mockResolvedValue([]);
      mockPrisma.acoplado.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const req = mockReq({ user: { userId: 1, role: 'DADOR_DE_CARGA' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should return 500 on unexpected error', async () => {
      mockPrisma.empresaTransportista.findMany.mockRejectedValue(new Error('DB error'));
      const req = mockReq({ user: { userId: 1, role: 'SUPERADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEntidades(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // getMisEquipos
  // ====================================================================
  describe('getMisEquipos', () => {
    it('should return empty for role without empresaTransportistaId', async () => {
      const req = mockReq({ user: { userId: 1, role: 'TRANSPORTISTA' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEquipos(req, res);

      expect(body(res).data).toEqual([]);
    });

    it('should return equipos with enriched data', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([
        {
          id: 1,
          driverId: 10,
          truckId: 20,
          trailerId: 30,
          empresaTransportista: { id: 5, razonSocial: 'Trans' },
          dador: { id: 1, razonSocial: 'Dador' },
          clientes: [{ cliente: { id: 1, razonSocial: 'Cliente SA' } }],
          estado: 'VIGENTE',
        },
      ]);
      mockPrisma.chofer.findUnique.mockResolvedValue({ nombre: 'Juan', apellido: 'Perez', dni: '123' });
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ABC', marca: 'Scania', modelo: 'R500' });
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'XYZ' });

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEquipos(req, res);

      const data = body(res).data;
      expect(data).toHaveLength(1);
      expect(data[0].chofer.nombre).toBe('Juan');
      expect(data[0].camion.patente).toBe('ABC');
      expect(data[0].acoplado.patente).toBe('XYZ');
    });

    it('should handle equipo without trailerId', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([
        {
          id: 2,
          driverId: 10,
          truckId: 20,
          trailerId: null,
          empresaTransportista: null,
          dador: null,
          clientes: [],
          estado: 'VIGENTE',
        },
      ]);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);
      mockPrisma.camion.findUnique.mockResolvedValue(null);

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEquipos(req, res);

      const data = body(res).data;
      expect(data[0].chofer).toBeNull();
      expect(data[0].acoplado).toBeNull();
    });

    it('should filter by dadorCargaId for DADOR_DE_CARGA role', async () => {
      mockPrisma.equipo.findMany.mockResolvedValue([]);
      const req = mockReq({ user: { userId: 1, role: 'DADOR_DE_CARGA', dadorCargaId: 10 } });
      const res = mockRes();

      await PortalTransportistaController.getMisEquipos(req, res);

      expect(body(res).data).toEqual([]);
    });

    it('should return 500 on error', async () => {
      mockPrisma.equipo.findMany.mockRejectedValue(new Error('fail'));
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getMisEquipos(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // getDocumentosRechazados
  // ====================================================================
  describe('getDocumentosRechazados', () => {
    it('should return empty for TRANSPORTISTA without dadorCargaId', async () => {
      mockPrisma.empresaTransportista.findUnique.mockResolvedValue(null);
      const req = mockReq({ user: { userId: 1, role: 'TRANSPORTISTA', empresaTransportistaId: 5 } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).data).toEqual([]);
    });

    it('should use user dadorCargaId for TRANSPORTISTA', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'TRANSPORTISTA', dadorCargaId: 10, empresaTransportistaId: 5 },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should fetch dadorCargaId from empresa for EMPRESA_TRANSPORTISTA', async () => {
      mockPrisma.empresaTransportista.findUnique.mockResolvedValue({ dadorCargaId: 20 });
      mockPrisma.document.findMany.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'EMPRESA_TRANSPORTISTA', empresaTransportistaId: 5 },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should filter for DADOR_DE_CARGA with dadorCargaId', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      const req = mockReq({ user: { userId: 1, role: 'DADOR_DE_CARGA', dadorCargaId: 10 } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should enrich rejected docs with entity names', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 1,
          templateId: 1,
          template: { name: 'DNI' },
          entityType: 'CHOFER',
          entityId: 10,
          reviewedAt: new Date(),
          rejectionReason: 'Ilegible',
          reviewNotes: 'Nota',
        },
      ]);
      mockPrisma.chofer.findUnique.mockResolvedValue({ nombre: 'Juan', apellido: 'Perez', dni: '12345678' });

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      const data = body(res).data;
      expect(data[0].entityName).toContain('Juan');
      expect(data[0].motivoRechazo).toBe('Ilegible');
    });

    it('should handle doc without rejectionReason', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 2,
          templateId: 1,
          template: { name: 'DNI' },
          entityType: 'CAMION',
          entityId: 20,
          reviewedAt: null,
          rejectionReason: null,
          reviewNotes: null,
        },
      ]);
      mockPrisma.camion.findUnique.mockResolvedValue({ patente: 'ABC123' });

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      const data = body(res).data;
      expect(data[0].motivoRechazo).toBe('Sin motivo especificado');
      expect(data[0].entityName).toBe('ABC123');
    });

    it('should resolve ACOPLADO entity name', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 3, templateId: 1, template: { name: 'RTO' }, entityType: 'ACOPLADO', entityId: 30, reviewedAt: null, rejectionReason: null, reviewNotes: null },
      ]);
      mockPrisma.acoplado.findUnique.mockResolvedValue({ patente: 'XYZ789' });

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).data[0].entityName).toBe('XYZ789');
    });

    it('should resolve EMPRESA_TRANSPORTISTA entity name', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 4, templateId: 1, template: { name: 'ART' }, entityType: 'EMPRESA_TRANSPORTISTA', entityId: 40, reviewedAt: null, rejectionReason: null, reviewNotes: null },
      ]);
      mockPrisma.empresaTransportista.findUnique.mockResolvedValue({ razonSocial: 'Trans SA' });

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).data[0].entityName).toBe('Trans SA');
    });

    it('should fallback entity name for unknown type', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 5, templateId: 1, template: { name: 'DOC' }, entityType: 'UNKNOWN', entityId: 99, reviewedAt: null, rejectionReason: null, reviewNotes: null },
      ]);

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).data[0].entityName).toBe('UNKNOWN 99');
    });

    it('should fallback entity name when entity not found', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 6, templateId: 1, template: { name: 'DNI' }, entityType: 'CHOFER', entityId: 999, reviewedAt: null, rejectionReason: null, reviewNotes: null },
      ]);
      mockPrisma.chofer.findUnique.mockResolvedValue(null);

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(body(res).data[0].entityName).toBe('Chofer 999');
    });

    it('should return 500 on error', async () => {
      mockPrisma.document.findMany.mockRejectedValue(new Error('DB error'));
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosRechazados(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // getDocumentosPendientes
  // ====================================================================
  describe('getDocumentosPendientes', () => {
    it('should return docs for ADMIN without filtering dadorCargaId', async () => {
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 1, template: { name: 'DNI' }, entityType: 'CHOFER', entityId: 10, uploadedAt: new Date(), fileName: 'test.pdf' },
      ]);

      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      const data = body(res).data;
      expect(data).toHaveLength(1);
      expect(data[0].templateName).toBe('DNI');
    });

    it('should filter by user dadorCargaId for TRANSPORTISTA', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'TRANSPORTISTA', dadorCargaId: 10 },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should lookup empresa dadorCargaId for EMPRESA_TRANSPORTISTA', async () => {
      mockPrisma.empresaTransportista.findUnique.mockResolvedValue({ dadorCargaId: 20 });
      mockPrisma.document.findMany.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'EMPRESA_TRANSPORTISTA', empresaTransportistaId: 5 },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should return empty when empresa not found for CHOFER', async () => {
      mockPrisma.empresaTransportista.findUnique.mockResolvedValue(null);
      const req = mockReq({
        user: { userId: 1, role: 'CHOFER', empresaTransportistaId: 5 },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      expect(body(res).data).toEqual([]);
    });

    it('should return empty when TRANSPORTISTA has no dadorCargaId or empresaTransportistaId', async () => {
      const req = mockReq({
        user: { userId: 1, role: 'TRANSPORTISTA' },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      expect(body(res).data).toEqual([]);
    });

    it('should filter by dadorCargaId for DADOR_DE_CARGA', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'DADOR_DE_CARGA', dadorCargaId: 15 },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should handle DADOR_DE_CARGA without dadorCargaId', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'DADOR_DE_CARGA' },
      });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      expect(body(res).success).toBe(true);
    });

    it('should return 500 on error', async () => {
      mockPrisma.document.findMany.mockRejectedValue(new Error('DB error'));
      const req = mockReq({ user: { userId: 1, role: 'ADMIN' } });
      const res = mockRes();

      await PortalTransportistaController.getDocumentosPendientes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

function body(res: any): any {
  return res.json.mock.calls[0][0];
}
