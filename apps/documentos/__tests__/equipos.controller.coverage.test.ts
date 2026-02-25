/**
 * Coverage tests for equipos.controller.ts
 * Covers: helpers (parseActivo, getDefaultDadorId, logAudit) and all controller methods with branch coverage.
 * @jest-environment node
 */

const mockEquipoService = {
  list: jest.fn(),
  searchPaginatedWithCompliance: jest.fn(),
  getById: jest.fn(),
  createFromIdentifiers: jest.fn(),
  createEquipoCompleto: jest.fn(),
  rollbackAltaCompleta: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  associateCliente: jest.fn(),
  removeCliente: jest.fn(),
  delete: jest.fn(),
  updateEquipo: jest.fn(),
  addClienteToEquipo: jest.fn(),
  removeClienteFromEquipo: jest.fn(),
  transferirEquipo: jest.fn(),
  getRequisitosEquipo: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
  getEquipoHistory: jest.fn(),
};

const mockSystemConfigService = {
  getConfig: jest.fn(),
};

const mockPrisma = {
  equipoHistory: { findMany: jest.fn() },
};

jest.mock('../src/services/equipo.service', () => ({
  EquipoService: mockEquipoService,
}));

jest.mock('../src/services/audit.service', () => ({
  AuditService: mockAuditService,
}));

jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: mockSystemConfigService,
}));

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { EquiposController } from '../src/controllers/equipos.controller';

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    tenantId: 1,
    user: { userId: 1, role: 'ADMIN', choferId: undefined },
    query: {},
    params: {},
    body: {},
    method: 'POST',
    originalUrl: '/api/equipos',
    path: '/api/equipos',
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('EquiposController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ====================================================================
  // list
  // ====================================================================
  describe('list', () => {
    it('should list with defaults', async () => {
      mockEquipoService.list.mockResolvedValue([]);
      const req = mockReq({ query: {} });
      const res = mockRes();

      await EquiposController.list(req, res);

      expect(mockEquipoService.list).toHaveBeenCalledWith(1, undefined, 1, 20, { choferId: undefined, activo: true });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });

    it('should parse dadorCargaId, page, limit from query', async () => {
      mockEquipoService.list.mockResolvedValue([{ id: 1 }]);
      const req = mockReq({ query: { dadorCargaId: '5', page: '2', limit: '10' } });
      const res = mockRes();

      await EquiposController.list(req, res);

      expect(mockEquipoService.list).toHaveBeenCalledWith(1, 5, 2, 10, expect.any(Object));
    });

    it('should set choferId when role is CHOFER', async () => {
      mockEquipoService.list.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'CHOFER', choferId: 42 },
        query: {},
      });
      const res = mockRes();

      await EquiposController.list(req, res);

      expect(mockEquipoService.list).toHaveBeenCalledWith(1, undefined, 1, 20, { choferId: 42, activo: true });
    });

    it('should handle CHOFER without choferId (undefined)', async () => {
      mockEquipoService.list.mockResolvedValue([]);
      const req = mockReq({
        user: { userId: 1, role: 'CHOFER', choferId: undefined },
        query: {},
      });
      const res = mockRes();

      await EquiposController.list(req, res);

      expect(mockEquipoService.list).toHaveBeenCalledWith(1, undefined, 1, 20, { choferId: undefined, activo: true });
    });

    it('should parse activo=all', async () => {
      mockEquipoService.list.mockResolvedValue([]);
      const req = mockReq({ query: { activo: 'all' } });
      const res = mockRes();

      await EquiposController.list(req, res);

      expect(mockEquipoService.list).toHaveBeenCalledWith(1, undefined, 1, 20, { choferId: undefined, activo: 'all' });
    });

    it('should parse activo=false', async () => {
      mockEquipoService.list.mockResolvedValue([]);
      const req = mockReq({ query: { activo: 'false' } });
      const res = mockRes();

      await EquiposController.list(req, res);

      expect(mockEquipoService.list).toHaveBeenCalledWith(1, undefined, 1, 20, { choferId: undefined, activo: false });
    });
  });

  // ====================================================================
  // searchPaged
  // ====================================================================
  describe('searchPaged', () => {
    const searchResult = {
      equipos: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      stats: {},
    };

    it('should search with default params', async () => {
      mockEquipoService.searchPaginatedWithCompliance.mockResolvedValue(searchResult);
      const req = mockReq({ query: {} });
      const res = mockRes();

      await EquiposController.searchPaged(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));
    });

    it('should pass valid complianceFilter', async () => {
      mockEquipoService.searchPaginatedWithCompliance.mockResolvedValue(searchResult);
      const req = mockReq({ query: { complianceFilter: 'faltantes', page: '2', limit: '5' } });
      const res = mockRes();

      await EquiposController.searchPaged(req, res);

      const call = mockEquipoService.searchPaginatedWithCompliance.mock.calls[0];
      expect(call[1]).toMatchObject({ complianceFilter: 'faltantes' });
    });

    it('should ignore invalid complianceFilter', async () => {
      mockEquipoService.searchPaginatedWithCompliance.mockResolvedValue(searchResult);
      const req = mockReq({ query: { complianceFilter: 'invalid' } });
      const res = mockRes();

      await EquiposController.searchPaged(req, res);

      const call = mockEquipoService.searchPaginatedWithCompliance.mock.calls[0];
      expect(call[1].complianceFilter).toBeUndefined();
    });

    it('should pass all query filter params', async () => {
      mockEquipoService.searchPaginatedWithCompliance.mockResolvedValue(searchResult);
      const req = mockReq({
        query: {
          dadorCargaId: '1',
          clienteId: '2',
          empresaTransportistaId: '3',
          search: 'test',
          dni: '12345',
          truckPlate: 'ABC',
          trailerPlate: 'XYZ',
          activo: 'all',
          complianceFilter: 'vencidos',
        },
        user: { userId: 1, role: 'CHOFER', choferId: 10 },
      });
      const res = mockRes();

      await EquiposController.searchPaged(req, res);

      const call = mockEquipoService.searchPaginatedWithCompliance.mock.calls[0];
      expect(call[1]).toMatchObject({
        dadorCargaId: 1,
        clienteId: 2,
        empresaTransportistaId: 3,
        search: 'test',
        dni: '12345',
        choferId: 10,
        activo: 'all',
        complianceFilter: 'vencidos',
      });
    });
  });

  // ====================================================================
  // getById
  // ====================================================================
  describe('getById', () => {
    it('should return equipo by id', async () => {
      mockEquipoService.getById.mockResolvedValue({ id: 5 });
      const req = mockReq({ params: { id: '5' } });
      const res = mockRes();

      await EquiposController.getById(req, res);

      expect(mockEquipoService.getById).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 5 } });
    });
  });

  // ====================================================================
  // createMinimal
  // ====================================================================
  describe('createMinimal', () => {
    it('should create with provided dadorCargaId', async () => {
      mockEquipoService.createFromIdentifiers.mockResolvedValue({ id: 1 });
      const req = mockReq({ body: { dadorCargaId: 10, dniChofer: '12345678', patenteTractor: 'ABC123' } });
      const res = mockRes();

      await EquiposController.createMinimal(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
    });

    it('should fallback to default dadorId from SystemConfig', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue('99');
      mockEquipoService.createFromIdentifiers.mockResolvedValue({ id: 2 });
      const req = mockReq({ body: { dniChofer: '12345678', patenteTractor: 'ABC123' } });
      const res = mockRes();

      await EquiposController.createMinimal(req, res);

      expect(mockSystemConfigService.getConfig).toHaveBeenCalledWith('tenant:1:defaults.defaultDadorId');
    });

    it('should default dadorId to 0 when config returns null', async () => {
      mockSystemConfigService.getConfig.mockResolvedValue(null);
      mockEquipoService.createFromIdentifiers.mockResolvedValue({ id: 3 });
      const req = mockReq({ body: { dniChofer: '12345678', patenteTractor: 'ABC123' } });
      const res = mockRes();

      await EquiposController.createMinimal(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle patenteAcoplado and choferPhones optional fields', async () => {
      mockEquipoService.createFromIdentifiers.mockResolvedValue({ id: 4 });
      const req = mockReq({
        body: {
          dadorCargaId: 5,
          dniChofer: '11111111',
          patenteTractor: 'ZZZ999',
          patenteAcoplado: 'YYY888',
          choferPhones: ['+5491112345678'],
        },
      });
      const res = mockRes();

      await EquiposController.createMinimal(req, res);

      const call = mockEquipoService.createFromIdentifiers.mock.calls[0][0];
      expect(call.patenteAcoplado).toBe('YYY888');
      expect(call.choferPhones).toEqual(['+5491112345678']);
    });

    it('should set patenteAcoplado to null when absent', async () => {
      mockEquipoService.createFromIdentifiers.mockResolvedValue({ id: 5 });
      const req = mockReq({ body: { dadorCargaId: 5, dniChofer: '11111111', patenteTractor: 'ZZZ999' } });
      const res = mockRes();

      await EquiposController.createMinimal(req, res);

      const call = mockEquipoService.createFromIdentifiers.mock.calls[0][0];
      expect(call.patenteAcoplado).toBeNull();
      expect(call.choferPhones).toBeUndefined();
    });
  });

  // ====================================================================
  // createCompleto
  // ====================================================================
  describe('createCompleto', () => {
    it('should create completo and log audit', async () => {
      mockEquipoService.createEquipoCompleto.mockResolvedValue({ id: 10 });
      const req = mockReq({
        body: {
          dadorCargaId: 5,
          empresaTransportistaCuit: '20-12345678-1',
          empresaTransportistaNombre: 'Trans SA',
          choferDni: '33333333',
          choferNombre: 'Juan',
          choferApellido: 'Perez',
          choferPhones: ['+5491112345678'],
          camionPatente: 'AAA111',
          camionMarca: 'Scania',
          camionModelo: 'R500',
          acopladoPatente: 'BBB222',
          acopladoTipo: 'Baranda',
          clienteIds: [1, 2],
        },
      });
      const res = mockRes();

      await EquiposController.createCompleto(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should handle optional fields absent', async () => {
      mockEquipoService.createEquipoCompleto.mockResolvedValue({ id: 11 });
      const req = mockReq({
        body: {
          dadorCargaId: 5,
          empresaTransportistaCuit: '20-12345678-1',
          empresaTransportistaNombre: 'Trans SA',
          choferDni: '33333333',
          camionPatente: 'AAA111',
        },
      });
      const res = mockRes();

      await EquiposController.createCompleto(req, res);

      const call = mockEquipoService.createEquipoCompleto.mock.calls[0][0];
      expect(call.choferNombre).toBeUndefined();
      expect(call.acopladoPatente).toBeNull();
      expect(call.clienteIds).toBeUndefined();
    });
  });

  // ====================================================================
  // rollbackCompleto
  // ====================================================================
  describe('rollbackCompleto', () => {
    it('should rollback and log audit', async () => {
      mockEquipoService.rollbackAltaCompleta.mockResolvedValue({ ok: true });
      const req = mockReq({
        params: { id: '10' },
        body: { deleteChofer: true, deleteCamion: false, deleteAcoplado: true, deleteEmpresa: false },
      });
      const res = mockRes();

      await EquiposController.rollbackCompleto(req, res);

      expect(mockEquipoService.rollbackAltaCompleta).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { ok: true } });
    });
  });

  // ====================================================================
  // create
  // ====================================================================
  describe('create', () => {
    it('should create equipo with all fields', async () => {
      mockEquipoService.create.mockResolvedValue({ id: 20 });
      const req = mockReq({
        body: {
          dadorCargaId: 5,
          driverId: 1,
          truckId: 2,
          trailerId: 3,
          empresaTransportistaId: 4,
          driverDni: '12345678',
          truckPlate: 'ABC123',
          trailerPlate: 'DEF456',
          validFrom: '2025-01-01',
          validTo: '2025-12-31',
          forceMove: true,
        },
      });
      const res = mockRes();

      await EquiposController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should handle nullable fields (trailerId, empresaTransportistaId, trailerPlate, validTo)', async () => {
      mockEquipoService.create.mockResolvedValue({ id: 21 });
      const req = mockReq({
        body: {
          dadorCargaId: 5,
          driverId: 1,
          truckId: 2,
          driverDni: '12345678',
          truckPlate: 'ABC123',
          validFrom: '2025-01-01',
        },
      });
      const res = mockRes();

      await EquiposController.create(req, res);

      const call = mockEquipoService.create.mock.calls[0][0];
      expect(call.trailerId).toBeNull();
      expect(call.empresaTransportistaId).toBeNull();
      expect(call.trailerPlate).toBeNull();
      expect(call.validTo).toBeNull();
      expect(call.forceMove).toBe(false);
    });
  });

  // ====================================================================
  // update
  // ====================================================================
  describe('update', () => {
    it('should update with all fields', async () => {
      mockEquipoService.update.mockResolvedValue({ id: 1 });
      const req = mockReq({
        params: { id: '1' },
        body: { trailerId: 3, trailerPlate: 'XYZ', validTo: '2025-12-31', estado: 'ACTIVO', empresaTransportistaId: 5 },
      });
      const res = mockRes();

      await EquiposController.update(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
    });

    it('should handle absent optional fields', async () => {
      mockEquipoService.update.mockResolvedValue({ id: 1 });
      const req = mockReq({ params: { id: '1' }, body: {} });
      const res = mockRes();

      await EquiposController.update(req, res);

      const call = mockEquipoService.update.mock.calls[0];
      expect(call[1].trailerId).toBeUndefined();
      expect(call[1].validTo).toBeUndefined();
      expect(call[1].empresaTransportistaId).toBeUndefined();
    });
  });

  // ====================================================================
  // associateCliente / removeCliente
  // ====================================================================
  describe('associateCliente', () => {
    it('should associate and log audit', async () => {
      mockEquipoService.associateCliente.mockResolvedValue({ ok: true });
      const req = mockReq({
        params: { equipoId: '1', clienteId: '2' },
        body: { asignadoDesde: '2025-01-01', asignadoHasta: '2025-12-31' },
      });
      const res = mockRes();

      await EquiposController.associateCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should handle absent asignadoHasta', async () => {
      mockEquipoService.associateCliente.mockResolvedValue({ ok: true });
      const req = mockReq({
        params: { equipoId: '1', clienteId: '2' },
        body: { asignadoDesde: '2025-01-01' },
      });
      const res = mockRes();

      await EquiposController.associateCliente(req, res);

      expect(mockEquipoService.associateCliente).toHaveBeenCalledWith(1, 1, 2, expect.any(Date), undefined);
    });
  });

  describe('removeCliente', () => {
    it('should remove and log audit', async () => {
      mockEquipoService.removeCliente.mockResolvedValue({ ok: true });
      const req = mockReq({ params: { equipoId: '1', clienteId: '2' } });
      const res = mockRes();

      await EquiposController.removeCliente(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { ok: true } });
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  // ====================================================================
  // delete
  // ====================================================================
  describe('delete', () => {
    it('should delete equipo', async () => {
      mockEquipoService.delete.mockResolvedValue({ id: 1, deleted: true });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await EquiposController.delete(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, deleted: true } });
    });
  });

  // ====================================================================
  // history
  // ====================================================================
  describe('history', () => {
    it('should return history with default limit', async () => {
      mockPrisma.equipoHistory.findMany.mockResolvedValue([]);
      const req = mockReq({ params: { id: '1' }, query: {} });
      const res = mockRes();

      await EquiposController.history(req, res);

      expect(mockPrisma.equipoHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { equipoId: 1 }, take: 50 }),
      );
    });

    it('should cap limit at 100', async () => {
      mockPrisma.equipoHistory.findMany.mockResolvedValue([]);
      const req = mockReq({ params: { id: '1' }, query: { limit: '200' } });
      const res = mockRes();

      await EquiposController.history(req, res);

      expect(mockPrisma.equipoHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  // ====================================================================
  // updateEntidades
  // ====================================================================
  describe('updateEntidades', () => {
    it('should update with all entity ids', async () => {
      mockEquipoService.updateEquipo.mockResolvedValue({ id: 1 });
      const req = mockReq({
        params: { id: '1' },
        body: { choferId: 10, camionId: 20, acopladoId: 30, empresaTransportistaId: 40, expectedVersion: 1 },
      });
      const res = mockRes();

      await EquiposController.updateEntidades(req, res);

      const call = mockEquipoService.updateEquipo.mock.calls[0][0];
      expect(call.choferId).toBe(10);
      expect(call.acopladoId).toBe(30);
      expect(call.expectedVersion).toBe(1);
    });

    it('should handle acopladoId=null (nullable)', async () => {
      mockEquipoService.updateEquipo.mockResolvedValue({ id: 1 });
      const req = mockReq({
        params: { id: '1' },
        body: { acopladoId: null },
      });
      const res = mockRes();

      await EquiposController.updateEntidades(req, res);

      const call = mockEquipoService.updateEquipo.mock.calls[0][0];
      expect(call.acopladoId).toBeNull();
    });

    it('should handle all optional ids absent', async () => {
      mockEquipoService.updateEquipo.mockResolvedValue({ id: 1 });
      const req = mockReq({ params: { id: '1' }, body: {} });
      const res = mockRes();

      await EquiposController.updateEntidades(req, res);

      const call = mockEquipoService.updateEquipo.mock.calls[0][0];
      expect(call.choferId).toBeUndefined();
      expect(call.camionId).toBeUndefined();
      expect(call.acopladoId).toBeUndefined();
      expect(call.expectedVersion).toBeUndefined();
    });
  });

  // ====================================================================
  // addCliente / removeClienteWithArchive
  // ====================================================================
  describe('addCliente', () => {
    it('should add cliente', async () => {
      mockEquipoService.addClienteToEquipo.mockResolvedValue({ ok: true });
      const req = mockReq({ params: { id: '1' }, body: { clienteId: 5 } });
      const res = mockRes();

      await EquiposController.addCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('removeClienteWithArchive', () => {
    it('should remove with archive', async () => {
      mockEquipoService.removeClienteFromEquipo.mockResolvedValue({ ok: true });
      const req = mockReq({ params: { id: '1', clienteId: '5' } });
      const res = mockRes();

      await EquiposController.removeClienteWithArchive(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { ok: true } });
    });
  });

  // ====================================================================
  // transferir
  // ====================================================================
  describe('transferir', () => {
    it('should transfer with motivo', async () => {
      mockEquipoService.transferirEquipo.mockResolvedValue({ transferred: true });
      const req = mockReq({
        params: { id: '1' },
        body: { nuevoDadorCargaId: 10, motivo: 'Cambio de contrato' },
      });
      const res = mockRes();

      await EquiposController.transferir(req, res);

      const call = mockEquipoService.transferirEquipo.mock.calls[0][0];
      expect(call.motivo).toBe('Cambio de contrato');
    });

    it('should transfer without motivo', async () => {
      mockEquipoService.transferirEquipo.mockResolvedValue({ transferred: true });
      const req = mockReq({
        params: { id: '1' },
        body: { nuevoDadorCargaId: 10 },
      });
      const res = mockRes();

      await EquiposController.transferir(req, res);

      const call = mockEquipoService.transferirEquipo.mock.calls[0][0];
      expect(call.motivo).toBeUndefined();
    });
  });

  // ====================================================================
  // getRequisitos / getAuditHistory
  // ====================================================================
  describe('getRequisitos', () => {
    it('should return requisitos', async () => {
      mockEquipoService.getRequisitosEquipo.mockResolvedValue([]);
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await EquiposController.getRequisitos(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history', async () => {
      mockAuditService.getEquipoHistory.mockResolvedValue([{ action: 'CREATE' }]);
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await EquiposController.getAuditHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ action: 'CREATE' }] });
    });
  });

  // ====================================================================
  // logAudit helper (via createCompleto / rollbackCompleto / associateCliente / removeCliente)
  // ====================================================================
  describe('logAudit helper - branches', () => {
    it('should handle missing user fields gracefully', async () => {
      mockEquipoService.createEquipoCompleto.mockResolvedValue({ id: 99 });
      const req = mockReq({
        user: undefined,
        body: {
          dadorCargaId: 1,
          empresaTransportistaCuit: '20-11111111-1',
          empresaTransportistaNombre: 'E',
          choferDni: '11111111',
          camionPatente: 'AAA111',
        },
        originalUrl: undefined,
      });
      const res = mockRes();

      await EquiposController.createCompleto(req, res);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined, userRole: undefined }),
      );
    });
  });
});
