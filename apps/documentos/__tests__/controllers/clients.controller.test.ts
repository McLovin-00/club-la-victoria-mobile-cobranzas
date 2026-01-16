import { Response } from 'express';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


jest.mock('../../src/services/clients.service', () => ({
  ClientsService: {
    list: jest.fn(async () => [{ id: 1 }]),
    create: jest.fn(async () => ({ id: 2 })),
    update: jest.fn(async () => ({ id: 3 })),
    remove: jest.fn(async () => ({ id: 4 })),
    listRequirements: jest.fn(async () => []),
    addRequirement: jest.fn(async () => ({ id: 1 })),
    removeRequirement: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => '10') },
}));

import { ClientsController } from '../../src/controllers/clients.controller';

describe('ClientsController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('list/create/update/remove cover happy paths', async () => {
    const res = makeRes();
    await ClientsController.list({ tenantId: 1, query: { activo: 'true' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, defaults: { defaultClienteId: 10 } }));

    const res2 = makeRes();
    await ClientsController.create({ tenantId: 1, body: { razonSocial: 'x' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(201);

    const res3 = makeRes();
    await ClientsController.update({ tenantId: 1, params: { id: '3' }, body: {} } as any, res3 as any);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res4 = makeRes();
    await ClientsController.remove({ tenantId: 1, params: { id: '4' } } as any, res4 as any);
    expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('requirements endpoints', async () => {
    const res = makeRes();
    await ClientsController.listRequirements({ tenantId: 1, params: { clienteId: '1' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res2 = makeRes();
    await ClientsController.addRequirement({ tenantId: 1, params: { clienteId: '1' }, body: {} } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(201);

    const res3 = makeRes();
    await ClientsController.removeRequirement({ tenantId: 1, params: { clienteId: '1', requirementId: '2' } } as any, res3 as any);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('list uses defaults when config missing', async () => {
    const res = makeRes();
    (require('../../src/services/system-config.service').SystemConfigService.getConfig as jest.Mock).mockResolvedValueOnce(null);
    const req: Partial<AuthRequest> = { tenantId: 2, query: { activo: 'false' } };
    await ClientsController.list(req as AuthRequest, res as Response);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ defaults: { defaultClienteId: null } }));
  });

});


