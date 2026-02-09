import { Response } from 'express';
import type { Request } from 'express';

type TenantRequest = Request & { tenantId: number };

jest.mock('../../src/config/logger', () => ({

  AppLogger: { error: jest.fn() },
}));

jest.mock('../../src/services/empresa-transportista.service', () => ({
  EmpresaTransportistaService: {
    list: jest.fn(async () => ({ data: [{ id: 1 }], pagination: { page: 1, limit: 10, total: 1, pages: 1 } })),
    getById: jest.fn(async () => null),
    create: jest.fn(async () => ({ id: 1 })),
    update: jest.fn(async () => ({ id: 1 })),
    delete: jest.fn(async () => true),
    getChoferes: jest.fn(async () => []),
    getEquipos: jest.fn(async () => []),
  },
}));

import { EmpresaTransportistaService } from '../../src/services/empresa-transportista.service';
import { EmpresasTransportistasController } from '../../src/controllers/empresas-transportistas.controller';

describe('EmpresasTransportistasController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('list parses activo and returns list=data', async () => {
    const res = makeRes();
    await EmpresasTransportistasController.list({ tenantId: 1, query: { activo: 'true', page: '1', limit: '10' } } as any, res as any);
    expect(EmpresaTransportistaService.list).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, list: expect.any(Array) }));
  });

  it('list parses activo=false', async () => {
    const res = makeRes();
    await EmpresasTransportistasController.list({ tenantId: 1, query: { activo: 'false' } } as any, res as any);
    expect(EmpresaTransportistaService.list).toHaveBeenCalled();
  });

  it('getById returns 404 when not found', async () => {
    const res = makeRes();
    await EmpresasTransportistasController.getById({ tenantId: 1, params: { id: '1' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById maps service error "no encontrada" to 404', async () => {
    (EmpresaTransportistaService.getById as jest.Mock).mockRejectedValueOnce(new Error('no encontrada'));
    const res = makeRes();
    await EmpresasTransportistasController.getById({ tenantId: 1, params: { id: '1' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('create/update/getChoferes/getEquipos success', async () => {
    const resCreate = makeRes();
    await EmpresasTransportistasController.create({ tenantId: 1, body: { dadorCargaId: 2 } } as any, resCreate as any);
    expect(resCreate.status).toHaveBeenCalledWith(201);

    const resUpdate = makeRes();
    await EmpresasTransportistasController.update({ tenantId: 1, params: { id: '1' }, body: {} } as any, resUpdate as any);
    expect(resUpdate.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const resC = makeRes();
    await EmpresasTransportistasController.getChoferes({ tenantId: 1, params: { id: '1' } } as any, resC as any);
    expect(resC.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const resE = makeRes();
    await EmpresasTransportistasController.getEquipos({ tenantId: 1, params: { id: '1' } } as any, resE as any);
    expect(resE.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('delete maps dependency errors to 400', async () => {
    (EmpresaTransportistaService.delete as jest.Mock).mockRejectedValueOnce(new Error('activos asociados'));
    const res = makeRes();
    await EmpresasTransportistasController.delete({ tenantId: 1, params: { id: '1' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('default error => 500', async () => {
    (EmpresaTransportistaService.delete as jest.Mock).mockRejectedValueOnce(new Error('otro'));
    const res = makeRes();
    await EmpresasTransportistasController.delete({ tenantId: 1, params: { id: '1' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('list maps not found errors to 404', async () => {
    (EmpresaTransportistaService.list as jest.Mock).mockRejectedValueOnce(new Error('no encontrada'));
    const res = makeRes();
    const req = { tenantId: 1, query: {}, params: {}, body: {} } as unknown as TenantRequest;
    await EmpresasTransportistasController.list(req, res as Response);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});



