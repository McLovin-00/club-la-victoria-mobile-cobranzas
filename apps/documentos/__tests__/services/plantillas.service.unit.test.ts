/**
 * Tests unitarios para PlantillasService
 * Cubre todos los métodos públicos con casos exitosos, errores y casos borde
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

// Mocks del sistema
jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { PlantillasService } from '../../src/services/plantillas.service';
import { AppLogger } from '../../src/config/logger';

describe('PlantillasService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // CRUD de PlantillaRequisito - listByCliente
  // ============================================================================
  describe('listByCliente', () => {
    it('debe listar plantillas de un cliente exitosamente', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const mockPlantillas = [
        {
          id: 1,
          nombre: 'Plantilla A',
          descripcion: 'Descripción A',
          tenantEmpresaId,
          clienteId,
          activo: true,
          cliente: { id: clienteId, razonSocial: 'Cliente X' },
          _count: { templates: 3, equipos: 2 },
        },
        {
          id: 2,
          nombre: 'Plantilla B',
          descripcion: 'Descripción B',
          tenantEmpresaId,
          clienteId,
          activo: true,
          cliente: { id: clienteId, razonSocial: 'Cliente X' },
          _count: { templates: 1, equipos: 0 },
        },
      ];

      prismaMock.plantillaRequisito.findMany.mockResolvedValueOnce(mockPlantillas as any);

      // Act
      const result = await PlantillasService.listByCliente(tenantEmpresaId, clienteId);

      // Assert
      expect(prismaMock.plantillaRequisito.findMany).toHaveBeenCalledWith({
        where: { tenantEmpresaId, clienteId },
        include: {
          cliente: { select: { id: true, razonSocial: true } },
          _count: { select: { templates: true, equipos: true } },
        },
        orderBy: { nombre: 'asc' },
      });
      expect(result).toEqual(mockPlantillas);
      expect(result).toHaveLength(2);
    });

    it('debe listar solo plantillas activas cuando activo=true', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const mockPlantillas = [
        {
          id: 1,
          nombre: 'Plantilla Activa',
          tenantEmpresaId,
          clienteId,
          activo: true,
          cliente: { id: clienteId, razonSocial: 'Cliente X' },
          _count: { templates: 2, equipos: 1 },
        },
      ];

      prismaMock.plantillaRequisito.findMany.mockResolvedValueOnce(mockPlantillas as any);

      // Act
      const result = await PlantillasService.listByCliente(tenantEmpresaId, clienteId, true);

      // Assert
      expect(prismaMock.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantEmpresaId, clienteId, activo: true },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.activo).toBe(true);
    });

    it('debe listar solo plantillas inactivas cuando activo=false', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const clienteId = 10;
      const mockPlantillas = [
        {
          id: 99,
          nombre: 'Plantilla Inactiva',
          tenantEmpresaId,
          clienteId,
          activo: false,
          cliente: { id: clienteId, razonSocial: 'Cliente X' },
          _count: { templates: 0, equipos: 0 },
        },
      ];

      prismaMock.plantillaRequisito.findMany.mockResolvedValueOnce(mockPlantillas as any);

      // Act
      const result = await PlantillasService.listByCliente(tenantEmpresaId, clienteId, false);

      // Assert
      expect(prismaMock.plantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantEmpresaId, clienteId, activo: false },
        })
      );
      expect(result[0]?.activo).toBe(false);
    });

    it('debe retornar array vacío cuando no hay plantillas', async () => {
      // Arrange
      prismaMock.plantillaRequisito.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await PlantillasService.listByCliente(1, 10);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // CRUD de PlantillaRequisito - create
  // ============================================================================
  describe('create', () => {
    it('debe crear una plantilla con datos completos', async () => {
      // Arrange
      const input = {
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Nueva Plantilla',
        descripcion: 'Descripción de prueba',
        activo: true,
      };

      const mockCreated = {
        id: 100,
        ...input,
        cliente: { id: 10, razonSocial: 'Cliente X' },
      };

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockCreated as any);

      // Act
      const result = await PlantillasService.create(input);

      // Assert
      expect(prismaMock.plantillaRequisito.create).toHaveBeenCalledWith({
        data: input,
        include: {
          cliente: { select: { id: true, razonSocial: true } },
        },
      });
      expect(result?.nombre).toBe('Nueva Plantilla');
      expect(result?.id).toBe(100);
    });

    it('debe crear plantilla sin descripción (campo opcional)', async () => {
      // Arrange
      const input = {
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Plantilla Mínima',
      };

      const mockCreated = {
        id: 101,
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Plantilla Mínima',
        descripcion: undefined,
        activo: true,
        cliente: { id: 10, razonSocial: 'Cliente Y' },
      };

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockCreated as any);

      // Act
      const result = await PlantillasService.create(input as any);

      // Assert
      expect(result?.nombre).toBe('Plantilla Mínima');
      expect(result?.id).toBe(101);
    });

    it('debe defaultear activo a true cuando no se proporciona', async () => {
      // Arrange
      const input = {
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Plantilla',
      };

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce({
        id: 102,
        ...input,
        activo: true,
        cliente: { id: 10, razonSocial: 'Cliente Z' },
      } as any);

      // Act
      await PlantillasService.create(input as any);

      // Assert
      expect(prismaMock.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activo: true }),
        })
      );
    });

    it('debe respetar activo=false cuando se proporciona explícitamente', async () => {
      // Arrange
      const input = {
        tenantEmpresaId: 1,
        clienteId: 10,
        nombre: 'Plantilla Inactiva',
        activo: false,
      };

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce({
        id: 103,
        ...input,
        cliente: { id: 10, razonSocial: 'Cliente' },
      } as any);

      // Act
      await PlantillasService.create(input);

      // Assert
      expect(prismaMock.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activo: false }),
        })
      );
    });
  });

  // ============================================================================
  // CRUD de PlantillaRequisito - update
  // ============================================================================
  describe('update', () => {
    it('debe actualizar nombre de una plantilla', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const plantillaId = 10;
      const updateData = { nombre: 'Nombre Actualizado' };

      const mockUpdated = {
        id: plantillaId,
        nombre: 'Nombre Actualizado',
        descripcion: 'Original',
        tenantEmpresaId,
        clienteId: 5,
        activo: true,
      };

      prismaMock.plantillaRequisito.update.mockResolvedValueOnce(mockUpdated as any);

      // Act
      const result = await PlantillasService.update(tenantEmpresaId, plantillaId, updateData);

      // Assert
      expect(prismaMock.plantillaRequisito.update).toHaveBeenCalledWith({
        where: { id: plantillaId },
        data: updateData,
      });
      expect(result?.nombre).toBe('Nombre Actualizado');
    });

    it('debe actualizar múltiples campos simultáneamente', async () => {
      // Arrange
      const updateData = {
        nombre: 'Nuevo Nombre',
        descripcion: 'Nueva Descripción',
        activo: false,
      };

      prismaMock.plantillaRequisito.update.mockResolvedValueOnce({
        id: 10,
        ...updateData,
        tenantEmpresaId: 1,
        clienteId: 5,
      } as any);

      // Act
      await PlantillasService.update(1, 10, updateData);

      // Assert
      expect(prismaMock.plantillaRequisito.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: updateData,
        })
      );
    });

    it('debe permitir actualización parcial', async () => {
      // Arrange
      const updateData = { activo: false };

      prismaMock.plantillaRequisito.update.mockResolvedValueOnce({
        id: 10,
        nombre: 'Original',
        descripcion: 'Original',
        tenantEmpresaId: 1,
        clienteId: 5,
        activo: false,
      } as any);

      // Act
      await PlantillasService.update(1, 10, updateData);

      // Assert
      expect(prismaMock.plantillaRequisito.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: updateData,
      });
    });
  });

  // ============================================================================
  // CRUD de PlantillaRequisito - remove
  // ============================================================================
  describe('remove', () => {
    it('debe eliminar una plantilla que pertenece al tenant', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const plantillaId = 10;

      // Mock findFirst para verificar pertenencia
      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce({
        id: plantillaId,
        tenantEmpresaId,
        nombre: 'Plantilla a Eliminar',
      } as any);

      // Mock delete
      prismaMock.plantillaRequisito.delete.mockResolvedValueOnce({
        id: plantillaId,
      } as any);

      // Act
      const result = await PlantillasService.remove(tenantEmpresaId, plantillaId);

      // Assert
      expect(prismaMock.plantillaRequisito.findFirst).toHaveBeenCalledWith({
        where: { id: plantillaId, tenantEmpresaId },
      });
      expect(prismaMock.plantillaRequisito.delete).toHaveBeenCalledWith({
        where: { id: plantillaId },
      });
      expect(result?.id).toBe(plantillaId);
    });

    it('debe lanzar error cuando plantilla no existe', async () => {
      // Arrange
      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(PlantillasService.remove(1, 999)).rejects.toThrow('Plantilla no encontrada');
      expect(prismaMock.plantillaRequisito.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando plantilla no pertenece al tenant', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const plantillaId = 10;

      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(null); // No pertenece

      // Act & Assert
      await expect(PlantillasService.remove(tenantEmpresaId, plantillaId)).rejects.toThrow(
        'Plantilla no encontrada'
      );
    });

    it('debe eliminar en cascada (elimina templates y asociaciones)', async () => {
      // Arrange: Esta es más una verificación de comportamiento
      // El cascade está configurado en schema, aquí solo verificamos que se llama al delete
      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce({
        id: 10,
        tenantEmpresaId: 1,
      } as any);

      prismaMock.plantillaRequisito.delete.mockResolvedValueOnce({ id: 10 } as any);

      // Act
      await PlantillasService.remove(1, 10);

      // Assert
      expect(prismaMock.plantillaRequisito.delete).toHaveBeenCalledTimes(1);
    });
  });
});
/**
 * PARTE 2: Tests para gestión de Templates en Plantilla
 * Métodos: listTemplates, addTemplate, updateTemplate, removeTemplate
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { PlantillasService } from '../../src/services/plantillas.service';

describe('PlantillasService - Gestión de Templates', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Gestión de Templates - listTemplates
  // ============================================================================
  describe('listTemplates', () => {
    it('debe listar todos los templates de una plantilla', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const plantillaRequisitoId = 5;

      const mockTemplates = [
        {
          id: 1,
          templateId: 100,
          plantillaRequisitoId,
          tenantEmpresaId,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 7,
          visibleChofer: true,
          template: {
            id: 100,
            name: 'Licencia de Conducir',
            descripcion: 'Documento de licencia',
          },
        },
        {
          id: 2,
          templateId: 101,
          plantillaRequisitoId,
          tenantEmpresaId,
          entityType: 'CAMION',
          obligatorio: false,
          diasAnticipacion: 30,
          visibleChofer: false,
          template: {
            id: 101,
            name: 'Verificación Mecánica',
            descripcion: 'Inspección técnica',
          },
        },
      ];

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(mockTemplates as any);

      // Act
      const result = await PlantillasService.listTemplates(tenantEmpresaId, plantillaRequisitoId);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantEmpresaId, plantillaRequisitoId },
        include: { template: true },
        orderBy: [{ entityType: 'asc' }, { template: { name: 'asc' } }],
      });
      expect(result).toHaveLength(2);
      // Los templates deben contener ambos tipos de entidades
      expect(result.map((r: any) => r.entityType).sort()).toEqual(['CAMION', 'CHOFER']);
    });

    it('debe retornar array vacío cuando plantilla no tiene templates', async () => {
      // Arrange
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await PlantillasService.listTemplates(1, 5);

      // Assert
      expect(result).toEqual([]);
    });

    it('debe mantener el orden correcto (entityType asc, luego template name asc)', async () => {
      // Arrange
      const mockTemplates = [
        {
          id: 1,
          entityType: 'ACOPLADO',
          template: { id: 100, name: 'Documento A' },
        },
        {
          id: 2,
          entityType: 'ACOPLADO',
          template: { id: 101, name: 'Documento Z' },
        },
        {
          id: 3,
          entityType: 'CHOFER',
          template: { id: 102, name: 'Documento B' },
        },
      ];

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(mockTemplates as any);

      // Act
      const result = await PlantillasService.listTemplates(1, 5);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ entityType: 'asc' }, { template: { name: 'asc' } }],
        })
      );
    });
  });

  // ============================================================================
  // Gestión de Templates - addTemplate
  // ============================================================================
  describe('addTemplate', () => {
    it('debe agregar un template a una plantilla con todos los parámetros', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const plantillaRequisitoId = 5;

      const input = {
        templateId: 100,
        entityType: 'CHOFER' as const,
        obligatorio: true,
        diasAnticipacion: 7,
        visibleChofer: true,
      };

      const mockCreated = {
        id: 50,
        tenantEmpresaId,
        plantillaRequisitoId,
        ...input,
        template: { id: 100, name: 'Licencia de Conducir' },
      };

      prismaMock.plantillaRequisitoTemplate.create.mockResolvedValueOnce(mockCreated as any);

      // Act
      const result = await PlantillasService.addTemplate(tenantEmpresaId, plantillaRequisitoId, input);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.create).toHaveBeenCalledWith({
        data: {
          tenantEmpresaId,
          plantillaRequisitoId,
          templateId: 100,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 7,
          visibleChofer: true,
        },
        include: { template: true },
      });
      expect(result).toEqual(mockCreated);
    });

    it('debe defaultear obligatorio a true cuando no se proporciona', async () => {
      // Arrange
      const input = {
        templateId: 100,
        entityType: 'CHOFER' as const,
        diasAnticipacion: 5,
        visibleChofer: false,
      };

      prismaMock.plantillaRequisitoTemplate.create.mockResolvedValueOnce({
        id: 50,
        obligatorio: true,
        template: { id: 100, name: 'Template' },
      } as any);

      // Act
      await PlantillasService.addTemplate(1, 5, input as any);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ obligatorio: true }),
        })
      );
    });

    it('debe defaultear diasAnticipacion a 0 cuando no se proporciona', async () => {
      // Arrange
      const input = {
        templateId: 100,
        entityType: 'CAMION' as const,
        obligatorio: false,
        visibleChofer: true,
      };

      prismaMock.plantillaRequisitoTemplate.create.mockResolvedValueOnce({
        id: 50,
        diasAnticipacion: 0,
        template: { id: 100, name: 'Template' },
      } as any);

      // Act
      await PlantillasService.addTemplate(1, 5, input as any);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ diasAnticipacion: 0 }),
        })
      );
    });

    it('debe defaultear visibleChofer a true cuando no se proporciona', async () => {
      // Arrange
      const input = {
        templateId: 100,
        entityType: 'CHOFER' as const,
      };

      prismaMock.plantillaRequisitoTemplate.create.mockResolvedValueOnce({
        id: 50,
        visibleChofer: true,
        template: { id: 100, name: 'Template' },
      } as any);

      // Act
      await PlantillasService.addTemplate(1, 5, input as any);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ visibleChofer: true }),
        })
      );
    });

    it('debe respetar obligatorio=false cuando se pasa explícitamente', async () => {
      // Arrange
      const input = {
        templateId: 100,
        entityType: 'ACOPLADO' as const,
        obligatorio: false,
      };

      prismaMock.plantillaRequisitoTemplate.create.mockResolvedValueOnce({
        id: 50,
        obligatorio: false,
        template: { id: 100, name: 'Template' },
      } as any);

      // Act
      await PlantillasService.addTemplate(1, 5, input as any);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ obligatorio: false }),
        })
      );
    });
  });

  // ============================================================================
  // Gestión de Templates - updateTemplate
  // ============================================================================
  describe('updateTemplate', () => {
    it('debe actualizar configuración de un template en plantilla', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const templateConfigId = 50;

      const updateData = {
        obligatorio: false,
        diasAnticipacion: 14,
        visibleChofer: false,
      };

      const mockUpdated = {
        id: templateConfigId,
        templateId: 100,
        plantillaRequisitoId: 5,
        tenantEmpresaId,
        ...updateData,
      };

      prismaMock.plantillaRequisitoTemplate.update.mockResolvedValueOnce(mockUpdated as any);

      // Act
      const result = await PlantillasService.updateTemplate(
        tenantEmpresaId,
        templateConfigId,
        updateData
      );

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.update).toHaveBeenCalledWith({
        where: { id: templateConfigId },
        data: updateData,
      });
      expect(result).toEqual(mockUpdated);
    });

    it('debe actualizar solo obligatorio', async () => {
      // Arrange
      const updateData = { obligatorio: true };

      prismaMock.plantillaRequisitoTemplate.update.mockResolvedValueOnce({
        id: 50,
        obligatorio: true,
      } as any);

      // Act
      await PlantillasService.updateTemplate(1, 50, updateData);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: updateData,
      });
    });

    it('debe actualizar solo diasAnticipacion', async () => {
      // Arrange
      const updateData = { diasAnticipacion: 30 };

      prismaMock.plantillaRequisitoTemplate.update.mockResolvedValueOnce({
        id: 50,
        diasAnticipacion: 30,
      } as any);

      // Act
      await PlantillasService.updateTemplate(1, 50, updateData);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: updateData,
      });
    });

    it('debe actualizar solo visibleChofer', async () => {
      // Arrange
      const updateData = { visibleChofer: false };

      prismaMock.plantillaRequisitoTemplate.update.mockResolvedValueOnce({
        id: 50,
        visibleChofer: false,
      } as any);

      // Act
      await PlantillasService.updateTemplate(1, 50, updateData);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: updateData,
      });
    });
  });

  // ============================================================================
  // Gestión de Templates - removeTemplate
  // ============================================================================
  describe('removeTemplate', () => {
    it('debe eliminar un template de una plantilla', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const templateConfigId = 50;

      const mockDeleted = {
        id: templateConfigId,
        templateId: 100,
        plantillaRequisitoId: 5,
        tenantEmpresaId,
      };

      prismaMock.plantillaRequisitoTemplate.delete.mockResolvedValueOnce(mockDeleted as any);

      // Act
      const result = await PlantillasService.removeTemplate(tenantEmpresaId, templateConfigId);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.delete).toHaveBeenCalledWith({
        where: { id: templateConfigId },
      });
      expect(result).toEqual(mockDeleted);
    });

    it('debe lanzar error si template no existe', async () => {
      // Arrange
      prismaMock.plantillaRequisitoTemplate.delete.mockRejectedValueOnce(
        new Error('Template no encontrado')
      );

      // Act & Assert
      await expect(PlantillasService.removeTemplate(1, 999)).rejects.toThrow();
    });

    it('debería intentar eliminar incluso si se pasa tenantEmpresaId incorrecto', async () => {
      // Arrange: Este test verifica que la función NO valida tenantEmpresaId
      // (la validación está a nivel de middleware/controller)
      prismaMock.plantillaRequisitoTemplate.delete.mockResolvedValueOnce({ id: 50 } as any);

      // Act
      await PlantillasService.removeTemplate(999, 50); // tenant incorrecto

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.delete).toHaveBeenCalledWith({
        where: { id: 50 },
      });
    });
  });
});
/**
 * PARTE 3: Tests para consolidación de templates y gestión de equipos
 * Métodos: getConsolidatedTemplates, listByEquipo, assignToEquipo, 
 *          unassignFromEquipo, getEquipoConsolidatedTemplates
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { PlantillasService } from '../../src/services/plantillas.service';


describe('PlantillasService - Consolidación y Equipos', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Consolidación - getConsolidatedTemplates
  // ============================================================================
  describe('getConsolidatedTemplates', () => {
    it('debe retornar estructura vacía cuando plantillaIds es array vacío', async () => {
      // Arrange & Act
      const result = await PlantillasService.getConsolidatedTemplates(1, []);

      // Assert
      expect(result).toEqual({ templates: [], byEntityType: {} });
      expect(prismaMock.plantillaRequisitoTemplate.findMany).not.toHaveBeenCalled();
    });

    it('debe consolidar templates de múltiples plantillas', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const plantillaIds = [5, 6];

      const mockRequirements = [
        {
          id: 1,
          templateId: 100,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 7,
          visibleChofer: true,
          plantillaRequisitoId: 5,
          plantillaRequisito: {
            id: 5,
            nombre: 'Plantilla A',
            cliente: { id: 10, razonSocial: 'Cliente X' },
          },
          template: { id: 100, name: 'Licencia de Conducir' },
        },
        {
          id: 2,
          templateId: 100,
          entityType: 'CHOFER',
          obligatorio: false,
          diasAnticipacion: 14,
          visibleChofer: true,
          plantillaRequisitoId: 6,
          plantillaRequisito: {
            id: 6,
            nombre: 'Plantilla B',
            cliente: { id: 20, razonSocial: 'Cliente Y' },
          },
          template: { id: 100, name: 'Licencia de Conducir' },
        },
      ];

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(
        mockRequirements as any
      );

      // Act
      const result = await PlantillasService.getConsolidatedTemplates(tenantEmpresaId, plantillaIds);

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantEmpresaId, plantillaRequisitoId: { in: plantillaIds } },
        include: {
          template: true,
          plantillaRequisito: {
            include: { cliente: { select: { id: true, razonSocial: true } } },
          },
        },
        orderBy: [{ entityType: 'asc' }, { templateId: 'asc' }],
      });

      expect(result.templates).toBeDefined();
      expect(result.byEntityType).toBeDefined();
      expect(result.byEntityType.CHOFER).toBeDefined();
    });

    it('debe mergear correctamente requisitos duplicados (sin duplicar IDs) y aplicar reglas de consolidación', async () => {
      const tenantEmpresaId = 1;
      const plantillaIds = [5, 6];

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([
        // Primer requisito (sin template y sin cliente)
        {
          id: 1,
          templateId: 200,
          entityType: 'CAMION',
          obligatorio: false,
          diasAnticipacion: 5,
          visibleChofer: false,
          plantillaRequisitoId: 5,
          plantillaRequisito: {
            id: 5,
            nombre: 'Plantilla A',
            cliente: null,
          },
          template: null,
        },
        // Duplicado mismo template/entityType en otra plantilla: obliga=true, anticipación mayor y visibleChofer=true
        {
          id: 2,
          templateId: 200,
          entityType: 'CAMION',
          obligatorio: true,
          diasAnticipacion: 30,
          visibleChofer: true,
          plantillaRequisitoId: 6,
          plantillaRequisito: {
            id: 6,
            nombre: 'Plantilla B',
            cliente: { id: 20, razonSocial: 'Cliente Y' },
          },
          template: { id: 200, name: 'RTO' },
        },
        // Repetición exacta de plantillaRequisitoId=6 (no debe duplicar)
        {
          id: 3,
          templateId: 200,
          entityType: 'CAMION',
          obligatorio: false,
          diasAnticipacion: 10,
          visibleChofer: false,
          plantillaRequisitoId: 6,
          plantillaRequisito: {
            id: 6,
            nombre: 'Plantilla B',
            cliente: { id: 20, razonSocial: 'Cliente Y' },
          },
          template: { id: 200, name: 'RTO' },
        },
      ] as any);

      const result = await PlantillasService.getConsolidatedTemplates(tenantEmpresaId, plantillaIds);

      expect(result.templates).toHaveLength(1);
      const consolidated = result.templates[0] as any;

      // Reglas de consolidación
      expect(consolidated.templateId).toBe(200);
      expect(consolidated.entityType).toBe('CAMION');
      expect(consolidated.obligatorio).toBe(true); // obligatorio gana
      expect(consolidated.diasAnticipacion).toBe(30); // mayor anticipación gana
      expect(consolidated.visibleChofer).toBe(true); // si alguno lo setea, queda true

      // No debe duplicar IDs
      expect(consolidated.plantillaIds.sort()).toEqual([5, 6]);
      expect(consolidated.clienteIds.sort()).toEqual([0, 20]);
      expect(consolidated.clienteNames).toEqual(expect.arrayContaining(['Sin cliente', 'Cliente Y']));
    });

    it('debe agrupar correctamente por entityType (DADOR, EMPRESA_TRANSPORTISTA, etc)', async () => {
      // Arrange
      const mockRequirements = [
        {
          id: 1,
          templateId: 100,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 7,
          visibleChofer: true,
          plantillaRequisitoId: 5,
          plantillaRequisito: {
            id: 5,
            nombre: 'Plantilla A',
            cliente: { id: 10, razonSocial: 'Cliente X' },
          },
          template: { id: 100, name: 'Template 1' },
        },
        {
          id: 2,
          templateId: 101,
          entityType: 'CAMION',
          obligatorio: false,
          diasAnticipacion: 30,
          visibleChofer: false,
          plantillaRequisitoId: 5,
          plantillaRequisito: {
            id: 5,
            nombre: 'Plantilla A',
            cliente: { id: 10, razonSocial: 'Cliente X' },
          },
          template: { id: 101, name: 'Template 2' },
        },
      ];

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(
        mockRequirements as any
      );

      // Act
      const result = await PlantillasService.getConsolidatedTemplates(1, [5]);

      // Assert
      expect(result.byEntityType.CHOFER).toBeDefined();
      expect(result.byEntityType.CAMION).toBeDefined();
      expect(result.byEntityType.DADOR).toEqual([]);
    });

    it('debe no lanzar error cuando no hay templates', async () => {
      // Arrange
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await PlantillasService.getConsolidatedTemplates(1, [5, 6]);

      // Assert
      expect(result.templates).toEqual([]);
      expect(Object.values(result.byEntityType).every((v) => Array.isArray(v))).toBe(true);
    });
  });

  // ============================================================================
  // Gestión de Equipos - listByEquipo
  // ============================================================================
  describe('listByEquipo', () => {
    it('debe listar plantillas activas de un equipo por defecto', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const equipoId = 50;

      const mockAssociations = [
        {
          id: 1,
          equipoId,
          plantillaRequisitoId: 5,
          asignadoDesde: new Date('2024-01-01'),
          asignadoHasta: null,
          plantillaRequisito: {
            id: 5,
            nombre: 'Plantilla A',
            cliente: { id: 10, razonSocial: 'Cliente X' },
            _count: { templates: 3 },
          },
        },
      ];

      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce(mockAssociations as any);

      // Act
      const result = await PlantillasService.listByEquipo(tenantEmpresaId, equipoId);

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.findMany).toHaveBeenCalledWith({
        where: {
          equipoId,
          asignadoHasta: null,
          plantillaRequisito: { tenantEmpresaId },
        },
        include: {
          plantillaRequisito: {
            include: {
              cliente: { select: { id: true, razonSocial: true } },
              _count: { select: { templates: true } },
            },
          },
        },
        orderBy: { asignadoDesde: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    it('debe listar todas las plantillas (activas e inactivas) cuando soloActivas=false', async () => {
      // Arrange
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce([]);

      // Act
      await PlantillasService.listByEquipo(1, 50, false);

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ asignadoHasta: null }),
        })
      );
    });

    it('debe ordenar por asignadoDesde descendente', async () => {
      // Arrange
      const mockAssociations = [
        {
          id: 1,
          equipoId: 50,
          plantillaRequisitoId: 5,
          asignadoDesde: new Date('2024-03-01'),
          asignadoHasta: null,
          plantillaRequisito: { id: 5, nombre: 'Plantilla A', _count: { templates: 1 } },
        },
        {
          id: 2,
          equipoId: 50,
          plantillaRequisitoId: 6,
          asignadoDesde: new Date('2024-01-01'),
          asignadoHasta: null,
          plantillaRequisito: { id: 6, nombre: 'Plantilla B', _count: { templates: 2 } },
        },
      ];

      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce(mockAssociations as any);

      // Act
      const result = await PlantillasService.listByEquipo(1, 50);

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { asignadoDesde: 'desc' },
        })
      );
      // Primer elemento debe tener fecha más reciente
      expect((result as any)[0]?.asignadoDesde.getTime()).toBeGreaterThan(
        (result as any)[1]?.asignadoDesde.getTime()
      );
    });

    it('debe retornar array vacío cuando equipo no tiene plantillas', async () => {
      // Arrange
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await PlantillasService.listByEquipo(1, 999);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Gestión de Equipos - assignToEquipo
  // ============================================================================
  describe('assignToEquipo', () => {
    it('debe asignar una plantilla a un equipo', async () => {
      // Arrange
      const equipoId = 50;
      const plantillaRequisitoId = 5;
      const now = new Date();

      const mockCreated = {
        id: 1,
        equipoId,
        plantillaRequisitoId,
        asignadoDesde: now,
        asignadoHasta: null,
        plantillaRequisito: {
          id: plantillaRequisitoId,
          nombre: 'Plantilla A',
          cliente: { id: 10, razonSocial: 'Cliente X' },
        },
      };

      prismaMock.equipoPlantillaRequisito.create.mockResolvedValueOnce(mockCreated as any);

      // Act
      const result = await PlantillasService.assignToEquipo(equipoId, plantillaRequisitoId);

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.create).toHaveBeenCalledWith({
        data: {
          equipoId,
          plantillaRequisitoId,
          asignadoDesde: expect.any(Date),
        },
        include: {
          plantillaRequisito: {
            include: { cliente: { select: { id: true, razonSocial: true } } },
          },
        },
      });
      expect(result?.equipoId).toBe(equipoId);
      expect(result?.plantillaRequisitoId).toBe(plantillaRequisitoId);
    });

    it('debe retornar la asociación creada con información del cliente', async () => {
      // Arrange
      const mockCreated = {
        id: 1,
        equipoId: 50,
        plantillaRequisitoId: 5,
        asignadoDesde: new Date(),
        asignadoHasta: null,
        plantillaRequisito: {
          id: 5,
          nombre: 'Plantilla Test',
          cliente: { id: 10, razonSocial: 'Cliente Test SA' },
        },
      };

      prismaMock.equipoPlantillaRequisito.create.mockResolvedValueOnce(mockCreated as any);

      // Act
      const result = await PlantillasService.assignToEquipo(50, 5);

      // Assert
      expect((result as any)?.plantillaRequisito?.cliente?.razonSocial).toBe('Cliente Test SA');
    });
  });

  // ============================================================================
  // Gestión de Equipos - unassignFromEquipo
  // ============================================================================
  describe('unassignFromEquipo', () => {
    it('debe desasignar una plantilla de un equipo (marca asignadoHasta)', async () => {
      // Arrange
      const equipoId = 50;
      const plantillaRequisitoId = 5;
      const asignadoDesde = new Date('2024-01-01');

      // Mock findFirst
      prismaMock.equipoPlantillaRequisito.findFirst.mockResolvedValueOnce({
        id: 1,
        equipoId,
        plantillaRequisitoId,
        asignadoDesde,
        asignadoHasta: null,
      } as any);

      // Mock $executeRaw
      prismaMock.$executeRaw.mockResolvedValueOnce(1); // 1 row updated

      // Act
      const result = await PlantillasService.unassignFromEquipo(equipoId, plantillaRequisitoId);

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.findFirst).toHaveBeenCalledWith({
        where: {
          equipoId,
          plantillaRequisitoId,
          asignadoHasta: null,
        },
        orderBy: { asignadoDesde: 'desc' },
      });

      // Verificar que se ejecutó raw SQL
      expect(prismaMock.$executeRaw).toHaveBeenCalled();
    });

    it('debe lanzar error cuando no encuentra la asociación activa', async () => {
      // Arrange
      prismaMock.equipoPlantillaRequisito.findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(PlantillasService.unassignFromEquipo(50, 5)).rejects.toThrow(
        'Asociación no encontrada'
      );
      expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
    });

    it('debe buscar la asociación más reciente (orderBy asignadoDesde desc)', async () => {
      // Arrange
      const latestDate = new Date('2024-02-01');
      prismaMock.equipoPlantillaRequisito.findFirst.mockResolvedValueOnce({
        id: 2,
        asignadoDesde: latestDate,
        asignadoHasta: null,
      } as any);

      prismaMock.$executeRaw.mockResolvedValueOnce(1);

      // Act
      await PlantillasService.unassignFromEquipo(50, 5);

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { asignadoDesde: 'desc' },
        })
      );
    });
  });

  // ============================================================================
  // Gestión de Equipos - getEquipoConsolidatedTemplates
  // ============================================================================
  describe('getEquipoConsolidatedTemplates', () => {
    it('debe obtener templates consolidados del equipo', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const equipoId = 50;

      const mockAssociaciones = [
        {
          equipoId,
          plantillaRequisitoId: 5,
          asignadoHasta: null,
        },
        {
          equipoId,
          plantillaRequisitoId: 6,
          asignadoHasta: null,
        },
      ];

      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce(mockAssociaciones as any);

      // Mock de getConsolidatedTemplates (este método llama a ese)
      // Necesitamos spy en el método o hacer que el mock retorne lo esperado
      const mockConsolidated = {
        templates: [
          {
            templateId: 100,
            templateName: 'Licencia',
            entityType: 'CHOFER',
            obligatorio: true,
            diasAnticipacion: 7,
            visibleChofer: true,
            plantillaIds: [5, 6],
            plantillaNames: ['Plantilla A', 'Plantilla B'],
            clienteIds: [10, 20],
            clienteNames: ['Cliente X', 'Cliente Y'],
          },
        ],
        byEntityType: { CHOFER: [null] },
      };

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await PlantillasService.getEquipoConsolidatedTemplates(
        tenantEmpresaId,
        equipoId
      );

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.findMany).toHaveBeenCalledWith({
        where: {
          equipoId,
          asignadoHasta: null,
          plantillaRequisito: { tenantEmpresaId, activo: true },
        },
        select: { plantillaRequisitoId: true },
      });
    });

    it('debe retornar estructura vacía cuando equipo no tiene plantillas', async () => {
      // Arrange
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce([]);

      // Act
      const result = await PlantillasService.getEquipoConsolidatedTemplates(1, 999);

      // Assert
      expect(result.templates).toEqual([]);
    });

    it('debe filtrar solo plantillas activas del tenant', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const equipoId = 50;

      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce([]);

      // Act
      await PlantillasService.getEquipoConsolidatedTemplates(tenantEmpresaId, equipoId);

      // Assert
      expect(prismaMock.equipoPlantillaRequisito.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            equipoId,
            asignadoHasta: null,
            plantillaRequisito: { tenantEmpresaId, activo: true },
          },
        })
      );
    });
  });
});
/**
 * PARTE 4: Tests para funcionalidades avanzadas
 * Métodos: getMissingDocumentsForNewPlantilla, duplicate
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { PlantillasService } from '../../src/services/plantillas.service';


describe('PlantillasService - Funcionalidades Avanzadas', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  // ============================================================================
  // Documentos Faltantes - getMissingDocumentsForNewPlantilla
  // ============================================================================
  describe('getMissingDocumentsForNewPlantilla', () => {
    it('debe calcular documentos faltantes para nueva plantilla en equipo', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const equipoId = 50;
      const newPlantillaId = 5;

      // Mock de requisitos de nueva plantilla
      const newPlantillaReqs = [
        {
          id: 1,
          templateId: 100,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 7,
          visibleChofer: true,
          plantillaRequisitoId: newPlantillaId,
          template: { id: 100, name: 'Licencia de Conducir' },
          plantillaRequisito: {
            id: newPlantillaId,
            nombre: 'Plantilla Nueva',
            cliente: { id: 10, razonSocial: 'Cliente X' },
          },
        },
      ];

      // Mock de asociaciones existentes (plantillas actuales del equipo)
      const existingAssocs = [];

      // Mock de documentos existentes
      const existingDocs: any[] = [];

      // Mock de equipo
      const mockEquipo = {
        id: equipoId,
        driverId: 100,
        truckId: 200,
        trailerId: 300,
        empresaTransportistaId: 50,
        tenantEmpresaId,
        dadorCargaId: 10,
      };

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(newPlantillaReqs as any);
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce(existingAssocs as any);
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([] as any);
      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo as any);
      prismaMock.document.findMany.mockResolvedValueOnce(existingDocs as any);

      // Act
      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(
        tenantEmpresaId,
        equipoId,
        newPlantillaId
      );

      // Assert
      expect(result.plantillaName).toBe('Plantilla Nueva');
      expect(result.clienteName).toBe('Cliente X');
      expect(result.missingTemplates).toBeInstanceOf(Array);
      expect(result.missingTemplates).toHaveLength(1);
      expect((result.missingTemplates[0] as any)?.templateId).toBe(100);
    });

    it('debe no incluir documentos que ya están cargados', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const equipoId = 50;
      const newPlantillaId = 5;

      const newPlantillaReqs = [
        {
          id: 1,
          templateId: 100,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 7,
          visibleChofer: true,
          plantillaRequisitoId: newPlantillaId,
          template: { id: 100, name: 'Licencia' },
          plantillaRequisito: {
            id: newPlantillaId,
            nombre: 'Plantilla Nueva',
            cliente: { id: 10, razonSocial: 'Cliente X' },
          },
        },
      ];

      const existingAssocs: any[] = [];

      const mockEquipo = {
        id: equipoId,
        driverId: 100,
        truckId: 200,
        trailerId: 300,
        empresaTransportistaId: 50,
        tenantEmpresaId,
        dadorCargaId: 10,
      };

      // Documento ya cargado con mismo template y entityType
      const existingDocs = [{ templateId: 100, entityType: 'CHOFER' }];

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(newPlantillaReqs as any);
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce(existingAssocs as any);
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([] as any);
      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo as any);
      prismaMock.document.findMany.mockResolvedValueOnce(existingDocs as any);

      // Act
      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(
        tenantEmpresaId,
        equipoId,
        newPlantillaId
      );

      // Assert
      expect(result.missingTemplates).toHaveLength(0);
    });

    it('debe identificar si un template es nuevo requisito (no en plantillas existentes)', async () => {
      // Arrange
      const newPlantillaReqs = [
        {
          id: 1,
          templateId: 999, // Template NUEVO, no en plantillas existentes
          entityType: 'ACOPLADO',
          obligatorio: true,
          diasAnticipacion: 15,
          visibleChofer: false,
          plantillaRequisitoId: 5,
          template: { id: 999, name: 'Nuevo Requisito' },
          plantillaRequisito: {
            id: 5,
            nombre: 'Plantilla Nueva',
            cliente: { id: 10, razonSocial: 'Cliente X' },
          },
        },
      ];

      const existingAssocs: any[] = [];
      const existingTemplateReqs: any[] = []; // Sin requisitos existentes

      const mockEquipo = {
        id: 50,
        driverId: 100,
        truckId: 200,
        trailerId: 300,
        empresaTransportistaId: 50,
        tenantEmpresaId: 1,
        dadorCargaId: 10,
      };

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(newPlantillaReqs as any);
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce(existingAssocs as any);
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(
        existingTemplateReqs as any
      );
      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo as any);
      prismaMock.document.findMany.mockResolvedValueOnce([] as any);

      // Act
      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 50, 5);

      // Assert
      expect(result.missingTemplates[0]).toBeDefined();
      expect((result.missingTemplates[0] as any)?.isNewRequirement).toBe(true);
    });

    it('debe retornar resultado vacío cuando equipo no existe', async () => {
      // Arrange
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([]);
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce([]);
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([]);
      prismaMock.equipo.findUnique.mockResolvedValueOnce(null);

      // Act
      const result = await PlantillasService.getMissingDocumentsForNewPlantilla(1, 999, 5);

      // Assert
      expect(result.missingTemplates).toEqual([]);
      expect(result.plantillaName).toBe('');
    });

    it('debe filtrar documentos por status válidos (APROBADO, PENDIENTE, etc)', async () => {
      // Arrange
      const newPlantillaReqs = [
        {
          id: 1,
          templateId: 100,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 7,
          visibleChofer: true,
          plantillaRequisitoId: 5,
          template: { id: 100, name: 'Licencia' },
          plantillaRequisito: {
            id: 5,
            nombre: 'Plantilla Nueva',
            cliente: { id: 10, razonSocial: 'Cliente X' },
          },
        },
      ];

      const mockEquipo = {
        id: 50,
        driverId: 100,
        truckId: 200,
        trailerId: 300,
        empresaTransportistaId: 50,
        tenantEmpresaId: 1,
        dadorCargaId: 10,
      };

      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce(newPlantillaReqs as any);
      prismaMock.equipoPlantillaRequisito.findMany.mockResolvedValueOnce([]);
      prismaMock.plantillaRequisitoTemplate.findMany.mockResolvedValueOnce([]);
      prismaMock.equipo.findUnique.mockResolvedValueOnce(mockEquipo as any);
      prismaMock.document.findMany.mockResolvedValueOnce([]);

      // Act
      await PlantillasService.getMissingDocumentsForNewPlantilla(1, 50, 5);

      // Assert
      // Verificar que el query filtra por status correcto
      expect(prismaMock.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['APROBADO', 'PENDIENTE', 'VALIDANDO', 'CLASIFICANDO', 'PENDIENTE_APROBACION'] },
          }),
        })
      );
    });
  });

  // ============================================================================
  // Duplicación - duplicate
  // ============================================================================
  describe('duplicate', () => {
    it('debe duplicar una plantilla con todos sus templates', async () => {
      // Arrange
      const tenantEmpresaId = 1;
      const plantillaId = 5;
      const nuevoNombre = 'Copia de Plantilla Original';

      const mockOriginal = {
        id: plantillaId,
        nombre: 'Plantilla Original',
        descripcion: 'Descripción original',
        tenantEmpresaId,
        clienteId: 10,
        activo: true,
        templates: [
          {
            id: 1,
            templateId: 100,
            plantillaRequisitoId: plantillaId,
            tenantEmpresaId,
            entityType: 'CHOFER',
            obligatorio: true,
            diasAnticipacion: 7,
            visibleChofer: true,
          },
          {
            id: 2,
            templateId: 101,
            plantillaRequisitoId: plantillaId,
            tenantEmpresaId,
            entityType: 'CAMION',
            obligatorio: false,
            diasAnticipacion: 30,
            visibleChofer: false,
          },
        ],
      };

      const mockNueva = {
        id: 100,
        nombre: nuevoNombre,
        descripcion: `Copia de: ${mockOriginal.descripcion}`,
        tenantEmpresaId,
        clienteId: 10,
        activo: true,
      };

      // Mock transaction
      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(mockOriginal as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        // Simular la transacción
        const result = await callback(prismaMock);
        return result;
      });

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockNueva as any);
      prismaMock.plantillaRequisitoTemplate.createMany.mockResolvedValueOnce({
        count: 2,
      } as any);

      // Act
      const result = await PlantillasService.duplicate(tenantEmpresaId, plantillaId, nuevoNombre);

      // Assert
      expect(prismaMock.plantillaRequisito.findFirst).toHaveBeenCalledWith({
        where: { id: plantillaId, tenantEmpresaId },
        include: { templates: true },
      });

      expect(result?.nombre).toBe(nuevoNombre);
      expect(result?.clienteId).toBe(10);
      expect(result?.activo).toBe(true);
    });

    it('debe lanzar error cuando plantilla original no existe', async () => {
      // Arrange
      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(PlantillasService.duplicate(1, 999, 'Nueva')).rejects.toThrow(
        'Plantilla no encontrada'
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('debe copiar templates de la plantilla original', async () => {
      // Arrange
      const mockOriginal = {
        id: 5,
        nombre: 'Original',
        descripcion: 'Desc',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
        templates: [
          {
            id: 1,
            templateId: 100,
            plantillaRequisitoId: 5,
            tenantEmpresaId: 1,
            entityType: 'CHOFER',
            obligatorio: true,
            diasAnticipacion: 7,
            visibleChofer: true,
          },
        ],
      };

      const mockNueva = {
        id: 100,
        nombre: 'Copia',
        descripcion: `Copia de: ${mockOriginal.descripcion}`,
        tenantEmpresaId: mockOriginal.tenantEmpresaId,
        clienteId: mockOriginal.clienteId,
        activo: true,
      };

      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(mockOriginal as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const result = await callback(prismaMock);
        return result;
      });

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockNueva as any);
      prismaMock.plantillaRequisitoTemplate.createMany.mockResolvedValueOnce({ count: 1 } as any);

      // Act
      await PlantillasService.duplicate(1, 5, 'Copia');

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            tenantEmpresaId: 1,
            plantillaRequisitoId: 100,
            templateId: 100,
            entityType: 'CHOFER',
            obligatorio: true,
            diasAnticipacion: 7,
            visibleChofer: true,
          }),
        ]),
      });
    });

    it('debe no copiar templates si la plantilla original no tiene ninguno', async () => {
      // Arrange
      const mockOriginal = {
        id: 5,
        nombre: 'Sin Templates',
        descripcion: 'Original',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
        templates: [],
      };

      const mockNueva = {
        id: 100,
        nombre: 'Copia',
        descripcion: 'Copia de Original',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
      };

      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(mockOriginal as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const result = await callback(prismaMock);
        return result;
      });

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockNueva as any);

      // Act
      await PlantillasService.duplicate(1, 5, 'Copia');

      // Assert
      expect(prismaMock.plantillaRequisitoTemplate.createMany).not.toHaveBeenCalled();
    });

    it('debe actualizar descripción con prefijo "Copia de:" si existe', async () => {
      // Arrange
      const mockOriginal = {
        id: 5,
        nombre: 'Original',
        descripcion: 'Descripción importante',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
        templates: [],
      };

      const mockNueva = {
        id: 100,
        nombre: 'Copia',
        descripcion: 'Copia de: Descripción importante',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
      };

      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(mockOriginal as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const result = await callback(prismaMock);
        return result;
      });

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockNueva as any);

      // Act
      await PlantillasService.duplicate(1, 5, 'Copia');

      // Assert
      expect(prismaMock.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            descripcion: 'Copia de: Descripción importante',
          }),
        })
      );
    });

    it('debe usar nombre de plantilla como fallback en descripción si no tiene descripción', async () => {
      // Arrange
      const mockOriginal = {
        id: 5,
        nombre: 'Plantilla Sin Descripción',
        descripcion: null,
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
        templates: [],
      };

      const mockNueva = {
        id: 100,
        nombre: 'Copia',
        descripcion: 'Copia de Plantilla Sin Descripción',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
      };

      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(mockOriginal as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const result = await callback(prismaMock);
        return result;
      });

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockNueva as any);

      // Act
      await PlantillasService.duplicate(1, 5, 'Copia');

      // Assert
      expect(prismaMock.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            descripcion: 'Copia de Plantilla Sin Descripción',
          }),
        })
      );
    });

    it('debe mantener activo=true en la copia', async () => {
      // Arrange
      const mockOriginal = {
        id: 5,
        nombre: 'Original Inactiva',
        descripcion: 'Desc',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: false, // Original inactiva
        templates: [],
      };

      const mockNueva = {
        id: 100,
        nombre: 'Copia',
        descripcion: 'Copia de Desc',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true, // Copia SIEMPRE activa
      };

      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(mockOriginal as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const result = await callback(prismaMock);
        return result;
      });

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockNueva as any);

      // Act
      await PlantillasService.duplicate(1, 5, 'Copia');

      // Assert
      expect(prismaMock.plantillaRequisito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activo: true }),
        })
      );
    });

    it('debe retornar solo la plantilla creada (sin templates en respuesta)', async () => {
      // Arrange
      const mockOriginal = {
        id: 5,
        nombre: 'Original',
        descripcion: 'Desc',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
        templates: [{ id: 1, templateId: 100 }],
      };

      const mockNueva = {
        id: 100,
        nombre: 'Copia',
        descripcion: 'Copia de Desc',
        tenantEmpresaId: 1,
        clienteId: 10,
        activo: true,
      };

      prismaMock.plantillaRequisito.findFirst.mockResolvedValueOnce(mockOriginal as any);

      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        const result = await callback(prismaMock);
        return result;
      });

      prismaMock.plantillaRequisito.create.mockResolvedValueOnce(mockNueva as any);
      prismaMock.plantillaRequisitoTemplate.createMany.mockResolvedValueOnce({ count: 1 } as any);

      // Act
      const result = await PlantillasService.duplicate(1, 5, 'Copia');

      // Assert
      expect(result?.id).toBe(100);
      expect(result?.nombre).toBe('Copia');
      expect((result as any)?.templates).toBeUndefined();
    });
  });
});
