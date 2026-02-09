/**
 * Tests reales para empresa.controller.ts
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const empresaSvc = {
  findMany: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
};

jest.mock('../../services/empresa.service', () => ({
  EmpresaService: {
    getInstance: () => empresaSvc,
  },
}));

import * as controller from '../empresa.controller';

describe('empresa.controller (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAllEmpresas + simple', async () => {
    empresaSvc.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res1 = createMockRes();
    await controller.getAllEmpresas({ query: {}, platformUser: { userId: 1, role: 'SUPERADMIN' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);

    const res2 = createMockRes();
    empresaSvc.findMany.mockResolvedValueOnce([{ id: 1 }]);
    await controller.getAllEmpresasSimple({} as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(200);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [{ id: 1 }] }));
  });

  it('getEmpresaById 404 when missing', async () => {
    empresaSvc.findById.mockResolvedValueOnce(null);
    const res = createMockRes();
    await controller.getEmpresaById({ params: { id: '1' }, platformUser: { userId: 1, role: 'SUPERADMIN' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('create/update/delete and stats', async () => {
    empresaSvc.create.mockResolvedValueOnce({ id: 1 });
    const res1 = createMockRes();
    await controller.createEmpresa({ body: { nombre: 'A' }, platformUser: { userId: 1, role: 'SUPERADMIN' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(201);

    empresaSvc.update.mockResolvedValueOnce({ id: 1 });
    const res2 = createMockRes();
    await controller.updateEmpresa({ params: { id: '1' }, body: { nombre: 'B' }, platformUser: { userId: 1, role: 'SUPERADMIN' } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalled();

    empresaSvc.delete.mockResolvedValueOnce(undefined);
    const res3 = createMockRes();
    empresaSvc.findById.mockResolvedValueOnce({ id: 1 });
    await controller.deleteEmpresa({ params: { id: '1' }, platformUser: { userId: 1, role: 'SUPERADMIN' } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(200);

    empresaSvc.getStats.mockResolvedValueOnce({ total: 1 });
    const res4 = createMockRes();
    await controller.getEmpresaStats({ platformUser: { userId: 1, role: 'SUPERADMIN' } } as any, res4 as any);
    expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
  });
});


