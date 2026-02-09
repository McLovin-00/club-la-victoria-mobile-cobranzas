/**
 * Tests reales para instance.controller.ts
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const instanceSvc = {
  findMany: jest.fn(),
  findManyByEmpresa: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn(),
  changeEstado: jest.fn(),
  validateEmpresaAccess: jest.fn(),
};
jest.mock('../../services/instance.service', () => ({
  InstanceService: { getInstance: () => instanceSvc },
}));

import * as controller from '../instance.controller';

describe('instance.controller (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getInstances branches by role', async () => {
    instanceSvc.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res1 = createMockRes();
    await controller.getInstances({ user: { userId: 1, role: 'SUPERADMIN' }, query: { limit: '50', offset: '0' } } as any, res1 as any);
    expect(instanceSvc.findMany).toHaveBeenCalled();
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    instanceSvc.findManyByEmpresa.mockResolvedValueOnce([{ id: 2 }]);
    const res2 = createMockRes();
    await controller.getInstances({ user: { userId: 1, role: 'ADMIN', empresaId: 10 }, query: { limit: '50', offset: '0' } } as any, res2 as any);
    expect(instanceSvc.findManyByEmpresa).toHaveBeenCalledWith(10, expect.any(Object));

    const res3 = createMockRes();
    await controller.getInstances({ user: { userId: 1, role: 'OPERATOR' }, query: { limit: '50', offset: '0' } } as any, res3 as any);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
  });

  it('getInstanceById 404, 403, 200', async () => {
    instanceSvc.findById.mockResolvedValueOnce(null);
    const res0 = createMockRes();
    await controller.getInstanceById({ params: { id: '1' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(404);

    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 2 });
    const res1 = createMockRes();
    await controller.getInstanceById({ params: { id: '1' }, user: { userId: 1, role: 'ADMIN', empresaId: 1 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(403);

    instanceSvc.findById.mockResolvedValueOnce({ id: 1, empresaId: 2 });
    const res2 = createMockRes();
    await controller.getInstanceById({ params: { id: '1' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalled();
  });

  it('createInstance permission/empresaId logic and error mapping', async () => {
    const res0 = createMockRes();
    await controller.createInstance({ body: { nombre: 'x', serviceId: 1 }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    const res1 = createMockRes();
    await controller.createInstance({ body: { nombre: 'x', serviceId: 1, empresaId: 2 }, user: { userId: 1, role: 'OPERATOR', empresaId: 2 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(403);

    instanceSvc.create.mockResolvedValueOnce({ id: 9, nombre: 'x' });
    const res2 = createMockRes();
    await controller.createInstance({ body: { nombre: 'x', serviceId: 1, empresaId: 999 }, user: { userId: 1, role: 'ADMIN', empresaId: 2 } } as any, res2 as any);
    expect(instanceSvc.create).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 2 }));
    expect(res2.status).toHaveBeenCalledWith(201);

    instanceSvc.create.mockRejectedValueOnce(new Error('Ya existe una instancia con este nombre'));
    const res3 = createMockRes();
    await controller.createInstance({ body: { nombre: 'x', serviceId: 1, empresaId: 2 }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(400);
  });

  it('update/delete/changeEstado validate access for ADMIN and enforce permissions', async () => {
    instanceSvc.validateEmpresaAccess.mockResolvedValueOnce(false);
    const res0 = createMockRes();
    await controller.updateInstance({ params: { id: '1' }, body: {}, user: { userId: 1, role: 'ADMIN', empresaId: 2 } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(403);

    instanceSvc.validateEmpresaAccess.mockResolvedValueOnce(true);
    instanceSvc.update.mockResolvedValueOnce({ id: 1 });
    const res1 = createMockRes();
    await controller.updateInstance({ params: { id: '1' }, body: { nombre: 'n' }, user: { userId: 1, role: 'ADMIN', empresaId: 2 } } as any, res1 as any);
    expect(res1.json).toHaveBeenCalled();

    instanceSvc.validateEmpresaAccess.mockResolvedValueOnce(true);
    instanceSvc.delete.mockResolvedValueOnce(undefined);
    const res2 = createMockRes();
    await controller.deleteInstance({ params: { id: '1' }, user: { userId: 1, role: 'ADMIN', empresaId: 2 } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(204);

    const res3 = createMockRes();
    await controller.changeInstanceEstado({ params: { id: '1' }, body: { estado: 'activa' }, user: { userId: 1, role: 'OPERATOR', empresaId: 2 } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(403);
  });

  it('getInstanceStats returns default when no empresa', async () => {
    const res0 = createMockRes();
    await controller.getInstanceStats({ user: { userId: 1, role: 'OPERATOR' } } as any, res0 as any);
    expect(res0.json).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));

    instanceSvc.getStats.mockResolvedValueOnce({ total: 1 });
    const res1 = createMockRes();
    await controller.getInstanceStats({ user: { userId: 1, role: 'SUPERADMIN' } } as any, res1 as any);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
  });
});


