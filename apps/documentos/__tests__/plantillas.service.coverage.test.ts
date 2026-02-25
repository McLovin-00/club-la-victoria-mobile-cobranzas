/**
 * Coverage tests for PlantillasService – CRUD operations,
 * template management, consolidation, equipo association/unassociation,
 * getMissingDocumentsForNewPlantilla, duplicate, mergeTemplateFromPlantilla
 * helper, and reevaluarEquiposPorPlantilla side-effects.
 * @jest-environment node
 */

const mockPrisma: any = {
  plantillaRequisito: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  plantillaRequisitoTemplate: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
  documentTemplate: {
    findFirst: jest.fn(),
  },
  equipoPlantillaRequisito: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  equipo: {
    findUnique: jest.fn(),
  },
  document: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((cb: any) => {
    if (typeof cb === 'function') return cb(mockPrisma);
    return Promise.all(cb);
  }),
  $executeRaw: jest.fn(),
};

jest.mock('../src/config/database', () => ({ prisma: mockPrisma }));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn().mockResolvedValue(undefined) },
}));

import {
  PlantillasService,
  mergeTemplateFromPlantilla,
} from '../src/services/plantillas.service';

describe('PlantillasService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // mergeTemplateFromPlantilla helper
  // ==========================================================================
  describe('mergeTemplateFromPlantilla', () => {
    it('adds new entry to empty map', () => {
      const map = new Map();
      mergeTemplateFromPlantilla(map, {
        templateId: 1,
        entityType: 'CHOFER',
        obligatorio: true,
        diasAnticipacion: 30,
        visibleChofer: false,
        plantillaRequisitoId: 10,
        template: { name: 'DNI' },
        plantillaRequisito: {
          id: 10,
          nombre: 'Plantilla A',
          cliente: { id: 1, razonSocial: 'Cliente X' },
        },
      });

      expect(map.size).toBe(1);
      const entry = map.get('1:CHOFER');
      expect(entry.templateName).toBe('DNI');
      expect(entry.plantillaIds).toEqual([10]);
      expect(entry.clienteNames).toEqual(['Cliente X']);
    });

    it('merges into existing entry', () => {
      const map = new Map();
      const base = {
        templateId: 1,
        entityType: 'CHOFER',
        obligatorio: false,
        diasAnticipacion: 20,
        visibleChofer: false,
        plantillaRequisitoId: 10,
        template: { name: 'DNI' },
        plantillaRequisito: {
          id: 10,
          nombre: 'Plantilla A',
          cliente: { id: 1, razonSocial: 'Cliente X' },
        },
      };

      mergeTemplateFromPlantilla(map, base);

      // Add from different plantilla with higher anticipation
      mergeTemplateFromPlantilla(map, {
        ...base,
        plantillaRequisitoId: 20,
        obligatorio: true,
        diasAnticipacion: 60,
        visibleChofer: true,
        plantillaRequisito: {
          id: 20,
          nombre: 'Plantilla B',
          cliente: { id: 2, razonSocial: 'Cliente Y' },
        },
      });

      const entry = map.get('1:CHOFER');
      expect(entry.plantillaIds).toEqual([10, 20]);
      expect(entry.clienteIds).toEqual([1, 2]);
      expect(entry.obligatorio).toBe(true);
      expect(entry.diasAnticipacion).toBe(60);
      expect(entry.visibleChofer).toBe(true);
    });

    it('skips duplicate plantillaId and clienteId', () => {
      const map = new Map();
      const base = {
        templateId: 1,
        entityType: 'CHOFER',
        obligatorio: false,
        diasAnticipacion: 20,
        visibleChofer: false,
        plantillaRequisitoId: 10,
        template: null,
        plantillaRequisito: null,
      };

      mergeTemplateFromPlantilla(map, base);
      mergeTemplateFromPlantilla(map, base);

      const entry = map.get('1:CHOFER');
      expect(entry.plantillaIds).toEqual([10]);
      expect(entry.templateName).toBe('Template 1');
      expect(entry.plantillaNames).toEqual(['Plantilla 10']);
      expect(entry.clienteNames).toEqual(['Sin cliente']);
    });

    it('does not increase diasAnticipacion if lower', () => {
      const map = new Map();
      mergeTemplateFromPlantilla(map, {
        templateId: 1,
        entityType: 'CHOFER',
        obligatorio: false,
        diasAnticipacion: 60,
        visibleChofer: false,
        plantillaRequisitoId: 10,
        template: { name: 'DNI' },
        plantillaRequisito: { id: 10, nombre: 'P1', cliente: { id: 1, razonSocial: 'C1' } },
      });

      mergeTemplateFromPlantilla(map, {
        templateId: 1,
        entityType: 'CHOFER',
        obligatorio: false,
        diasAnticipacion: 30,
        visibleChofer: false,
        plantillaRequisitoId: 20,
        template: { name: 'DNI' },
        plantillaRequisito: { id: 20, nombre: 'P2', cliente: { id: 2, razonSocial: 'C2' } },
      });

      expect(map.get('1:CHOFER').diasAnticipacion).toBe(60);
    });
  });

  // ==========================================================================
  // CRUD - listByCliente
  // ==========================================================================
  describe('listByCliente', () => {
    it('lists with activo filter', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.listByCliente(1, 10, true);

      expect(mockPrisma.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantEmpresaId: 1, clienteId: 10, activo: true }),
        })
      );
    });

    it('lists without activo filter', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.listByCliente(1, 10);

      expect(mockPrisma.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantEmpresaId: 1, clienteId: 10 }),
        })
      );
    });
  });

  // ==========================================================================
  // CRUD - listAll
  // ==========================================================================
  describe('listAll', () => {
    it('lists all with activo filter', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.listAll(1, false);

      expect(mockPrisma.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantEmpresaId: 1, activo: false }),
        })
      );
    });

    it('lists all without activo filter', async () => {
      mockPrisma.plantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.listAll(1);

      expect(mockPrisma.plantillaRequisito.findMany).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CRUD - getById, create, update
  // ==========================================================================
  describe('getById', () => {
    it('returns plantilla with includes', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 1 });

      const result = await PlantillasService.getById(1, 1);

      expect(result).toEqual({ id: 1 });
    });
  });

  describe('create', () => {
    it('creates plantilla with defaults', async () => {
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 1 });

      await PlantillasService.create({
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Test',
      });

      expect(mockPrisma.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activo: true }),
        })
      );
    });

    it('creates with explicit activo=false', async () => {
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 2 });

      await PlantillasService.create({
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Test',
        activo: false,
      });

      expect(mockPrisma.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activo: false }),
        })
      );
    });
  });

  describe('update', () => {
    it('updates plantilla', async () => {
      mockPrisma.plantillaRequisito.update.mockResolvedValue({ id: 1 });

      await PlantillasService.update(1, 1, { nombre: 'Updated' });

      expect(mockPrisma.plantillaRequisito.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nombre: 'Updated' },
      });
    });
  });

  // ==========================================================================
  // CRUD - remove
  // ==========================================================================
  describe('remove', () => {
    it('removes plantilla', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 1 });
      mockPrisma.plantillaRequisito.delete.mockResolvedValue({ id: 1 });

      await PlantillasService.remove(1, 1);

      expect(mockPrisma.plantillaRequisito.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws when plantilla not found', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue(null);

      await expect(PlantillasService.remove(1, 999)).rejects.toThrow('Plantilla no encontrada');
    });
  });

  // ==========================================================================
  // Template management
  // ==========================================================================
  describe('listTemplates', () => {
    it('lists templates for a plantilla', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      await PlantillasService.listTemplates(1, 10);

      expect(mockPrisma.plantillaRequisitoTemplate.findMany).toHaveBeenCalled();
    });
  });

  describe('addTemplate', () => {
    it('adds template to plantilla successfully', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.documentTemplate.findFirst.mockResolvedValue({ id: 1, entityType: 'CHOFER', name: 'DNI' });
      mockPrisma.plantillaRequisitoTemplate.findFirst.mockResolvedValue(null);
      mockPrisma.plantillaRequisitoTemplate.create.mockResolvedValue({ id: 100 });
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      const result = await PlantillasService.addTemplate(1, 10, {
        templateId: 1,
        entityType: 'CHOFER' as any,
      });

      expect(result).toEqual({ id: 100 });
    });

    it('throws when plantilla not found', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue(null);

      await expect(
        PlantillasService.addTemplate(1, 999, { templateId: 1, entityType: 'CHOFER' as any })
      ).rejects.toThrow('Plantilla no encontrada');
    });

    it('throws when template not found', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.documentTemplate.findFirst.mockResolvedValue(null);

      await expect(
        PlantillasService.addTemplate(1, 10, { templateId: 999, entityType: 'CHOFER' as any })
      ).rejects.toThrow('Template no encontrado o inactivo');
    });

    it('throws when entity type mismatch', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.documentTemplate.findFirst.mockResolvedValue({ id: 1, entityType: 'CAMION', name: 'VTV' });

      await expect(
        PlantillasService.addTemplate(1, 10, { templateId: 1, entityType: 'CHOFER' as any })
      ).rejects.toThrow('Template "VTV" es de tipo CAMION');
    });

    it('throws when template already added', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.documentTemplate.findFirst.mockResolvedValue({ id: 1, entityType: 'CHOFER', name: 'DNI' });
      mockPrisma.plantillaRequisitoTemplate.findFirst.mockResolvedValue({ id: 50 });

      await expect(
        PlantillasService.addTemplate(1, 10, { templateId: 1, entityType: 'CHOFER' as any })
      ).rejects.toThrow('Este template ya está agregado');
    });
  });

  describe('updateTemplate', () => {
    it('updates template config and triggers re-evaluation', async () => {
      mockPrisma.plantillaRequisitoTemplate.findUnique.mockResolvedValue({ plantillaRequisitoId: 10 });
      mockPrisma.plantillaRequisitoTemplate.update.mockResolvedValue({ id: 100 });
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.updateTemplate(1, 100, { obligatorio: true });

      expect(mockPrisma.plantillaRequisitoTemplate.update).toHaveBeenCalled();
    });

    it('skips re-evaluation when no existing record', async () => {
      mockPrisma.plantillaRequisitoTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.plantillaRequisitoTemplate.update.mockResolvedValue({ id: 100 });

      await PlantillasService.updateTemplate(1, 100, { diasAnticipacion: 60 });

      expect(mockPrisma.plantillaRequisitoTemplate.update).toHaveBeenCalled();
    });
  });

  describe('removeTemplate', () => {
    it('removes template and triggers re-evaluation', async () => {
      mockPrisma.plantillaRequisitoTemplate.findUnique.mockResolvedValue({ plantillaRequisitoId: 10 });
      mockPrisma.plantillaRequisitoTemplate.delete.mockResolvedValue({ id: 100 });
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.removeTemplate(1, 100);

      expect(mockPrisma.plantillaRequisitoTemplate.delete).toHaveBeenCalled();
    });

    it('skips re-evaluation when no existing record', async () => {
      mockPrisma.plantillaRequisitoTemplate.findUnique.mockResolvedValue(null);
      mockPrisma.plantillaRequisitoTemplate.delete.mockResolvedValue({ id: 100 });

      await PlantillasService.removeTemplate(1, 100);

      expect(mockPrisma.plantillaRequisitoTemplate.delete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getConsolidatedTemplates
  // ==========================================================================
  describe('getConsolidatedTemplates', () => {
    it('returns empty when no plantilla IDs', async () => {
      const result = await PlantillasService.getConsolidatedTemplates(1, []);

      expect(result).toEqual({ templates: [], byEntityType: {} });
    });

    it('consolidates templates from multiple plantillas', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 1,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 30,
          visibleChofer: true,
          plantillaRequisitoId: 10,
          template: { name: 'DNI' },
          plantillaRequisito: { id: 10, nombre: 'P1', cliente: { id: 1, razonSocial: 'C1' } },
        },
        {
          templateId: 2,
          entityType: 'CAMION',
          obligatorio: false,
          diasAnticipacion: 20,
          visibleChofer: false,
          plantillaRequisitoId: 10,
          template: { name: 'VTV' },
          plantillaRequisito: { id: 10, nombre: 'P1', cliente: { id: 1, razonSocial: 'C1' } },
        },
      ]);

      const result = await PlantillasService.getConsolidatedTemplates(1, [10]);

      expect(result.templates.length).toBe(2);
      expect(result.byEntityType.CHOFER.length).toBe(1);
      expect(result.byEntityType.CAMION.length).toBe(1);
    });
  });

  // ==========================================================================
  // Equipo association
  // ==========================================================================
  describe('listByEquipo', () => {
    it('lists active plantillas for equipo', async () => {
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.listByEquipo(1, 100);

      expect(mockPrisma.equipoPlantillaRequisito.findMany).toHaveBeenCalled();
    });

    it('lists all (including inactive) plantillas', async () => {
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.listByEquipo(1, 100, false);

      expect(mockPrisma.equipoPlantillaRequisito.findMany).toHaveBeenCalled();
    });
  });

  describe('assignToEquipo', () => {
    it('assigns plantilla to equipo', async () => {
      mockPrisma.equipo.findUnique
        .mockResolvedValueOnce({ id: 100, tenantEmpresaId: 1 }) // in transaction
        .mockResolvedValueOnce({ tenantEmpresaId: 1 }); // after transaction
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.equipoPlantillaRequisito.findFirst.mockResolvedValue(null);
      mockPrisma.equipoPlantillaRequisito.create.mockResolvedValue({ id: 200 });

      const result = await PlantillasService.assignToEquipo(100, 10);

      expect(result).toEqual({ id: 200 });
    });

    it('throws when equipo not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      await expect(
        PlantillasService.assignToEquipo(999, 10)
      ).rejects.toThrow('Equipo no encontrado');
    });

    it('throws when plantilla not found', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 100, tenantEmpresaId: 1 });
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue(null);

      await expect(
        PlantillasService.assignToEquipo(100, 999)
      ).rejects.toThrow('Plantilla no encontrada o inactiva');
    });

    it('throws when already assigned', async () => {
      mockPrisma.equipo.findUnique.mockResolvedValue({ id: 100, tenantEmpresaId: 1 });
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.equipoPlantillaRequisito.findFirst.mockResolvedValue({ id: 50 });

      await expect(
        PlantillasService.assignToEquipo(100, 10)
      ).rejects.toThrow('ya está asignada');
    });
  });

  describe('unassignFromEquipo', () => {
    it('unassigns plantilla from equipo', async () => {
      mockPrisma.equipoPlantillaRequisito.findFirst.mockResolvedValue({
        equipoId: 100,
        plantillaRequisitoId: 10,
        asignadoDesde: new Date(),
      });
      mockPrisma.$executeRaw.mockResolvedValue(1);
      mockPrisma.equipo.findUnique.mockResolvedValue({ tenantEmpresaId: 1 });

      const result = await PlantillasService.unassignFromEquipo(100, 10);

      expect(result).toBe(1);
    });

    it('throws when association not found', async () => {
      mockPrisma.equipoPlantillaRequisito.findFirst.mockResolvedValue(null);

      await expect(
        PlantillasService.unassignFromEquipo(100, 999)
      ).rejects.toThrow('Asociación no encontrada');
    });
  });

  // ==========================================================================
  // getEquipoConsolidatedTemplates
  // ==========================================================================
  describe('getEquipoConsolidatedTemplates', () => {
    it('returns consolidated templates for equipo', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      const result = await PlantillasService.getEquipoConsolidatedTemplates(1, 100);

      expect(result.templates).toEqual([]);
      expect(result.byEntityType).toBeDefined();
    });
  });

  // ==========================================================================
  // getMissingDocumentsForNewPlantilla
  // ==========================================================================
  describe('getMissingDocumentsForNewPlantilla', () => {
    it('returns empty when equipo not found', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);
      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.equipo.findUnique.mockResolvedValue(null);

      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 100, 10);

      expect(result).toEqual({ missingTemplates: [], plantillaName: '' });
    });

    it('identifies missing documents for new plantilla', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          {
            templateId: 1,
            entityType: 'CHOFER',
            obligatorio: true,
            template: { name: 'DNI' },
            plantillaRequisito: { nombre: 'Test', cliente: { razonSocial: 'Client' } },
          },
        ])
        .mockResolvedValueOnce([]); // existing plantilla templates

      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        tenantEmpresaId: 1,
        dadorCargaId: 5,
      });
      mockPrisma.document.findMany.mockResolvedValue([]); // no existing docs

      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 100, 10);

      expect(result.missingTemplates.length).toBe(1);
      expect(result.plantillaName).toBe('Test');
      expect(result.clienteName).toBe('Client');
    });

    it('filters out documents that are already loaded', async () => {
      mockPrisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          {
            templateId: 1,
            entityType: 'CHOFER',
            obligatorio: true,
            template: { name: 'DNI' },
            plantillaRequisito: { nombre: 'Test', cliente: { razonSocial: 'C' } },
          },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      mockPrisma.equipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: null,
        trailerId: null,
        empresaTransportistaId: null,
        tenantEmpresaId: 1,
        dadorCargaId: 5,
      });
      mockPrisma.document.findMany.mockResolvedValue([
        { templateId: 1, entityType: 'CHOFER' },
      ]);

      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 100, 10);

      expect(result.missingTemplates.length).toBe(0);
    });
  });

  // ==========================================================================
  // duplicate
  // ==========================================================================
  describe('duplicate', () => {
    it('duplicates plantilla with templates', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Original',
        descripcion: 'Desc',
        templates: [
          {
            tenantEmpresaId: 1,
            templateId: 1,
            entityType: 'CHOFER',
            obligatorio: true,
            diasAnticipacion: 30,
            visibleChofer: true,
          },
        ],
      });
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 2 });
      mockPrisma.plantillaRequisitoTemplate.createMany = jest.fn().mockResolvedValue({ count: 1 });

      const result = await PlantillasService.duplicate(1, 1, 'Copy');

      expect(result).toEqual({ id: 2 });
    });

    it('duplicates plantilla without templates', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue({
        id: 1,
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Original',
        descripcion: null,
        templates: [],
      });
      mockPrisma.plantillaRequisito.create.mockResolvedValue({ id: 3 });

      const result = await PlantillasService.duplicate(1, 1, 'Copy2');

      expect(result).toEqual({ id: 3 });
    });

    it('throws when original not found', async () => {
      mockPrisma.plantillaRequisito.findFirst.mockResolvedValue(null);

      await expect(
        PlantillasService.duplicate(1, 999, 'Copy')
      ).rejects.toThrow('Plantilla no encontrada');
    });
  });
});
