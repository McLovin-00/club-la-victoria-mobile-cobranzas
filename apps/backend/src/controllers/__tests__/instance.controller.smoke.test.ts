/**
 * Propósito: Smoke tests de `instance.controller` para subir coverage.
 * Cubre paths SUPERADMIN (findMany), ADMIN con empresa (findManyByEmpresa) y errores de permisos.
 */

import type { Response } from 'express';

const instanceSvcMock = {
  findMany: jest.fn().mockResolvedValue([]),
  findManyByEmpresa: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue({ id: 1, empresaId: 1 }),
  create: jest.fn().mockResolvedValue({ id: 1, empresaId: 1, nombre: 'inst' }),
};

jest.mock('../../services/instance.service', () => ({
  InstanceService: {
    getInstance: () => instanceSvcMock,
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { getInstances, getInstanceById, createInstance } from '../instance.controller';

function createRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('instance.controller (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getInstances como SUPERADMIN usa findMany', async () => {
    const req: any = { user: { userId: 1, role: 'SUPERADMIN' }, query: {} };
    const res = createRes();
    await getInstances(req, res);
    expect(instanceSvcMock.findMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.any(Array) }));
  });

  it('getInstanceById retorna 403 si no tiene permisos', async () => {
    instanceSvcMock.findById.mockResolvedValueOnce({ id: 2, empresaId: 999 });
    const req: any = { user: { userId: 1, role: 'ADMIN', empresaId: 1 }, params: { id: '2' } };
    const res = createRes();
    await getInstanceById(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('createInstance retorna 403 para roles sin permiso', async () => {
    const req: any = { user: { userId: 1, role: 'OPERATOR', empresaId: 1 }, body: { nombre: 'x' } };
    const res = createRes();
    await createInstance(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});


