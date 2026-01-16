/**
 * Tests reales para service.controller.ts
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const serviceService = {
  findMany: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAllSimple: jest.fn(),
  getStats: jest.fn(),
  changeEstado: jest.fn(),
};

jest.mock('../../services/service.service', () => ({
  ServiceService: {
    getInstance: () => serviceService,
  },
}));

import * as controller from '../service.controller';

describe('service.controller (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getServices returns list or 500', async () => {
    serviceService.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res = createMockRes();
    await controller.getServices({ user: { userId: 1, role: 'ADMIN' }, query: { limit: '50', offset: '0' }, tenantId: null } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);

    serviceService.findMany.mockRejectedValueOnce(new Error('x'));
    const res2 = createMockRes();
    await controller.getServices({ user: { userId: 1, role: 'ADMIN' }, query: { limit: '50', offset: '0' }, tenantId: null } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it('getServiceById returns 404 when missing', async () => {
    serviceService.findById.mockResolvedValueOnce(null);
    const res = createMockRes();
    await controller.getServiceById({ params: { id: '1' }, user: { userId: 1 } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getServiceById returns service when found', async () => {
    serviceService.findById.mockResolvedValueOnce({ id: 2, nombre: 'S' });
    const res = createMockRes();
    await controller.getServiceById({ params: { id: '2' }, user: { userId: 1 } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith({ id: 2, nombre: 'S' });
  });

  it('create/update/delete enforce SUPERADMIN and handle unique constraint', async () => {
    const res0 = createMockRes();
    await controller.createService({ body: {}, user: { userId: 1, role: 'ADMIN' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(403);

    serviceService.create.mockResolvedValueOnce({ id: 1, nombre: 'S' });
    const res1 = createMockRes();
    await controller.createService({ body: { nombre: 'S' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(201);

    serviceService.create.mockRejectedValueOnce(new Error('unique constraint'));
    const res1b = createMockRes();
    await controller.createService({ body: { nombre: 'S' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res1b as any);
    expect(res1b.status).toHaveBeenCalledWith(400);

    const res2 = createMockRes();
    await controller.updateService({ params: { id: '1' }, body: {}, user: { userId: 1, role: 'ADMIN' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(403);

    serviceService.update.mockResolvedValueOnce({ id: 1 });
    const res3 = createMockRes();
    await controller.updateService({ params: { id: '1' }, body: {}, user: { userId: 1, role: 'SUPERADMIN' } } as any, res3 as any);
    expect(res3.json).toHaveBeenCalled();

    serviceService.delete.mockResolvedValueOnce(undefined);
    const res4 = createMockRes();
    await controller.deleteService({ params: { id: '1' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res4 as any);
    expect(res4.status).toHaveBeenCalledWith(204);
    expect(res4.send).toHaveBeenCalled();
  });

  it('createService returns 500 on unexpected error', async () => {
    serviceService.create.mockRejectedValueOnce(new Error('boom'));
    const res = createMockRes();
    await controller.createService({ body: { nombre: 'S' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('updateService handles unique constraint and generic errors', async () => {
    serviceService.update.mockRejectedValueOnce(new Error('unique constraint'));
    const res1 = createMockRes();
    await controller.updateService({ params: { id: '1' }, body: {}, user: { userId: 1, role: 'SUPERADMIN' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(400);

    serviceService.update.mockRejectedValueOnce(new Error('boom'));
    const res2 = createMockRes();
    await controller.updateService({ params: { id: '2' }, body: {}, user: { userId: 1, role: 'SUPERADMIN' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it('deleteService handles forbidden and error branches', async () => {
    const res0 = createMockRes();
    await controller.deleteService({ params: { id: '1' }, user: { userId: 1, role: 'ADMIN' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(403);

    serviceService.delete.mockRejectedValueOnce(new Error('instancias asociadas'));
    const res1 = createMockRes();
    await controller.deleteService({ params: { id: '2' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(400);
    expect(res1.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'instancias asociadas' })
    );

    serviceService.delete.mockRejectedValueOnce(new Error('boom'));
    const res2 = createMockRes();
    await controller.deleteService({ params: { id: '3' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it('getServicesSimple/getServiceStats/changeServiceEstado use serviceService methods', async () => {
    serviceService.findAllSimple.mockResolvedValueOnce([{ id: 1, nombre: 'S' }]);
    const res1 = createMockRes();
    await controller.getServicesSimple({ user: { userId: 1, role: 'ADMIN' } } as any, res1 as any);
    expect(res1.json).toHaveBeenCalledWith([{ id: 1, nombre: 'S' }]);

    serviceService.getStats.mockResolvedValueOnce({ total: 1 });
    const res2 = createMockRes();
    await controller.getServiceStats({ user: { userId: 1, role: 'ADMIN' } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));

    serviceService.changeEstado.mockResolvedValueOnce({ id: 1 });
    const res3 = createMockRes();
    await controller.changeServiceEstado({ params: { id: '1' }, body: { estado: 'activo' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res3 as any);
    expect(res3.json).toHaveBeenCalled();
  });

  it('getServicesSimple/getServiceStats/changeServiceEstado handle errors and forbidden', async () => {
    serviceService.findAllSimple.mockRejectedValueOnce(new Error('boom'));
    const res1 = createMockRes();
    await controller.getServicesSimple({ user: { userId: 1, role: 'ADMIN' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(500);

    serviceService.getStats.mockRejectedValueOnce(new Error('boom'));
    const res2 = createMockRes();
    await controller.getServiceStats({ user: { userId: 1, role: 'ADMIN' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(500);

    const res3 = createMockRes();
    await controller.changeServiceEstado({ params: { id: '1' }, body: { estado: 'inactivo' }, user: { userId: 1, role: 'ADMIN' } } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(403);

    serviceService.changeEstado.mockRejectedValueOnce(new Error('boom'));
    const res4 = createMockRes();
    await controller.changeServiceEstado({ params: { id: '2' }, body: { estado: 'activo' }, user: { userId: 1, role: 'SUPERADMIN' } } as any, res4 as any);
    expect(res4.status).toHaveBeenCalledWith(500);
  });
});


