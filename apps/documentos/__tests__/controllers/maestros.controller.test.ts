import { Response } from 'express';

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number) => new Error(message),
}));

jest.mock('../../src/services/maestros.service', () => ({
  MaestrosService: {
    listEmpresas: jest.fn(async () => ({ data: [], total: 0 })),
    createEmpresa: jest.fn(async () => ({ id: 1 })),
    updateEmpresa: jest.fn(async () => ({ id: 2 })),
    deleteEmpresa: jest.fn(async () => undefined),
    listChoferes: jest.fn(async () => ({ data: [], total: 0 })),
    getChoferById: jest.fn(async () => ({ id: 1 })),
    createChofer: jest.fn(async () => ({ id: 1 })),
    updateChofer: jest.fn(async () => ({ id: 1 })),
    deleteChofer: jest.fn(async () => undefined),
    listCamiones: jest.fn(async () => ({ data: [], total: 0 })),
    createCamion: jest.fn(async () => ({ id: 1 })),
    updateCamion: jest.fn(async () => ({ id: 1 })),
    deleteCamion: jest.fn(async () => undefined),
    listAcoplados: jest.fn(async () => ({ data: [], total: 0 })),
    createAcoplado: jest.fn(async () => ({ id: 1 })),
    updateAcoplado: jest.fn(async () => ({ id: 1 })),
    deleteAcoplado: jest.fn(async () => undefined),
  },
}));

import { MaestrosController } from '../../src/controllers/maestros.controller';
import { MaestrosService } from '../../src/services/maestros.service';

describe('MaestrosController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('empresas endpoints', async () => {
    const res = makeRes();
    await MaestrosController.listEmpresas({ query: {}, tenantId: 1 } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = makeRes();
    await MaestrosController.createEmpresa({ body: {}, tenantId: 1 } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(201);

    const res3 = makeRes();
    await MaestrosController.updateEmpresa({ params: { id: '2' }, body: {}, tenantId: 1 } as any, res3 as any);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res4 = makeRes();
    await MaestrosController.deleteEmpresa({ params: { id: '3' }, tenantId: 1 } as any, res4 as any);
    expect(res4.json).toHaveBeenCalledWith({ success: true });
  });

  it('chofer endpoints cover validation + not found', async () => {
    const res = makeRes();
    await expect(MaestrosController.listChoferes({ tenantId: 1, query: {} } as any, res as any)).rejects.toThrow('dadorCargaId requerido');

    (MaestrosService.getChoferById as jest.Mock).mockResolvedValueOnce(null);
    const res2 = makeRes();
    await expect(MaestrosController.getChoferById({ tenantId: 1, params: { id: '1' } } as any, res2 as any)).rejects.toThrow('Chofer no encontrado');
  });

  it('list/create/update/delete for chofer/camion/acoplado', async () => {
    const resListChofer = makeRes();
    await MaestrosController.listChoferes(
      { tenantId: 1, query: { dadorCargaId: '2', page: '2', limit: '5', activo: '1', q: 'x' } } as any,
      resListChofer as any
    );
    expect(resListChofer.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, pagination: expect.objectContaining({ page: 2, limit: 5 }) })
    );

    const res = makeRes();
    await MaestrosController.createChofer({ tenantId: 1, body: { dadorCargaId: 2, dni: '1' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(201);

    const resUp = makeRes();
    await MaestrosController.updateChofer({ tenantId: 1, params: { id: '10' }, body: {} } as any, resUp as any);
    expect(resUp.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const resDel = makeRes();
    await MaestrosController.deleteChofer({ tenantId: 1, params: { id: '10' } } as any, resDel as any);
    expect(resDel.json).toHaveBeenCalledWith({ success: true });

    const resListCam = makeRes();
    await expect(MaestrosController.listCamiones({ tenantId: 1, query: {} } as any, resListCam as any)).rejects.toThrow(
      'dadorCargaId requerido'
    );

    const resListCamOk = makeRes();
    await MaestrosController.listCamiones(
      { tenantId: 1, query: { dadorCargaId: '2', activo: 'true', page: '1', limit: '10' } } as any,
      resListCamOk as any
    );
    expect(resListCamOk.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = makeRes();
    await MaestrosController.createCamion({ tenantId: 1, body: { dadorCargaId: 2, patente: 'A' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(201);

    const res2u = makeRes();
    await MaestrosController.updateCamion({ tenantId: 1, params: { id: '20' }, body: {} } as any, res2u as any);
    expect(res2u.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2d = makeRes();
    await MaestrosController.deleteCamion({ tenantId: 1, params: { id: '20' } } as any, res2d as any);
    expect(res2d.json).toHaveBeenCalledWith({ success: true });

    const resListAcoOk = makeRes();
    await MaestrosController.listAcoplados(
      { tenantId: 1, query: { dadorCargaId: '2', activo: 'false', page: '3', limit: '1' } } as any,
      resListAcoOk as any
    );
    expect(resListAcoOk.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pagination: expect.any(Object) }));

    const res3 = makeRes();
    await MaestrosController.createAcoplado({ tenantId: 1, body: { dadorCargaId: 2, patente: 'B' } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(201);

    const res3u = makeRes();
    await MaestrosController.updateAcoplado({ tenantId: 1, params: { id: '30' }, body: {} } as any, res3u as any);
    expect(res3u.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res3d = makeRes();
    await MaestrosController.deleteAcoplado({ tenantId: 1, params: { id: '30' } } as any, res3d as any);
    expect(res3d.json).toHaveBeenCalledWith({ success: true });
  });
});


