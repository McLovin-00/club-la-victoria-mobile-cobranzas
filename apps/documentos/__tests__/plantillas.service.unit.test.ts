/**
 * Tests unitarios para PlantillasService (métodos CRUD)
 * @jest-environment node
 */

jest.mock('../src/config/database', () => {
  const prismaMock: Record<string, any> = {
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
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    documentTemplate: { findFirst: jest.fn() },
    equipoPlantillaRequisito: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    equipo: { findUnique: jest.fn() },
    document: { findMany: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prismaMock.$transaction.mockImplementation((cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock));
  return { prisma: prismaMock };
});

jest.mock('../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { PlantillasService } from '../src/services/plantillas.service';
import { prisma as prismaClient } from '../src/config/database';

// NOSONAR: mock tipado genérico para tests
const prisma = prismaClient as any;

describe('PlantillasService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listByCliente', () => {
    it('lista plantillas filtradas por cliente y tenant', async () => {
      prisma.plantillaRequisito.findMany.mockResolvedValue([{ id: 1, nombre: 'Test' }]);

      const result = await PlantillasService.listByCliente(1, 10);

      expect(prisma.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantEmpresaId: 1, clienteId: 10 },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('agrega filtro activo cuando se provee', async () => {
      prisma.plantillaRequisito.findMany.mockResolvedValue([]);

      await PlantillasService.listByCliente(1, 10, true);

      expect(prisma.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantEmpresaId: 1, clienteId: 10, activo: true },
        }),
      );
    });
  });

  describe('listAll', () => {
    it('lista todas las plantillas del tenant', async () => {
      prisma.plantillaRequisito.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const result = await PlantillasService.listAll(1);
      expect(result).toHaveLength(2);
    });

    it('filtra por activo cuando se indica', async () => {
      prisma.plantillaRequisito.findMany.mockResolvedValue([]);
      await PlantillasService.listAll(1, false);
      expect(prisma.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantEmpresaId: 1, activo: false },
        }),
      );
    });
  });

  describe('getById', () => {
    it('obtiene plantilla por id y tenant', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5, nombre: 'Plantilla A' });
      const result = await PlantillasService.getById(1, 5);
      expect(result).toEqual({ id: 5, nombre: 'Plantilla A' });
    });
  });

  describe('create', () => {
    it('crea plantilla con defaults', async () => {
      prisma.plantillaRequisito.create.mockResolvedValue({ id: 10, activo: true });

      const result = await PlantillasService.create({
        tenantEmpresaId: 1,
        clienteId: 5,
        nombre: 'Nueva',
      });

      expect(result.id).toBe(10);
      expect(prisma.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activo: true }),
        }),
      );
    });
  });

  describe('update', () => {
    it('actualiza nombre de plantilla', async () => {
      prisma.plantillaRequisito.update.mockResolvedValue({ id: 5, nombre: 'Actualizada' });

      const result = await PlantillasService.update(1, 5, { nombre: 'Actualizada' });
      expect(result.nombre).toBe('Actualizada');
    });
  });

  describe('remove', () => {
    it('elimina plantilla del tenant', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      prisma.plantillaRequisito.delete.mockResolvedValue({ id: 5 });

      const result = await PlantillasService.remove(1, 5);
      expect(result.id).toBe(5);
    });

    it('lanza error si plantilla no existe', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue(null);
      await expect(PlantillasService.remove(1, 999)).rejects.toThrow('Plantilla no encontrada');
    });
  });

  describe('listTemplates', () => {
    it('lista templates de una plantilla', async () => {
      prisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        { id: 1, templateId: 10 },
      ]);

      const result = await PlantillasService.listTemplates(1, 5);
      expect(result).toHaveLength(1);
    });
  });

  describe('addTemplate', () => {
    it('agrega template válido a plantilla', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      prisma.documentTemplate.findFirst.mockResolvedValue({
        id: 10,
        entityType: 'CHOFER',
        name: 'DNI',
      });
      prisma.plantillaRequisitoTemplate.findFirst.mockResolvedValue(null);
      prisma.plantillaRequisitoTemplate.create.mockResolvedValue({
        id: 1,
        templateId: 10,
        entityType: 'CHOFER',
      });
      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      const result = await PlantillasService.addTemplate(1, 5, {
        templateId: 10,
        entityType: 'CHOFER',
      });

      expect(result.templateId).toBe(10);
    });

    it('lanza error si plantilla no existe', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue(null);

      await expect(
        PlantillasService.addTemplate(1, 999, { templateId: 10, entityType: 'CHOFER' }),
      ).rejects.toThrow('Plantilla no encontrada');
    });

    it('lanza error si template no activo', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      prisma.documentTemplate.findFirst.mockResolvedValue(null);

      await expect(
        PlantillasService.addTemplate(1, 5, { templateId: 99, entityType: 'CHOFER' }),
      ).rejects.toThrow('Template no encontrado o inactivo');
    });

    it('lanza error si entityType no coincide', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      prisma.documentTemplate.findFirst.mockResolvedValue({
        id: 10,
        entityType: 'CAMION',
        name: 'VTV',
      });

      await expect(
        PlantillasService.addTemplate(1, 5, { templateId: 10, entityType: 'CHOFER' }),
      ).rejects.toThrow('Template "VTV" es de tipo CAMION, no CHOFER');
    });

    it('lanza error si template ya agregado', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      prisma.documentTemplate.findFirst.mockResolvedValue({
        id: 10,
        entityType: 'CHOFER',
        name: 'DNI',
      });
      prisma.plantillaRequisitoTemplate.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        PlantillasService.addTemplate(1, 5, { templateId: 10, entityType: 'CHOFER' }),
      ).rejects.toThrow('ya está agregado');
    });
  });

  describe('updateTemplate', () => {
    it('actualiza configuración y dispara re-evaluación', async () => {
      prisma.plantillaRequisitoTemplate.findUnique.mockResolvedValue({
        plantillaRequisitoId: 5,
      });
      prisma.plantillaRequisitoTemplate.update.mockResolvedValue({
        id: 1,
        obligatorio: false,
      });
      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      const result = await PlantillasService.updateTemplate(1, 1, { obligatorio: false });
      expect(result.obligatorio).toBe(false);
      expect(prisma.plantillaRequisitoTemplate.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });
  });

  describe('removeTemplate', () => {
    it('elimina template y re-evalúa equipos', async () => {
      prisma.plantillaRequisitoTemplate.findUnique.mockResolvedValue({
        plantillaRequisitoId: 5,
      });
      prisma.plantillaRequisitoTemplate.delete.mockResolvedValue({ id: 1 });
      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      const result = await PlantillasService.removeTemplate(1, 1);
      expect(result.id).toBe(1);
    });
  });

  describe('getConsolidatedTemplates', () => {
    it('retorna vacío para plantillas vacías', async () => {
      const result = await PlantillasService.getConsolidatedTemplates(1, []);
      expect(result.templates).toEqual([]);
    });

    it('consolida templates de múltiples plantillas', async () => {
      prisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 15,
          visibleChofer: true,
          plantillaRequisitoId: 1,
          template: { name: 'DNI' },
          plantillaRequisito: {
            id: 1,
            nombre: 'Plantilla A',
            cliente: { id: 1, razonSocial: 'Cliente 1' },
          },
        },
      ]);

      const result = await PlantillasService.getConsolidatedTemplates(1, [1]);
      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].templateName).toBe('DNI');
      expect(result.byEntityType.CHOFER).toHaveLength(1);
    });
  });

  describe('listByEquipo', () => {
    it('lista plantillas activas de un equipo', async () => {
      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([
        { plantillaRequisito: { id: 1, nombre: 'Test' } },
      ]);

      const result = await PlantillasService.listByEquipo(1, 100);
      expect(result).toHaveLength(1);
    });
  });

  describe('assignToEquipo', () => {
    it('asigna plantilla a equipo válido', async () => {
      prisma.equipo.findUnique.mockResolvedValue({ id: 100, tenantEmpresaId: 1 });
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5, activo: true });
      prisma.equipoPlantillaRequisito.findFirst.mockResolvedValue(null);
      prisma.equipoPlantillaRequisito.create.mockResolvedValue({
        equipoId: 100,
        plantillaRequisitoId: 5,
      });

      const result = await PlantillasService.assignToEquipo(100, 5);
      expect(result.equipoId).toBe(100);
    });

    it('lanza error si equipo no existe', async () => {
      prisma.equipo.findUnique.mockResolvedValue(null);
      await expect(PlantillasService.assignToEquipo(999, 5)).rejects.toThrow('Equipo no encontrado');
    });

    it('lanza error si plantilla no activa', async () => {
      prisma.equipo.findUnique.mockResolvedValue({ id: 100, tenantEmpresaId: 1 });
      prisma.plantillaRequisito.findFirst.mockResolvedValue(null);
      await expect(PlantillasService.assignToEquipo(100, 999)).rejects.toThrow(
        'Plantilla no encontrada o inactiva',
      );
    });

    it('lanza error si ya asignada', async () => {
      prisma.equipo.findUnique.mockResolvedValue({ id: 100, tenantEmpresaId: 1 });
      prisma.plantillaRequisito.findFirst.mockResolvedValue({ id: 5 });
      prisma.equipoPlantillaRequisito.findFirst.mockResolvedValue({ id: 1 });
      await expect(PlantillasService.assignToEquipo(100, 5)).rejects.toThrow('ya está asignada');
    });
  });

  describe('unassignFromEquipo', () => {
    it('desasocia plantilla de equipo', async () => {
      prisma.equipoPlantillaRequisito.findFirst.mockResolvedValue({
        asignadoDesde: new Date(),
      });
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.equipo.findUnique.mockResolvedValue(null);

      const result = await PlantillasService.unassignFromEquipo(100, 5);
      expect(result).toBe(1);
    });

    it('lanza error si asociación no existe', async () => {
      prisma.equipoPlantillaRequisito.findFirst.mockResolvedValue(null);
      await expect(PlantillasService.unassignFromEquipo(100, 999)).rejects.toThrow(
        'Asociación no encontrada',
      );
    });
  });

  describe('duplicate', () => {
    it('duplica plantilla con sus templates', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({
        id: 5,
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Original',
        descripcion: 'Desc original',
        templates: [
          { tenantEmpresaId: 1, templateId: 10, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 0, visibleChofer: true },
        ],
      });
      prisma.plantillaRequisito.create.mockResolvedValue({ id: 20 });
      prisma.plantillaRequisitoTemplate.createMany.mockResolvedValue({ count: 1 });

      const result = await PlantillasService.duplicate(1, 5, 'Copia');
      expect(result.id).toBe(20);
      expect(prisma.plantillaRequisitoTemplate.createMany).toHaveBeenCalled();
    });

    it('lanza error si plantilla original no existe', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue(null);
      await expect(PlantillasService.duplicate(1, 999, 'Copia')).rejects.toThrow(
        'Plantilla no encontrada',
      );
    });

    it('duplica sin templates si no tiene', async () => {
      prisma.plantillaRequisito.findFirst.mockResolvedValue({
        id: 5,
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Vacía',
        descripcion: null,
        templates: [],
      });
      prisma.plantillaRequisito.create.mockResolvedValue({ id: 21 });

      const result = await PlantillasService.duplicate(1, 5, 'Copia vacía');
      expect(result.id).toBe(21);
      expect(prisma.plantillaRequisitoTemplate.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getEquipoConsolidatedTemplates', () => {
    it('retorna templates consolidados de un equipo', async () => {
      prisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([
        {
          templateId: 10,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 15,
          visibleChofer: true,
          plantillaRequisitoId: 1,
          template: { name: 'DNI' },
          plantillaRequisito: {
            id: 1,
            nombre: 'Plantilla A',
            cliente: { id: 1, razonSocial: 'Cliente 1' },
          },
        },
      ]);

      const result = await PlantillasService.getEquipoConsolidatedTemplates(1, 100);
      expect(result.templates).toHaveLength(1);
      expect(result.byEntityType.CHOFER).toHaveLength(1);
      expect(result.byEntityType.CAMION).toHaveLength(0);
    });

    it('retorna vacío cuando no hay plantillas asignadas', async () => {
      prisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);

      const result = await PlantillasService.getEquipoConsolidatedTemplates(1, 100);
      expect(result.templates).toHaveLength(0);
    });
  });

  describe('getMissingDocumentsForNewPlantilla', () => {
    it('retorna documentos faltantes para nueva plantilla', async () => {
      prisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          {
            templateId: 100,
            entityType: 'CHOFER',
            template: { name: 'DNI' },
            obligatorio: true,
            plantillaRequisito: {
              nombre: 'Plantilla Test',
              cliente: { razonSocial: 'Cliente X' },
            },
          },
        ])
        .mockResolvedValueOnce([]);

      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      prisma.equipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
      });

      prisma.document.findMany.mockResolvedValue([]);

      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 100, 5);
      expect(result.plantillaName).toBe('Plantilla Test');
      expect(result.clienteName).toBe('Cliente X');
      expect(result.missingTemplates).toHaveLength(1);
      expect(result.missingTemplates[0].templateId).toBe(100);
    });

    it('retorna vacío si equipo no existe', async () => {
      prisma.plantillaRequisitoTemplate.findMany.mockResolvedValue([]);
      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);
      prisma.equipo.findUnique.mockResolvedValue(null);

      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 999, 5);
      expect(result.missingTemplates).toEqual([]);
      expect(result.plantillaName).toBe('');
    });

    it('no incluye documentos que ya están cargados', async () => {
      prisma.plantillaRequisitoTemplate.findMany
        .mockResolvedValueOnce([
          {
            templateId: 100,
            entityType: 'CHOFER',
            template: { name: 'DNI' },
            obligatorio: true,
            plantillaRequisito: {
              nombre: 'Plantilla Test',
              cliente: { razonSocial: 'Cliente X' },
            },
          },
        ])
        .mockResolvedValueOnce([]);

      prisma.equipoPlantillaRequisito.findMany.mockResolvedValue([]);

      prisma.equipo.findUnique.mockResolvedValue({
        driverId: 10,
        truckId: 20,
        trailerId: null,
        empresaTransportistaId: null,
        tenantEmpresaId: 1,
        dadorCargaId: 1,
      });

      prisma.document.findMany.mockResolvedValue([
        { templateId: 100, entityType: 'CHOFER' },
      ]);

      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 100, 5);
      expect(result.missingTemplates).toHaveLength(0);
    });
  });
});
