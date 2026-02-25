/**
 * Coverage tests for ClientsService
 * Covers: list, create, update, remove, addRequirement, listRequirements,
 *         removeRequirement, getConsolidatedTemplates, getMissingDocumentsForNewClient
 * + mergeRequirement helper: duplicate client, obligatorio, diasAnticipacion
 * + getOrCreateDefaultPlantilla
 * + entity clauses building, edge cases for null/undefined fields
 * @jest-environment node
 */

const mockPrisma: Record<string, any> = {
  cliente: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
  plantillaRequisito: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  plantillaRequisitoTemplate: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  equipoPlantillaRequisito: { deleteMany: jest.fn() },
  clienteDocumentRequirement: { deleteMany: jest.fn() },
  equipoCliente: { deleteMany: jest.fn() },
  equipo: { findUnique: jest.fn() },
  document: { findMany: jest.fn() },
  $transaction: jest.fn(),
};
mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma));

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { ClientsService } from '../src/services/clients.service';

describe('ClientsService (coverage)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── list ─────────────────────────────────────────────────────────────
  describe('list', () => {
    it('lists all clients for tenant', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([{ id: 1, razonSocial: 'A' }]);
      const result = await ClientsService.list(1);
      expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantEmpresaId: 1 } })
      );
      expect(result).toHaveLength(1);
    });

    it('filters by activo when provided', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([]);
      await ClientsService.list(1, true);
      expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantEmpresaId: 1, activo: true } })
      );
    });

    it('does not include activo filter when undefined', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([]);
      await ClientsService.list(1, undefined);
      const call = mockPrisma.cliente.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('activo');
    });

    it('filters by activo false', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([]);
      await ClientsService.list(1, false);
      expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantEmpresaId: 1, activo: false } })
      );
    });

    it('orders by razonSocial ascending', async () => {
      mockPrisma.cliente.findMany.mockResolvedValue([]);
      await ClientsService.list(1);
      expect(mockPrisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { razonSocial: 'asc' } })
      );
    });
  });

  // ── create ───────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates client and default plantilla', async () => {
      mockPrisma.cliente.create.mockResolvedValue({ id: 10, razonSocial: 'Test' });
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 100 });

      const result = await ClientsService.create({
        tenantEmpresaId: 1, razonSocial: 'Test', cuit: '20-12345678-9',
      });

      expect(result.id).toBe(10);
      expect(mockPrisma.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clienteId: 10,
            nombre: 'Requisitos Generales',
            activo: true,
          }),
        })
      );
    });

    it('passes optional fields', async () => {
      mockPrisma.cliente.create.mockResolvedValue({ id: 11 });
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 101 });

      await ClientsService.create({
        tenantEmpresaId: 1, razonSocial: 'Test', cuit: '20-0-9', activo: false, notas: 'note',
      });

      expect(mockPrisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ activo: false, notas: 'note' }),
      });
    });

    it('sets plantilla description on creation', async () => {
      mockPrisma.cliente.create.mockResolvedValue({ id: 12 });
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 102 });

      await ClientsService.create({
        tenantEmpresaId: 1, razonSocial: 'X', cuit: '20-0-0',
      });

      expect(mockPrisma.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            descripcion: expect.stringContaining('Plantilla de requisitos por defecto'),
          }),
        })
      );
    });
  });

  // ── update ───────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates client data', async () => {
      mockPrisma.cliente.update.mockResolvedValue({ id: 1, razonSocial: 'Updated' });
      const result = await ClientsService.update(1, 5, { razonSocial: 'Updated' });
      expect(mockPrisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { razonSocial: 'Updated', tenantEmpresaId: 1 },
      });
      expect(result.razonSocial).toBe('Updated');
    });

    it('updates with all optional fields', async () => {
      mockPrisma.cliente.update.mockResolvedValue({ id: 1 });
      await ClientsService.update(1, 5, { razonSocial: 'X', cuit: 'C', activo: true, notas: 'N' });
      expect(mockPrisma.cliente.update).toHaveBeenCalled();
    });

    it('updates with only cuit', async () => {
      mockPrisma.cliente.update.mockResolvedValue({ id: 5 });
      await ClientsService.update(2, 5, { cuit: '30-00000000-0' });
      expect(mockPrisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { cuit: '30-00000000-0', tenantEmpresaId: 2 },
      });
    });

    it('updates with activo only', async () => {
      mockPrisma.cliente.update.mockResolvedValue({ id: 5 });
      await ClientsService.update(1, 5, { activo: false });
      expect(mockPrisma.cliente.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { activo: false, tenantEmpresaId: 1 },
      });
    });
  });

  // ── remove ───────────────────────────────────────────────────────────
  describe('remove', () => {
    it('deletes client and related data', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([{ id: 100 }, { id: 101 }]);
      mockPrisma.equipoPlantillaRequisito.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.plantillaRequisito.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.clienteDocumentRequirement.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.cliente.delete.mockResolvedValue({ id: 5 });

      const result = await ClientsService.remove(1, 5);
      expect(result.id).toBe(5);
      expect(mockPrisma.equipoPlantillaRequisito.deleteMany).toHaveBeenCalledWith({
        where: { plantillaRequisitoId: { in: [100, 101] } },
      });
    });

    it('skips equipoPlantillaRequisito deletion when no plantillas exist', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.plantillaRequisito.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.clienteDocumentRequirement.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.cliente.delete.mockResolvedValue({ id: 5 });

      await ClientsService.remove(1, 5);
      expect(mockPrisma.equipoPlantillaRequisito.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes equipoCliente with equipo filter', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.plantillaRequisito.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.clienteDocumentRequirement.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.cliente.delete.mockResolvedValue({ id: 7 });

      await ClientsService.remove(2, 7);
      expect(mockPrisma.equipoCliente.deleteMany).toHaveBeenCalledWith({
        where: { clienteId: 7, equipo: { tenantEmpresaId: 2 } },
      });
    });

    it('deletes clienteDocumentRequirement legada', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([{ id: 50 }]);
      mockPrisma.equipoPlantillaRequisito.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.plantillaRequisito.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.clienteDocumentRequirement.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.equipoCliente.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.cliente.delete.mockResolvedValue({ id: 8 });

      await ClientsService.remove(1, 8);
      expect(mockPrisma.clienteDocumentRequirement.deleteMany).toHaveBeenCalledWith({
        where: { tenantEmpresaId: 1, clienteId: 8 },
      });
    });
  });

  // ── addRequirement (getOrCreateDefaultPlantilla) ─────────────────────
  describe('addRequirement (getOrCreateDefaultPlantilla)', () => {
    it('crea plantilla si no existe', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue(null);
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 1 });
      mockPrisma.plantillaRequisitoTemplate.create
        = jest.fn().mockResolvedValue({ id: 100, templateId: 10, entityType: 'CHOFER' });

      const result = await ClientsService.addRequirement(1, 50, {
        templateId: 10, entityType: 'CHOFER',
      });

      expect(mockPrisma.plantillaRequisito.create).toHaveBeenCalled();
      expect(result.templateId).toBe(10);
    });

    it('usa plantilla existente', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.plantillaRequisitoTemplate.create
        = jest.fn().mockResolvedValue({ id: 101, templateId: 20, entityType: 'CAMION' });

      const result = await ClientsService.addRequirement(1, 50, {
        templateId: 20, entityType: 'CAMION',
      });

      expect(mockPrisma.plantillaRequisito.create).not.toHaveBeenCalled();
      expect(result.templateId).toBe(20);
    });

    it('passes optional fields with defaults', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.plantillaRequisitoTemplate.create
        = jest.fn().mockResolvedValue({ id: 102 });

      await ClientsService.addRequirement(1, 50, {
        templateId: 30, entityType: 'ACOPLADO',
        obligatorio: false, diasAnticipacion: 15, visibleChofer: false,
      });

      expect(mockPrisma.plantillaRequisitoTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            obligatorio: false,
            diasAnticipacion: 15,
            visibleChofer: false,
          }),
        })
      );
    });

    it('uses default values for optional params', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.plantillaRequisitoTemplate.create
        = jest.fn().mockResolvedValue({ id: 103 });

      await ClientsService.addRequirement(1, 50, {
        templateId: 40, entityType: 'EMPRESA_TRANSPORTISTA',
      });

      expect(mockPrisma.plantillaRequisitoTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            obligatorio: true,
            diasAnticipacion: 0,
            visibleChofer: true,
          }),
        })
      );
    });

    it('includes template in result', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      mockPrisma.plantillaRequisitoTemplate.create
        = jest.fn().mockResolvedValue({ id: 104, template: { name: 'DNI' } });

      const result = await ClientsService.addRequirement(1, 50, {
        templateId: 10, entityType: 'CHOFER',
      });

      expect(mockPrisma.plantillaRequisitoTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({ include: { template: true } })
      );
      expect(result.template).toBeDefined();
    });

    it('creates plantilla with correct default name', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue(null);
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 99 });
      mockPrisma.plantillaRequisitoTemplate.create
        = jest.fn().mockResolvedValue({ id: 200 });

      await ClientsService.addRequirement(2, 30, {
        templateId: 10, entityType: 'CHOFER',
      });

      expect(mockPrisma.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantEmpresaId: 2,
            clienteId: 30,
            nombre: 'Requisitos Generales',
          }),
          select: { id: true },
        })
      );
    });
  });

  // ── listRequirements ─────────────────────────────────────────────────
  describe('listRequirements', () => {
    it('returns plantilla requisito templates for client', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { id: 1, templateId: 10, entityType: 'CHOFER', template: { name: 'DNI' } },
      ]);

      const result = await ClientsService.listRequirements(1, 50);
      expect(result).toHaveLength(1);
      expect(mockPrisma.plantillaRequisitoTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantEmpresaId: 1,
            plantillaRequisito: { clienteId: 50, activo: true },
          }),
        })
      );
    });

    it('returns empty array when no requirements exist', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);
      const result = await ClientsService.listRequirements(1, 99);
      expect(result).toEqual([]);
    });

    it('orders by entityType and templateId', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);
      await ClientsService.listRequirements(1, 50);
      expect(mockPrisma.plantillaRequisitoTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
        })
      );
    });
  });

  // ── removeRequirement ────────────────────────────────────────────────
  describe('removeRequirement', () => {
    it('deletes requirement by id', async () => {
      mockPrisma.plantillaRequisitoTemplate.delete.mockResolvedValue({ id: 200 });
      const result = await ClientsService.removeRequirement(1, 50, 200);
      expect(result.id).toBe(200);
      expect(mockPrisma.plantillaRequisitoTemplate.delete).toHaveBeenCalledWith({
        where: { id: 200 },
      });
    });

    it('ignores tenantEmpresaId and clienteId params', async () => {
      mockPrisma.plantillaRequisitoTemplate.delete.mockResolvedValue({ id: 300 });
      await ClientsService.removeRequirement(99, 88, 300);
      expect(mockPrisma.plantillaRequisitoTemplate.delete).toHaveBeenCalledWith({
        where: { id: 300 },
      });
    });
  });

  // ── getConsolidatedTemplates (mergeRequirement) ──────────────────────
  describe('getConsolidatedTemplates (mergeRequirement)', () => {
    it('retorna vacío si clienteIds vacío', async () => {
      const result = await ClientsService.getConsolidatedTemplates(1, []);
      expect(result.templates).toEqual([]);
      expect(result.byEntityType).toEqual({});
    });

    it('consolida requisitos de 2 clientes con mismo template', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 50, cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 10,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 60, cliente: { id: 60, razonSocial: 'Cliente B' } },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50, 60]);

      expect(result.templates).toHaveLength(1);
      const t = result.templates[0];
      expect(t.obligatorio).toBe(true);
      expect(t.diasAnticipacion).toBe(10);
      expect(t.clienteIds).toEqual([50, 60]);
      expect(t.clienteNames).toEqual(['Cliente A', 'Cliente B']);
    });

    it('no duplica clienteId si ya existe', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 50, cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 3,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 50, cliente: { id: 50, razonSocial: 'Cliente A' } },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50]);
      expect(result.templates[0].clienteIds).toEqual([50]);
    });

    it('agrupa por entityType', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 50, cliente: { id: 50, razonSocial: 'A' } },
        },
        {
          templateId: 20, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 5,
          template: { name: 'VTV' },
          plantillaRequisito: { clienteId: 50, cliente: { id: 50, razonSocial: 'A' } },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50]);

      expect(result.byEntityType.CHOFER).toHaveLength(1);
      expect(result.byEntityType.CAMION).toHaveLength(1);
      expect(result.byEntityType.EMPRESA_TRANSPORTISTA).toHaveLength(0);
      expect(result.byEntityType.ACOPLADO).toHaveLength(0);
    });

    it('handles missing template name and cliente razonSocial', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 0,
          template: null,
          plantillaRequisito: { clienteId: 50, cliente: null },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50]);
      expect(result.templates[0].templateName).toBe('Template 10');
      expect(result.templates[0].clienteNames[0]).toBe('Cliente 50');
    });

    it('keeps lower diasAnticipacion when new one is smaller', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 20,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 50, cliente: { razonSocial: 'A' } },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 5,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 60, cliente: { razonSocial: 'B' } },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50, 60]);
      expect(result.templates[0].diasAnticipacion).toBe(20);
    });

    it('handles unknown entityType in byEntityType grouping', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'DADOR', obligatorio: true, diasAnticipacion: 0,
          template: { name: 'T' },
          plantillaRequisito: { clienteId: 50, cliente: { razonSocial: 'A' } },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50]);
      expect(result.templates).toHaveLength(1);
      expect(result.byEntityType.CHOFER).toHaveLength(0);
    });

    it('does not override obligatorio from true to false', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 5,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 50, cliente: { razonSocial: 'A' } },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 3,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 60, cliente: { razonSocial: 'B' } },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50, 60]);
      expect(result.templates[0].obligatorio).toBe(true);
    });

    it('places templates in all four entity type buckets', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, diasAnticipacion: 0, template: { name: 'ARCA' }, plantillaRequisito: { clienteId: 1, cliente: { razonSocial: 'A' } } },
        { templateId: 2, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 0, template: { name: 'DNI' }, plantillaRequisito: { clienteId: 1, cliente: { razonSocial: 'A' } } },
        { templateId: 3, entityType: 'CAMION', obligatorio: true, diasAnticipacion: 0, template: { name: 'VTV' }, plantillaRequisito: { clienteId: 1, cliente: { razonSocial: 'A' } } },
        { templateId: 4, entityType: 'ACOPLADO', obligatorio: true, diasAnticipacion: 0, template: { name: 'RTO' }, plantillaRequisito: { clienteId: 1, cliente: { razonSocial: 'A' } } },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [1]);
      expect(result.byEntityType.EMPRESA_TRANSPORTISTA).toHaveLength(1);
      expect(result.byEntityType.CHOFER).toHaveLength(1);
      expect(result.byEntityType.CAMION).toHaveLength(1);
      expect(result.byEntityType.ACOPLADO).toHaveLength(1);
    });

    it('does not increase diasAnticipacion when equal', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 10,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 50, cliente: { razonSocial: 'A' } },
        },
        {
          templateId: 10, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 10,
          template: { name: 'DNI' },
          plantillaRequisito: { clienteId: 60, cliente: { razonSocial: 'B' } },
        },
      ]);

      const result = await ClientsService.getConsolidatedTemplates(1, [50, 60]);
      expect(result.templates[0].diasAnticipacion).toBe(10);
    });
  });

  // ── getMissingDocumentsForNewClient ───────────────────────────────────
  describe('getMissingDocumentsForNewClient', () => {
    it('returns empty when equipo not found', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates).toEqual([]);
      expect(result.newClientName).toBe('');
    });

    it('identifies missing documents for equipo with all entity types', async () => {
      const newClientReqs = [
        { templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'DNI' } },
        { templateId: 20, entityType: 'CAMION', obligatorio: true, template: { name: 'Seguro' } },
        { templateId: 30, entityType: 'ACOPLADO', obligatorio: false, template: { name: 'RTO' } },
        { templateId: 40, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, template: { name: 'ARCA' } },
      ];

      const existingReqs = [
        { templateId: 10, entityType: 'CHOFER' },
      ];

      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce(newClientReqs)
        .mockResolvedValueOnce(existingReqs);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: 3, empresaTransportistaId: 4,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'New Client' });

      mockPrisma.document.findMany.mockResolvedValue([
        { templateId: 10, entityType: 'CHOFER' },
      ]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, [60]);

      expect(result.newClientName).toBe('New Client');
      expect(result.missingTemplates).toHaveLength(3);
      const seguro = result.missingTemplates.find((t: any) => t.templateId === 20);
      expect(seguro?.isNewRequirement).toBe(true);
    });

    it('handles equipo without trailer and empresaTransportista', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'DNI' } }])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue(null);
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.newClientName).toBe('Cliente 50');
      expect(result.missingTemplates).toHaveLength(1);
    });

    it('marks template as not new when it exists in existing clients', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'DNI' } }])
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'CHOFER' }]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'Existing' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, [60]);
      expect(result.missingTemplates[0].isNewRequirement).toBe(false);
    });

    it('filters out already loaded documents', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          { templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'DNI' } },
          { templateId: 20, entityType: 'CHOFER', obligatorio: true, template: { name: 'Licencia' } },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'Test' });
      mockPrisma.document.findMany.mockResolvedValue([
        { templateId: 10, entityType: 'CHOFER' },
      ]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates).toHaveLength(1);
      expect(result.missingTemplates[0].templateId).toBe(20);
    });

    it('handles missing template name', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'CHOFER', obligatorio: true, template: null }])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'X' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates[0].templateName).toBe('Template 10');
    });

    it('builds entity clauses with no entities and empty OR', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'T' } }])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: null, truckId: null, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'X' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates).toHaveLength(1);
    });

    it('builds entity clauses only for present entity types', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'DNI' } }])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'X' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates).toHaveLength(1);

      const docCall = mockPrisma.document.findMany.mock.calls[0][0];
      expect(docCall.where.OR).toHaveLength(2);
    });

    it('handles equipo with only empresaTransportistaId and driverId', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'EMPRESA_TRANSPORTISTA', obligatorio: true, template: { name: 'ARCA' } }])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: null, trailerId: null, empresaTransportistaId: 5,
        tenantEmpresaId: 1, dadorCargaId: 3,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'EmpX' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates).toHaveLength(1);
    });

    it('returns all documents as missing when no docs exist', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          { templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'DNI' } },
          { templateId: 20, entityType: 'CAMION', obligatorio: true, template: { name: 'VTV' } },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'Test' });
      mockPrisma.document.findMany.mockResolvedValue([]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates).toHaveLength(2);
      expect(result.missingTemplates.every((t: any) => t.isNewRequirement)).toBe(true);
    });

    it('returns empty missingTemplates when all docs are loaded', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([{ templateId: 10, entityType: 'CHOFER', obligatorio: true, template: { name: 'DNI' } }])
        .mockResolvedValueOnce([]);

      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 1, truckId: 2, trailerId: null, empresaTransportistaId: null,
        tenantEmpresaId: 1, dadorCargaId: 5,
      });

      mockPrisma.cliente.findUnique.mockResolvedValue({ razonSocial: 'Full' });
      mockPrisma.document.findMany.mockResolvedValue([
        { templateId: 10, entityType: 'CHOFER' },
      ]);

      const result = await ClientsService.getMissingDocumentsForNewClient(1, 100, 50, []);
      expect(result.missingTemplates).toHaveLength(0);
    });
  });
});
