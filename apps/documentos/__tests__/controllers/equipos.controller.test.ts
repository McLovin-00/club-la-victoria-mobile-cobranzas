import { Response } from 'express';
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mock database (used by history endpoint)
jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

// Mock system config (used by getDefaultDadorId dynamic import)
const systemConfigGetConfigMock = jest.fn();
jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: {
    getConfig: (...args: any[]) => systemConfigGetConfigMock(...args),
  },
}));

// Mock services called by the controller
const equipoServiceMock = {
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
jest.mock('../../src/services/equipo.service', () => ({
  EquipoService: equipoServiceMock,
}));

const auditServiceMock = {
  log: jest.fn(),
  getEquipoHistory: jest.fn(),
};
jest.mock('../../src/services/audit.service', () => ({
  AuditService: auditServiceMock,
}));

import { EquiposController } from '../../src/controllers/equipos.controller';
import { AuthRequest } from '../../src/middlewares/auth.middleware';

describe('EquiposController', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    systemConfigGetConfigMock.mockReset();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = { json: jsonMock, status: statusMock } as Partial<Response>;
  });

  it('list: should pass choferId and activo=false when role is CHOFER', async () => {
    mockReq = {
      tenantId: 10,
      user: { userId: 1, role: 'CHOFER' as any, choferId: 55 } as any,
      query: { page: '2', limit: '5', activo: 'false' } as any,
    };
    equipoServiceMock.list.mockResolvedValue([{ id: 1 }]);

    await EquiposController.list(mockReq as AuthRequest, mockRes as Response);

    expect(equipoServiceMock.list).toHaveBeenCalledWith(10, undefined, 2, 5, { choferId: 55, activo: false });
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });

  it('searchPaged: should accept complianceFilter only when valid and activo=all', async () => {
    mockReq = {
      tenantId: 10,
      user: { userId: 1, role: 'ADMIN' as any } as any,
      query: { complianceFilter: 'vencidos', activo: 'all', page: '1', limit: '10', dadorCargaId: '2' } as any,
    };
    equipoServiceMock.searchPaginatedWithCompliance.mockResolvedValue({
      equipos: [{ id: 1 }],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      stats: { foo: 'bar' },
    });

    await EquiposController.searchPaged(mockReq as AuthRequest, mockRes as Response);

    expect(equipoServiceMock.searchPaginatedWithCompliance).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ dadorCargaId: 2, activo: 'all', complianceFilter: 'vencidos' }),
      1,
      10
    );
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [{ id: 1 }],
        pagination: expect.objectContaining({ total: 1 }),
        stats: { foo: 'bar' },
      })
    );
  });

  it('getById: should return equipo by id', async () => {
    mockReq = { params: { id: '123' } as any };
    equipoServiceMock.getById.mockResolvedValue({ id: 123 });

    await EquiposController.getById(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.getById).toHaveBeenCalledWith(123);
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { id: 123 } });
  });

  it('createMinimal: should use body dadorCargaId when numeric', async () => {
    mockReq = {
      tenantId: 9,
      body: { dadorCargaId: 77, dniChofer: '1', patenteTractor: 'AA', patenteAcoplado: 'BB', choferPhones: ['1'] } as any,
    };
    equipoServiceMock.createFromIdentifiers.mockResolvedValue({ id: 1 });

    await EquiposController.createMinimal(mockReq as AuthRequest, mockRes as Response);

    expect(systemConfigGetConfigMock).not.toHaveBeenCalled();
    expect(equipoServiceMock.createFromIdentifiers).toHaveBeenCalledWith(
      expect.objectContaining({ tenantEmpresaId: 9, dadorCargaId: 77, dniChofer: '1', patenteTractor: 'AA', patenteAcoplado: 'BB' })
    );
    expect(statusMock).toHaveBeenCalledWith(201);
  });

  it('createMinimal: should fallback to SystemConfigService default when no dadorCargaId', async () => {
    mockReq = {
      tenantId: 9,
      body: { dniChofer: '1', patenteTractor: 'AA' } as any,
    };
    systemConfigGetConfigMock.mockResolvedValue('33');
    equipoServiceMock.createFromIdentifiers.mockResolvedValue({ id: 2 });

    await EquiposController.createMinimal(mockReq as AuthRequest, mockRes as Response);

    expect(systemConfigGetConfigMock).toHaveBeenCalledWith('tenant:9:defaults.defaultDadorId');
    expect(equipoServiceMock.createFromIdentifiers).toHaveBeenCalledWith(expect.objectContaining({ dadorCargaId: 33 }));
  });

  it('createCompleto: should log audit with action EQUIPO_ALTA_COMPLETA', async () => {
    mockReq = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/api/docs/equipos/alta-completa',
      user: { userId: 10, role: 'ADMIN' as any } as any,
      body: {
        dadorCargaId: undefined,
        empresaTransportistaCuit: '20',
        empresaTransportistaNombre: 'X',
        choferDni: '11',
        camionPatente: 'AA',
        acopladoPatente: 'BB',
      } as any,
    };
    systemConfigGetConfigMock.mockResolvedValue(null);
    equipoServiceMock.createEquipoCompleto.mockResolvedValue({ id: 999 });

    await EquiposController.createCompleto(mockReq as AuthRequest, mockRes as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EQUIPO_ALTA_COMPLETA',
        entityId: 999,
        entityType: 'EQUIPO',
        statusCode: 201,
      })
    );
  });

  it('rollbackCompleto: should call service and log audit', async () => {
    mockReq = {
      tenantId: 1,
      method: 'POST',
      path: '/rollback',
      user: { userId: 10, role: 'ADMIN' as any } as any,
      params: { id: '5' } as any,
      body: { deleteChofer: true, deleteCamion: false, deleteAcoplado: true, deleteEmpresa: false } as any,
    };
    equipoServiceMock.rollbackAltaCompleta.mockResolvedValue({ ok: true });

    await EquiposController.rollbackCompleto(mockReq as AuthRequest, mockRes as Response);

    expect(equipoServiceMock.rollbackAltaCompleta).toHaveBeenCalledWith(
      expect.objectContaining({ equipoId: 5, deleteChofer: true, deleteCamion: false, deleteAcoplado: true, deleteEmpresa: false })
    );
    expect(auditServiceMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'EQUIPO_ROLLBACK_COMPLETO', entityId: 5, statusCode: 200 }));
  });

  it('create: should create equipo with date parsing and forceMove', async () => {
    mockReq = {
      tenantId: 1,
      body: {
        dadorCargaId: 10,
        driverId: '1',
        truckId: '2',
        trailerId: '3',
        empresaTransportistaId: '4',
        driverDni: '11',
        truckPlate: 'AA',
        trailerPlate: 'BB',
        validFrom: '2024-01-01T00:00:00.000Z',
        validTo: '2024-02-01T00:00:00.000Z',
        forceMove: true,
      } as any,
    };
    equipoServiceMock.create.mockResolvedValue({ id: 1 });

    await EquiposController.create(mockReq as AuthRequest, mockRes as Response);

    expect(equipoServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantEmpresaId: 1,
        dadorCargaId: 10,
        driverId: 1,
        truckId: 2,
        trailerId: 3,
        empresaTransportistaId: 4,
        forceMove: true,
        validFrom: expect.any(Date),
        validTo: expect.any(Date),
      })
    );
    expect(statusMock).toHaveBeenCalledWith(201);
  });

  it('update: should pass empresaTransportistaId when provided, and omit when undefined', async () => {
    mockReq = { params: { id: '7' } as any, body: { empresaTransportistaId: '9', trailerId: '1', validTo: '2024-03-01T00:00:00Z', estado: 'OK' } as any };
    equipoServiceMock.update.mockResolvedValue({ id: 7 });
    await EquiposController.update(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.update).toHaveBeenCalledWith(7, expect.objectContaining({ empresaTransportistaId: 9, trailerId: 1, validTo: expect.any(Date) }));

    mockReq = { params: { id: '8' } as any, body: { empresaTransportistaId: undefined } as any };
    await EquiposController.update(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.update).toHaveBeenLastCalledWith(8, expect.objectContaining({ empresaTransportistaId: undefined }));
  });

  it('associateCliente/removeCliente: should call audit', async () => {
    mockReq = {
      tenantId: 1,
      method: 'POST',
      originalUrl: '/equipos/1/clientes/2',
      user: { userId: 10, role: 'ADMIN' as any } as any,
      params: { equipoId: '1', clienteId: '2' } as any,
      body: { asignadoDesde: '2024-01-01T00:00:00Z', asignadoHasta: '2024-02-01T00:00:00Z' } as any,
    };
    equipoServiceMock.associateCliente.mockResolvedValue({ ok: true });
    await EquiposController.associateCliente(mockReq as AuthRequest, mockRes as Response);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(auditServiceMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'EQUIPO_CLIENTE_ATTACH', entityId: 1, statusCode: 201 }));

    mockReq = {
      tenantId: 1,
      method: 'DELETE',
      originalUrl: '/equipos/1/clientes/2',
      user: { userId: 10, role: 'ADMIN' as any } as any,
      params: { equipoId: '1', clienteId: '2' } as any,
    };
    equipoServiceMock.removeCliente.mockResolvedValue({ ok: true });
    await EquiposController.removeCliente(mockReq as AuthRequest, mockRes as Response);
    expect(auditServiceMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'EQUIPO_CLIENTE_DETACH', entityId: 1, statusCode: 200 }));
  });

  it('history: should query equipoHistory with limit cap', async () => {
    mockReq = { params: { id: '99' } as any, query: { limit: '500' } as any };
    prismaMock.equipoHistory.findMany.mockResolvedValue([{ id: 1 }]);

    await EquiposController.history(mockReq as AuthRequest, mockRes as Response);

    expect(prismaMock.equipoHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { equipoId: 99 }, take: 100 }));
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });

  it('updateEntidades: should parse optional/nullable ids', async () => {
    mockReq = {
      tenantId: 1,
      user: { userId: 50 } as any,
      params: { id: '10' } as any,
      body: { choferId: '1', camionId: '2', acopladoId: null, empresaTransportistaId: undefined } as any,
    };
    equipoServiceMock.updateEquipo.mockResolvedValue({ ok: true });
    await EquiposController.updateEntidades(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.updateEquipo).toHaveBeenCalledWith(
      expect.objectContaining({
        equipoId: 10,
        usuarioId: 50,
        tenantEmpresaId: 1,
        choferId: 1,
        camionId: 2,
        acopladoId: null,
        empresaTransportistaId: undefined,
      })
    );
  });

  it('addCliente/removeClienteWithArchive/transferir/getRequisitos/getAuditHistory/delete: should call services', async () => {
    mockReq = { tenantId: 1, user: { userId: 1 } as any, params: { id: '1', clienteId: '2' } as any, body: { clienteId: 2 } as any };
    equipoServiceMock.addClienteToEquipo.mockResolvedValue({ ok: true });
    await EquiposController.addCliente(mockReq as AuthRequest, mockRes as Response);
    expect(statusMock).toHaveBeenCalledWith(201);

    equipoServiceMock.removeClienteFromEquipo.mockResolvedValue({ ok: true });
    await EquiposController.removeClienteWithArchive(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.removeClienteFromEquipo).toHaveBeenCalledWith(expect.objectContaining({ equipoId: 1, clienteId: 2 }));

    mockReq = { tenantId: 1, user: { userId: 1 } as any, params: { id: '3' } as any, body: { nuevoDadorCargaId: 8, motivo: 'x' } as any };
    equipoServiceMock.transferirEquipo.mockResolvedValue({ ok: true });
    await EquiposController.transferir(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.transferirEquipo).toHaveBeenCalledWith(expect.objectContaining({ equipoId: 3, nuevoDadorCargaId: 8, motivo: 'x' }));

    mockReq = { tenantId: 1, params: { id: '4' } as any };
    equipoServiceMock.getRequisitosEquipo.mockResolvedValue([{ id: 1 }]);
    await EquiposController.getRequisitos(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.getRequisitosEquipo).toHaveBeenCalledWith(4, 1);

    auditServiceMock.getEquipoHistory.mockResolvedValue([{ id: 'h' }]);
    await EquiposController.getAuditHistory(mockReq as AuthRequest, mockRes as Response);
    expect(auditServiceMock.getEquipoHistory).toHaveBeenCalledWith(4);

    equipoServiceMock.delete.mockResolvedValue({ ok: true });
    await EquiposController.delete(mockReq as AuthRequest, mockRes as Response);
    expect(equipoServiceMock.delete).toHaveBeenCalledWith(4);
  });
});


