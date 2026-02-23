/**
 * Coverage tests for ClientsService helper functions
 * Covers: mergeRequirement (duplicate client, obligatorio, diasAnticipacion), getOrCreateDefaultPlantilla
 * @jest-environment node
 */

const mockPrisma: Record<string, any> = {
  plantillaRequisitoTemplate: { findMany: jest.fn() },
  plantillaRequisito: { findFirst: jest.fn(), create: jest.fn() },
  plantillaRequisitoTemplate2: { create: jest.fn() },
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

  describe('getConsolidatedTemplates (mergeRequirement)', () => {
    it('retorna vacío si clienteIds vacío', async () => {
      const result = await ClientsService.getConsolidatedTemplates(1, []);
      expect(result.templates).toEqual([]);
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
    });
  });

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
  });
});
