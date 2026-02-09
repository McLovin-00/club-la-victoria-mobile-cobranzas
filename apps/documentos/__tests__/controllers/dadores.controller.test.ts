import { Response } from 'express';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/services/dador.service', () => ({
  DadorService: {
    list: jest.fn(async () => [{ id: 1 }]),
    create: jest.fn(async () => ({ id: 2 })),
    update: jest.fn(async () => ({ id: 3 })),
    remove: jest.fn(async () => ({ id: 4 })),
  },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => '5') },
}));

import { DadoresController } from '../../src/controllers/dadores.controller';

describe('DadoresController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('list/create/update/remove', async () => {
    const res = makeRes();
    await DadoresController.list({ tenantId: 1, query: { activo: 'true' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, defaults: { defaultDadorId: 5 } }));

    const res2 = makeRes();
    await DadoresController.create({ tenantId: 1, body: {} } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(201);

    const res3 = makeRes();
    await DadoresController.update({ tenantId: 1, params: { id: '3' }, body: {} } as any, res3 as any);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const res4 = makeRes();
    await DadoresController.remove({ tenantId: 1, params: { id: '4' } } as any, res4 as any);
    expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('updateNotifications updates flags via prisma', async () => {
    prismaMock.dadorCarga.update.mockResolvedValueOnce({ id: 1, notifyDriverEnabled: true, notifyDadorEnabled: false } as any);
    const res = makeRes();
    await DadoresController.updateNotifications({ tenantId: 1, params: { id: '1' }, body: { notifyDriverEnabled: true, notifyDadorEnabled: false } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('list returns null when default missing', async () => {
    (require('../../src/services/system-config.service').SystemConfigService.getConfig as jest.Mock).mockResolvedValueOnce(null);
    const res = makeRes();
    const req: Partial<AuthRequest> = { tenantId: 3, query: {} };
    await DadoresController.list(req as AuthRequest, res as Response);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ defaults: { defaultDadorId: null } }));
  });
});



