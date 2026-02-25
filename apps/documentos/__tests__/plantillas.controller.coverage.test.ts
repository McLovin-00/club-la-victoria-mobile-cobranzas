/**
 * @jest-environment node
 */

jest.mock('../src/services/plantillas.service', () => ({
  PlantillasService: {
    listAll: jest.fn(),
    listByCliente: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    duplicate: jest.fn(),
    listTemplates: jest.fn(),
    addTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    removeTemplate: jest.fn(),
    getConsolidatedTemplates: jest.fn(),
    listByEquipo: jest.fn(),
    assignToEquipo: jest.fn(),
    unassignFromEquipo: jest.fn(),
    getEquipoConsolidatedTemplates: jest.fn(),
    getMissingDocumentsForNewPlantilla: jest.fn(),
  },
}));

import { PlantillasController } from '../src/controllers/plantillas.controller';
import { PlantillasService } from '../src/services/plantillas.service';

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    tenantId: 1,
    user: { userId: 1, role: 'SUPERADMIN' },
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('PlantillasController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listAll', () => {
    it('should list all plantillas without activo filter', async () => {
      (PlantillasService.listAll as jest.Mock).mockResolvedValue([{ id: 1 }]);

      const req = mockReq({ query: {} });
      const res = mockRes();

      await PlantillasController.listAll(req, res);

      expect(PlantillasService.listAll).toHaveBeenCalledWith(1, undefined);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
    });

    it('should list all plantillas with activo=true', async () => {
      (PlantillasService.listAll as jest.Mock).mockResolvedValue([]);

      const req = mockReq({ query: { activo: 'true' } });
      const res = mockRes();

      await PlantillasController.listAll(req, res);

      expect(PlantillasService.listAll).toHaveBeenCalledWith(1, true);
    });

    it('should list all plantillas with activo=false', async () => {
      (PlantillasService.listAll as jest.Mock).mockResolvedValue([]);

      const req = mockReq({ query: { activo: 'false' } });
      const res = mockRes();

      await PlantillasController.listAll(req, res);

      expect(PlantillasService.listAll).toHaveBeenCalledWith(1, false);
    });
  });

  describe('listByCliente', () => {
    it('should list plantillas by clienteId without activo filter', async () => {
      (PlantillasService.listByCliente as jest.Mock).mockResolvedValue([{ id: 2 }]);

      const req = mockReq({ params: { clienteId: '5' }, query: {} });
      const res = mockRes();

      await PlantillasController.listByCliente(req, res);

      expect(PlantillasService.listByCliente).toHaveBeenCalledWith(1, 5, undefined);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 2 }] });
    });

    it('should list plantillas by clienteId with activo=true', async () => {
      (PlantillasService.listByCliente as jest.Mock).mockResolvedValue([]);

      const req = mockReq({ params: { clienteId: '5' }, query: { activo: 'true' } });
      const res = mockRes();

      await PlantillasController.listByCliente(req, res);

      expect(PlantillasService.listByCliente).toHaveBeenCalledWith(1, 5, true);
    });
  });

  describe('getById', () => {
    it('should return plantilla when found', async () => {
      const plantilla = { id: 1, nombre: 'Test' };
      (PlantillasService.getById as jest.Mock).mockResolvedValue(plantilla);

      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await PlantillasController.getById(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: plantilla });
    });

    it('should return 404 when not found', async () => {
      (PlantillasService.getById as jest.Mock).mockResolvedValue(null);

      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();

      await PlantillasController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Plantilla no encontrada' });
    });
  });

  describe('create', () => {
    it('should create a plantilla', async () => {
      const created = { id: 10, nombre: 'Nueva', clienteId: 5 };
      (PlantillasService.create as jest.Mock).mockResolvedValue(created);

      const req = mockReq({
        params: { clienteId: '5' },
        body: { nombre: 'Nueva', descripcion: 'desc', activo: true },
      });
      const res = mockRes();

      await PlantillasController.create(req, res);

      expect(PlantillasService.create).toHaveBeenCalledWith({
        tenantEmpresaId: 1,
        clienteId: 5,
        nombre: 'Nueva',
        descripcion: 'desc',
        activo: true,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    });
  });

  describe('update', () => {
    it('should update a plantilla', async () => {
      const updated = { id: 1, nombre: 'Editada' };
      (PlantillasService.update as jest.Mock).mockResolvedValue(updated);

      const req = mockReq({
        params: { id: '1' },
        body: { nombre: 'Editada', descripcion: 'new desc', activo: false },
      });
      const res = mockRes();

      await PlantillasController.update(req, res);

      expect(PlantillasService.update).toHaveBeenCalledWith(1, 1, {
        nombre: 'Editada', descripcion: 'new desc', activo: false,
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('remove', () => {
    it('should remove a plantilla', async () => {
      (PlantillasService.remove as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await PlantillasController.remove(req, res);

      expect(PlantillasService.remove).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('duplicate', () => {
    it('should duplicate with nuevoNombre', async () => {
      const duplicated = { id: 2, nombre: 'Copia' };
      (PlantillasService.duplicate as jest.Mock).mockResolvedValue(duplicated);

      const req = mockReq({ params: { id: '1' }, body: { nuevoNombre: 'Copia' } });
      const res = mockRes();

      await PlantillasController.duplicate(req, res);

      expect(PlantillasService.duplicate).toHaveBeenCalledWith(1, 1, 'Copia');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when nuevoNombre is missing', async () => {
      const req = mockReq({ params: { id: '1' }, body: {} });
      const res = mockRes();

      await PlantillasController.duplicate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'nuevoNombre es requerido' });
    });
  });

  describe('listTemplates', () => {
    it('should list templates for a plantilla', async () => {
      const templates = [{ id: 1, templateId: 10 }];
      (PlantillasService.listTemplates as jest.Mock).mockResolvedValue(templates);

      const req = mockReq({ params: { id: '5' } });
      const res = mockRes();

      await PlantillasController.listTemplates(req, res);

      expect(PlantillasService.listTemplates).toHaveBeenCalledWith(1, 5);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: templates });
    });
  });

  describe('addTemplate', () => {
    it('should add a template to a plantilla', async () => {
      const added = { id: 1, plantillaId: 5, templateId: 10 };
      (PlantillasService.addTemplate as jest.Mock).mockResolvedValue(added);

      const req = mockReq({
        params: { id: '5' },
        body: {
          templateId: 10,
          entityType: 'CHOFER',
          obligatorio: true,
          diasAnticipacion: 30,
          visibleChofer: false,
        },
      });
      const res = mockRes();

      await PlantillasController.addTemplate(req, res);

      expect(PlantillasService.addTemplate).toHaveBeenCalledWith(1, 5, {
        templateId: 10,
        entityType: 'CHOFER',
        obligatorio: true,
        diasAnticipacion: 30,
        visibleChofer: false,
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateTemplate', () => {
    it('should update template config', async () => {
      const updated = { id: 1, obligatorio: false };
      (PlantillasService.updateTemplate as jest.Mock).mockResolvedValue(updated);

      const req = mockReq({
        params: { plantillaId: '5', templateConfigId: '1' },
        body: { obligatorio: false, diasAnticipacion: 15, visibleChofer: true },
      });
      const res = mockRes();

      await PlantillasController.updateTemplate(req, res);

      expect(PlantillasService.updateTemplate).toHaveBeenCalledWith(1, 1, {
        obligatorio: false,
        diasAnticipacion: 15,
        visibleChofer: true,
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
    });
  });

  describe('removeTemplate', () => {
    it('should remove template from plantilla', async () => {
      (PlantillasService.removeTemplate as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { plantillaId: '5', templateConfigId: '1' } });
      const res = mockRes();

      await PlantillasController.removeTemplate(req, res);

      expect(PlantillasService.removeTemplate).toHaveBeenCalledWith(1, 1);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getConsolidatedTemplates', () => {
    it('should return empty when no plantillaIds', async () => {
      const req = mockReq({ query: { plantillaIds: undefined } });
      const res = mockRes();

      await PlantillasController.getConsolidatedTemplates(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { templates: [], byEntityType: {} },
      });
    });

    it('should return empty when plantillaIds is empty array', async () => {
      const req = mockReq({ query: { plantillaIds: [] } });
      const res = mockRes();

      await PlantillasController.getConsolidatedTemplates(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { templates: [], byEntityType: {} },
      });
    });

    it('should return consolidated templates with valid ids', async () => {
      const consolidated = { templates: [{ id: 1 }], byEntityType: { CHOFER: [{ id: 1 }] } };
      (PlantillasService.getConsolidatedTemplates as jest.Mock).mockResolvedValue(consolidated);

      const req = mockReq({ query: { plantillaIds: [1, 2, 3] } });
      const res = mockRes();

      await PlantillasController.getConsolidatedTemplates(req, res);

      expect(PlantillasService.getConsolidatedTemplates).toHaveBeenCalledWith(1, [1, 2, 3]);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: consolidated });
    });
  });

  describe('listByEquipo', () => {
    it('should list plantillas by equipo with default soloActivas=true', async () => {
      (PlantillasService.listByEquipo as jest.Mock).mockResolvedValue([{ id: 1 }]);

      const req = mockReq({ params: { equipoId: '7' }, query: {} });
      const res = mockRes();

      await PlantillasController.listByEquipo(req, res);

      expect(PlantillasService.listByEquipo).toHaveBeenCalledWith(1, 7, true);
    });

    it('should list plantillas by equipo with soloActivas=false', async () => {
      (PlantillasService.listByEquipo as jest.Mock).mockResolvedValue([]);

      const req = mockReq({ params: { equipoId: '7' }, query: { soloActivas: 'false' } });
      const res = mockRes();

      await PlantillasController.listByEquipo(req, res);

      expect(PlantillasService.listByEquipo).toHaveBeenCalledWith(1, 7, false);
    });
  });

  describe('assignToEquipo', () => {
    it('should assign plantilla to equipo', async () => {
      const assigned = { id: 1, equipoId: 7, plantillaRequisitoId: 3 };
      (PlantillasService.assignToEquipo as jest.Mock).mockResolvedValue(assigned);

      const req = mockReq({
        params: { equipoId: '7' },
        body: { plantillaRequisitoId: 3 },
      });
      const res = mockRes();

      await PlantillasController.assignToEquipo(req, res);

      expect(PlantillasService.assignToEquipo).toHaveBeenCalledWith(7, 3);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when plantillaRequisitoId is missing', async () => {
      const req = mockReq({ params: { equipoId: '7' }, body: {} });
      const res = mockRes();

      await PlantillasController.assignToEquipo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'plantillaRequisitoId es requerido',
      });
    });
  });

  describe('unassignFromEquipo', () => {
    it('should unassign plantilla from equipo', async () => {
      (PlantillasService.unassignFromEquipo as jest.Mock).mockResolvedValue(undefined);

      const req = mockReq({ params: { equipoId: '7', plantillaId: '3' } });
      const res = mockRes();

      await PlantillasController.unassignFromEquipo(req, res);

      expect(PlantillasService.unassignFromEquipo).toHaveBeenCalledWith(7, 3);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getEquipoConsolidatedTemplates', () => {
    it('should return consolidated templates for equipo', async () => {
      const data = { templates: [{ id: 1 }] };
      (PlantillasService.getEquipoConsolidatedTemplates as jest.Mock).mockResolvedValue(data);

      const req = mockReq({ params: { equipoId: '7' } });
      const res = mockRes();

      await PlantillasController.getEquipoConsolidatedTemplates(req, res);

      expect(PlantillasService.getEquipoConsolidatedTemplates).toHaveBeenCalledWith(1, 7);
      expect(res.json).toHaveBeenCalledWith({ success: true, data });
    });
  });

  describe('checkMissingDocuments', () => {
    it('should check missing documents for plantilla on equipo', async () => {
      const missing = { missing: [{ templateId: 1, entityType: 'CHOFER' }] };
      (PlantillasService.getMissingDocumentsForNewPlantilla as jest.Mock).mockResolvedValue(missing);

      const req = mockReq({ params: { equipoId: '7', plantillaId: '3' } });
      const res = mockRes();

      await PlantillasController.checkMissingDocuments(req, res);

      expect(PlantillasService.getMissingDocumentsForNewPlantilla).toHaveBeenCalledWith(1, 7, 3);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: missing });
    });
  });
});
