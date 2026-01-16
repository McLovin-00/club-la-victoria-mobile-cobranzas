import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

import { ClientsService } from '../../src/services/clients.service';

describe('ClientsService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    });
  });

  it('list proxies to prisma.cliente.findMany', async () => {
    prismaMock.cliente.findMany.mockResolvedValueOnce([{ id: 1 }] as any);
    const out = await ClientsService.list(1, true);
    expect(out).toHaveLength(1);
    expect(prismaMock.cliente.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantEmpresaId: 1, activo: true }) }));
  });

  it('create creates cliente and auto-requirements from active templates', async () => {
    prismaMock.cliente.create.mockResolvedValueOnce({ id: 10 } as any);
    prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
      { id: 1, entityType: 'CHOFER', active: true, name: 'T1' },
      { id: 2, entityType: 'CAMION', active: true, name: 'T2' },
    ] as any);
    prismaMock.clienteDocumentRequirement.createMany.mockResolvedValueOnce({ count: 2 } as any);

    const out = await ClientsService.create({ tenantEmpresaId: 1, razonSocial: 'C', cuit: '30', activo: true });
    expect(out.id).toBe(10);
    expect(prismaMock.clienteDocumentRequirement.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Array) }));
  });

  it('remove deletes requirements + equipoCliente and then cliente', async () => {
    prismaMock.clienteDocumentRequirement.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.equipoCliente.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.cliente.delete.mockResolvedValueOnce({ id: 1 } as any);
    const out = await ClientsService.remove(1, 1);
    expect(out.id).toBe(1);
  });

  it('getConsolidatedTemplates returns empty for no clientes and consolidates when there are conflicts', async () => {
    await expect(ClientsService.getConsolidatedTemplates(1, [])).resolves.toEqual({ templates: [], byEntityType: {} });

    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
      { tenantEmpresaId: 1, clienteId: 1, templateId: 1, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5, template: { name: 'T1' }, cliente: { razonSocial: 'C1' } },
      { tenantEmpresaId: 1, clienteId: 2, templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10, template: { name: 'T1' }, cliente: { razonSocial: 'C2' } },
    ] as any);

    const out = await ClientsService.getConsolidatedTemplates(1, [1, 2]);
    expect(out.templates).toHaveLength(1);
    expect(out.templates[0].obligatorio).toBe(true);
    expect(out.templates[0].diasAnticipacion).toBe(10);
    expect(out.byEntityType.CHOFER).toHaveLength(1);
  });

  it('getMissingDocumentsForNewClient returns empty when equipo missing; otherwise returns missingTemplates with isNewRequirement', async () => {
    prismaMock.clienteDocumentRequirement.findMany
      .mockResolvedValueOnce([] as any) // newClientReqs (for out1)
      .mockResolvedValueOnce([] as any); // existingReqs (for out1)
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    const out1 = await ClientsService.getMissingDocumentsForNewClient(1, 1, 2, [3]);
    expect(out1.missingTemplates).toEqual([]);

    prismaMock.clienteDocumentRequirement.findMany
      .mockResolvedValueOnce([
        { templateId: 1, entityType: 'CHOFER', obligatorio: true, template: { name: 'T1' } },
        { templateId: 2, entityType: 'CAMION', obligatorio: true, template: { name: 'T2' } },
      ] as any)
      .mockResolvedValueOnce([
        { templateId: 1, entityType: 'CHOFER' }, // already required by existing clients
      ] as any);

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 1, driverId: 10, truckId: 20, trailerId: null, empresaTransportistaId: null } as any);
    prismaMock.cliente.findUnique.mockResolvedValueOnce({ razonSocial: 'Nuevo' } as any);

    prismaMock.document.findMany.mockResolvedValueOnce([
      { templateId: 1, entityType: 'CHOFER' }, // already loaded
    ] as any);

    const out2 = await ClientsService.getMissingDocumentsForNewClient(1, 1, 2, [3]);
    expect(out2.newClientName).toBe('Nuevo');
    expect(out2.missingTemplates).toHaveLength(1);
    expect(out2.missingTemplates[0].templateId).toBe(2);
    expect(out2.missingTemplates[0].isNewRequirement).toBe(true);
  });
});


