/**
 * Tests reales de servicios core con mayor impacto en cobertura:
 * - EmpresaService
 * - ServiceService
 * - InstanceService
 * @jest-environment node
 */

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logDatabaseOperation: jest.fn(),
    logError: jest.fn(),
  },
}));

const prisma = {
  empresa: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  instance: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../config/prisma', () => ({
  prisma,
  prismaService: { getClient: () => prisma, checkConnection: jest.fn(async () => true) },
}));

import { EmpresaService } from '../empresa.service';
import { ServiceService } from '../service.service';
import { InstanceService } from '../instance.service';

describe('EmpresaService (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('static findAllSimple / findAll', async () => {
    prisma.empresa.findMany.mockResolvedValue([{ id: 1, nombre: 'A' }]);
    const s1 = await EmpresaService.findAllSimple();
    const s2 = await EmpresaService.findAll();
    expect(s1[0].id).toBe(1);
    expect((s2 as any)[0].nombre).toBe('A');
  });

  it('search returns page from offset/limit', async () => {
    const svc = EmpresaService.getInstance();
    prisma.empresa.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.empresa.count.mockResolvedValue(11);
    const out = await svc.search({ search: 'x', limit: 10, offset: 10 });
    expect(out.page).toBe(2);
    expect(out.total).toBe(11);
  });

  it('existsByName uses excludeId when provided', async () => {
    const svc = EmpresaService.getInstance();
    prisma.empresa.findFirst.mockResolvedValue({ id: 2 });
    const out = await svc.existsByName('A', 1);
    expect(out).toBe(true);
    expect(prisma.empresa.findFirst).toHaveBeenCalledWith({ where: { nombre: 'A', id: { not: 1 } } });
  });

  it('getStats computes recentlyCreated', async () => {
    const svc = EmpresaService.getInstance();
    prisma.empresa.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    const out = await svc.getStats();
    expect(out.total).toBe(5);
    expect(out.recentlyCreated).toBe(2);
  });

  it('findMany/count with search + CRUD paths', async () => {
    const svc = EmpresaService.getInstance();
    prisma.empresa.findMany.mockResolvedValueOnce([{ id: 1, nombre: 'A' }]);
    const list = await svc.findMany({ search: 'a', limit: 5, offset: 0 });
    expect(list.length).toBe(1);
    expect(prisma.empresa.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));

    prisma.empresa.count.mockResolvedValueOnce(7);
    const c = await svc.count({ search: 'a' });
    expect(c).toBe(7);

    prisma.empresa.findUnique.mockResolvedValueOnce({ id: 1 });
    expect((await svc.findById(1))?.id).toBe(1);

    prisma.empresa.create.mockResolvedValueOnce({ id: 2, nombre: 'B' });
    const created = await svc.create({ nombre: 'B' });
    expect(created.id).toBe(2);

    prisma.empresa.update.mockResolvedValueOnce({ id: 2, nombre: 'C' });
    const updated = await svc.update(2, { nombre: 'C', descripcion: 'd' });
    expect(updated.id).toBe(2);

    prisma.empresa.delete.mockResolvedValueOnce({});
    await svc.delete(2);
    expect(prisma.empresa.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});

describe('ServiceService (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create uses defaults and returns entity', async () => {
    const svc = ServiceService.getInstance();
    prisma.service.create.mockResolvedValue({ id: 1, nombre: 'S', estado: 'activo', _count: { instances: 0 } });
    const out = await (svc as any).create({ nombre: 'S' });
    expect(out.id).toBe(1);
    expect(prisma.service.create).toHaveBeenCalled();
  });

  it('deleteImplementation throws when service has instances', async () => {
    const svc = ServiceService.getInstance();
    prisma.instance.count.mockResolvedValue(2);
    await expect((svc as any).delete(1)).rejects.toThrow('No se puede eliminar el servicio');
  });

  it('findByNombre returns service', async () => {
    const svc = ServiceService.getInstance();
    prisma.service.findUnique.mockResolvedValue({ id: 1, nombre: 'S', _count: { instances: 0 } });
    const out = await svc.findByNombre('S');
    expect(out?.id).toBe(1);
  });

  it('findAllSimple returns active list', async () => {
    const svc = ServiceService.getInstance();
    prisma.service.findMany.mockResolvedValue([{ id: 1, nombre: 'S' }]);
    const out = await svc.findAllSimple();
    expect(out[0].nombre).toBe('S');
  });

  it('getStats computes counts', async () => {
    const svc = ServiceService.getInstance();
    prisma.service.count.mockResolvedValue(3);
    prisma.service.findMany.mockResolvedValue([
      { estado: 'activo', _count: { instances: 2 } },
      { estado: 'inactivo', _count: { instances: 0 } },
      { estado: 'mantenimiento', _count: { instances: 1 } },
    ]);
    const out = await svc.getStats();
    expect(out.total).toBe(3);
    expect(out.activos).toBe(1);
    expect(out.withInstances).toBe(2);
    expect(out.averageInstancesPerService).toBeCloseTo(1);
  });

  it('findMany/count with filters and findByEstado/changeEstado paths', async () => {
    const svc = ServiceService.getInstance();

    prisma.service.findMany.mockResolvedValueOnce([{ id: 1, nombre: 'S', estado: 'activo', _count: { instances: 0 } }]);
    const list = await svc.findMany({ search: 'x', estado: 'activo' as any, limit: 10, offset: 0 });
    expect(list.length).toBe(1);
    const call = prisma.service.findMany.mock.calls[0][0];
    expect(call.where).toBeDefined();

    prisma.service.count.mockResolvedValueOnce(2);
    expect(await svc.count({ search: 'x', estado: 'activo' as any })).toBe(2);

    prisma.service.findMany.mockResolvedValueOnce([{ id: 2, estado: 'inactivo', _count: { instances: 0 } }]);
    const by = await svc.findByEstado('inactivo' as any);
    expect(by[0].id).toBe(2);

    prisma.service.findUnique.mockResolvedValueOnce({ id: 10, nombre: 'N', estado: 'activo', _count: { instances: 0 } });
    const one = await svc.findById(10);
    expect(one?.id).toBe(10);

    prisma.service.update.mockResolvedValueOnce({ id: 10, nombre: 'N', estado: 'mantenimiento', _count: { instances: 0 } });
    const changed = await svc.changeEstado(10, 'mantenimiento' as any);
    expect(changed.id).toBe(10);
  });

  it('delete succeeds when no instances', async () => {
    const svc = ServiceService.getInstance();
    prisma.instance.count.mockResolvedValueOnce(0);
    prisma.service.delete.mockResolvedValueOnce({});
    await svc.delete(1);
    expect(prisma.service.delete).toHaveBeenCalled();
  });
});

describe('InstanceService (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create throws when service missing/inactive or empresa missing', async () => {
    const svc = InstanceService.getInstance();
    prisma.service.findUnique.mockResolvedValueOnce(null);
    await expect((svc as any).create({ nombre: 'I', serviceId: 1, empresaId: 1 })).rejects.toThrow('servicio especificado no existe');

    prisma.service.findUnique.mockResolvedValueOnce({ id: 1, estado: 'inactivo' });
    await expect((svc as any).create({ nombre: 'I', serviceId: 1, empresaId: 1 })).rejects.toThrow('no está activo');

    prisma.service.findUnique.mockResolvedValueOnce({ id: 1, estado: 'activo' });
    prisma.empresa.findUnique.mockResolvedValueOnce(null);
    await expect((svc as any).create({ nombre: 'I', serviceId: 1, empresaId: 1 })).rejects.toThrow('empresa especificada no existe');
  });

  it('create throws on duplicate name and succeeds otherwise', async () => {
    const svc = InstanceService.getInstance();
    prisma.service.findUnique.mockResolvedValue({ id: 1, estado: 'activo' });
    prisma.empresa.findUnique.mockResolvedValue({ id: 1 });
    prisma.instance.findFirst.mockResolvedValueOnce({ id: 9 });
    await expect((svc as any).create({ nombre: 'I', serviceId: 1, empresaId: 1 })).rejects.toThrow('Ya existe una instancia');

    prisma.instance.findFirst.mockResolvedValueOnce(null);
    prisma.instance.create.mockResolvedValue({ id: 10, nombre: 'I', serviceId: 1, empresaId: 1, estado: 'activa', requierePermisos: true });
    const out = await (svc as any).create({ nombre: 'I', serviceId: 1, empresaId: 1 });
    expect(out.id).toBe(10);
  });

  it('update throws when instance missing / name conflict / service invalid; succeeds', async () => {
    const svc = InstanceService.getInstance();
    prisma.instance.findUnique.mockResolvedValueOnce(null);
    await expect((svc as any).update(1, { nombre: 'X' })).rejects.toThrow('no existe');

    prisma.instance.findUnique.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.instance.findFirst.mockResolvedValueOnce({ id: 2 });
    await expect((svc as any).update(1, { nombre: 'X' })).rejects.toThrow('Ya existe una instancia');

    prisma.instance.findUnique.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.instance.findFirst.mockResolvedValueOnce(null);
    prisma.service.findUnique.mockResolvedValueOnce(null);
    await expect((svc as any).update(1, { serviceId: 2 })).rejects.toThrow('servicio especificado no existe');

    prisma.instance.findUnique.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.service.findUnique.mockResolvedValueOnce({ id: 2, estado: 'inactivo' });
    await expect((svc as any).update(1, { serviceId: 2 })).rejects.toThrow('no está activo');

    prisma.instance.findUnique.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.service.findUnique.mockResolvedValueOnce({ id: 2, estado: 'activo' });
    prisma.instance.update.mockResolvedValueOnce({ id: 1, nombre: 'N' });
    const out = await (svc as any).update(1, { serviceId: 2, nombre: 'N', configuracion: { a: 1 } });
    expect(out.id).toBe(1);
  });

  it('getStats groups by service and validateEmpresaAccess returns true/false', async () => {
    const svc = InstanceService.getInstance();
    prisma.instance.count.mockResolvedValue(3);
    prisma.instance.findMany.mockResolvedValue([
      { id: 1, estado: 'activa', serviceId: 1, service: { nombre: 'S1' } },
      { id: 2, estado: 'inactiva', serviceId: 1, service: { nombre: 'S1' } },
      { id: 3, estado: 'error', serviceId: 2, service: { nombre: 'S2' } },
    ]);
    const stats = await svc.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byService.length).toBe(2);

    prisma.instance.findUnique.mockResolvedValueOnce({ empresaId: 10 });
    expect(await svc.validateEmpresaAccess(1, 10)).toBe(true);
    prisma.instance.findUnique.mockRejectedValueOnce(new Error('x'));
    expect(await svc.validateEmpresaAccess(1, 10)).toBe(false);
  });

  it('findMany/count with filters', async () => {
    const svc = InstanceService.getInstance();
    prisma.instance.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const list = await svc.findMany({ search: 'x', serviceId: 1, empresaId: 2, estado: 'activa' as any, limit: 10, offset: 0 } as any);
    expect(list.length).toBe(1);
    expect(prisma.instance.findMany).toHaveBeenCalled();

    prisma.instance.count.mockResolvedValueOnce(5);
    expect(await svc.count({ empresaId: 2 } as any)).toBe(5);

    prisma.instance.findMany.mockResolvedValueOnce([{ id: 2 }]);
    const list2 = await svc.findManyByEmpresa(2, { search: 'x', limit: 10, offset: 0 } as any);
    expect(list2[0].id).toBe(2);
  });

  it('delete: throws when missing, otherwise deletes', async () => {
    const svc = InstanceService.getInstance();
    prisma.instance.findUnique.mockResolvedValueOnce(null);
    await expect(svc.delete(1)).rejects.toThrow('no existe');

    prisma.instance.findUnique.mockResolvedValueOnce({ id: 1 });
    prisma.instance.delete.mockResolvedValueOnce({});
    await svc.delete(1);
    expect(prisma.instance.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('findByService/findByEstado success and error path', async () => {
    const svc = InstanceService.getInstance();
    prisma.instance.findMany.mockResolvedValueOnce([{ id: 1, serviceId: 1 }]);
    const a = await svc.findByService(1);
    expect(a.length).toBe(1);

    prisma.instance.findMany.mockResolvedValueOnce([{ id: 2, estado: 'activa', serviceId: 1 }]);
    const b = await svc.findByEstado('activa' as any, 1);
    expect(b.length).toBe(1);

    prisma.instance.findMany.mockRejectedValueOnce(new Error('x'));
    await expect(svc.findByService(1)).rejects.toThrow();
  });

  it('changeEstado uses update', async () => {
    const svc = InstanceService.getInstance();
    prisma.instance.findUnique.mockResolvedValueOnce({ id: 1, empresaId: 1 });
    prisma.instance.update.mockResolvedValueOnce({ id: 1, estado: 'inactiva' });
    const out = await svc.changeEstado(1, 'inactiva' as any);
    expect(out.id).toBe(1);
  });
});


