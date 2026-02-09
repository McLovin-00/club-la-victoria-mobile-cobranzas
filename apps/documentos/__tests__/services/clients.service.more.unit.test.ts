import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

import { ClientsService } from '../../src/services/clients.service';

describe('ClientsService additional coverage', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('list omite el filtro activo cuando no se provee', async () => {
    prismaMock.cliente.findMany.mockResolvedValueOnce([{ id: 1 }]);

    await ClientsService.list(5);

    expect(prismaMock.cliente.findMany).toHaveBeenCalledWith({
      where: { tenantEmpresaId: 5 },
      orderBy: { razonSocial: 'asc' },
    });
  });

  it('create no crea requisitos cuando no hay templates activos', async () => {
    prismaMock.$transaction.mockImplementation(async (fn) => {
      console.log('Transaction mock called');
      const result = await fn(prismaMock);
      console.log('Transaction result:', result);
      return result;
    });

    prismaMock.cliente.create.mockResolvedValueOnce({ id: 12 });
    prismaMock.documentTemplate.findMany.mockResolvedValueOnce([]);

    const cliente = await ClientsService.create({ tenantEmpresaId: 1, razonSocial: 'ACME', cuit: '30' });

    expect(cliente).toBeDefined();
    expect(cliente.id).toBe(12);
    expect(prismaMock.clienteDocumentRequirement.createMany).not.toHaveBeenCalled();
  });

  it('update siempre asegura tenantEmpresaId', async () => {
    prismaMock.cliente.update.mockResolvedValueOnce({ id: 3 });

    await ClientsService.update(9, 3, { razonSocial: 'Nuevo' });

    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { razonSocial: 'Nuevo', tenantEmpresaId: 9 },
    });
  });

  it('addRequirement aplica defaults cuando no se proveen', async () => {
    prismaMock.clienteDocumentRequirement.create.mockResolvedValueOnce({ id: 7 });

    await ClientsService.addRequirement(2, 4, { templateId: 10, entityType: 'CHOFER' });

    expect(prismaMock.clienteDocumentRequirement.create).toHaveBeenCalledWith({
      data: {
        tenantEmpresaId: 2,
        clienteId: 4,
        templateId: 10,
        entityType: 'CHOFER',
        obligatorio: true,
        diasAnticipacion: 0,
        visibleChofer: true,
      },
    });
  });

  it('listRequirements incluye template y ordena por entidad', async () => {
    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([]);

    await ClientsService.listRequirements(1, 2);

    expect(prismaMock.clienteDocumentRequirement.findMany).toHaveBeenCalledWith({
      where: { tenantEmpresaId: 1, clienteId: 2 },
      include: { template: true },
      orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
    });
  });

  it('removeRequirement borra por id', async () => {
    prismaMock.clienteDocumentRequirement.delete.mockResolvedValueOnce({ id: 5 });

    await ClientsService.removeRequirement(1, 2, 5);

    expect(prismaMock.clienteDocumentRequirement.delete).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });

  it('getConsolidatedTemplates omite entityType no soportado en el agrupado', async () => {
    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
      {
        tenantEmpresaId: 1,
        clienteId: 1,
        templateId: 77,
        entityType: 'OTRO',
        obligatorio: true,
        diasAnticipacion: 3,
        template: { name: 'Otro' },
        cliente: { razonSocial: 'Cliente X' },
      },
    ]);

    const result = await ClientsService.getConsolidatedTemplates(1, [1]);

    expect(result.templates).toHaveLength(1);
    expect(result.byEntityType.CHOFER).toHaveLength(0);
    expect(result.byEntityType.CAMION).toHaveLength(0);
  });

  it('getMissingDocumentsForNewClient usa fallback de cliente y OR undefined', async () => {
    prismaMock.clienteDocumentRequirement.findMany
      .mockResolvedValueOnce([
        { templateId: 1, entityType: 'CHOFER', obligatorio: true, template: { name: 'Licencia' } },
      ])
      .mockResolvedValueOnce([]);

    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 3,
      tenantEmpresaId: 9,
      dadorCargaId: 11,
      driverId: 0,
      truckId: 0,
      trailerId: null,
      empresaTransportistaId: null,
    });

    prismaMock.cliente.findUnique.mockResolvedValueOnce(null);
    prismaMock.document.findMany.mockResolvedValueOnce([]);

    const result = await ClientsService.getMissingDocumentsForNewClient(9, 3, 44, [12]);

    expect(prismaMock.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: undefined,
        }),
      })
    );
    expect(result.newClientName).toBe('Cliente 44');
    expect(result.missingTemplates[0].isNewRequirement).toBe(true);
  });
});
