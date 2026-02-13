/**
 * Propósito: tests unitarios de `PlantillasController` para subir cobertura sin depender de Prisma/DB.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../src/services/plantillas.service', () => ({
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
  },
}));

import { PlantillasController } from '../../src/controllers/plantillas.controller';
import { PlantillasService } from '../../src/services/plantillas.service';

type MockRes = {
  status: jest.Mock;
  json: jest.Mock;
};

function createRes(): MockRes {
  const res: MockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('PlantillasController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('listAll parsea activo=true desde query y responde success', async () => {
    (PlantillasService.listAll as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
    const req: any = { tenantId: 1, query: { activo: 'true' } };
    const res = createRes();

    await PlantillasController.listAll(req, res as any);

    expect(PlantillasService.listAll).toHaveBeenCalledWith(1, true);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });

  it('listByCliente parsea clienteId y activo undefined', async () => {
    (PlantillasService.listByCliente as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
    const req: any = { tenantId: 1, params: { clienteId: '10' }, query: {} };
    const res = createRes();

    await PlantillasController.listByCliente(req, res as any);

    expect(PlantillasService.listByCliente).toHaveBeenCalledWith(1, 10, undefined);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });

  it('getById devuelve 404 si no existe', async () => {
    (PlantillasService.getById as jest.Mock).mockResolvedValueOnce(null);
    const req: any = { tenantId: 1, params: { id: '999' } };
    const res = createRes();

    await PlantillasController.getById(req, res as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Plantilla no encontrada' });
  });

  it('duplicate devuelve 400 si falta nuevoNombre', async () => {
    const req: any = { tenantId: 1, params: { id: '5' }, body: {} };
    const res = createRes();

    await PlantillasController.duplicate(req, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'nuevoNombre es requerido' });
    expect(PlantillasService.duplicate).not.toHaveBeenCalled();
  });

  it('getConsolidatedTemplates retorna estructura vacía si no hay plantillaIds', async () => {
    const req: any = { tenantId: 1, query: { plantillaIds: [] } };
    const res = createRes();

    await PlantillasController.getConsolidatedTemplates(req, res as any);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { templates: [], byEntityType: {} },
    });
    expect(PlantillasService.getConsolidatedTemplates).not.toHaveBeenCalled();
  });

  it('assignToEquipo devuelve 400 si falta plantillaRequisitoId', async () => {
    const req: any = { tenantId: 1, params: { equipoId: '10' }, body: {} };
    const res = createRes();

    await PlantillasController.assignToEquipo(req, res as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'plantillaRequisitoId es requerido' });
    expect(PlantillasService.assignToEquipo).not.toHaveBeenCalled();
  });

  it('assignToEquipo responde 201 cuando el service asocia', async () => {
    (PlantillasService.assignToEquipo as jest.Mock).mockResolvedValueOnce({ id: 1 });
    const req: any = { tenantId: 1, params: { equipoId: '10' }, body: { plantillaRequisitoId: 99 } };
    const res = createRes();

    await PlantillasController.assignToEquipo(req, res as any);

    expect(PlantillasService.assignToEquipo).toHaveBeenCalledWith(10, 99);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
  });

  it('create responde 201 y delega a service con tenant + clienteId', async () => {
    (PlantillasService.create as jest.Mock).mockResolvedValueOnce({ id: 10 });
    const req: any = {
      tenantId: 1,
      params: { clienteId: '22' },
      body: { nombre: 'P1', descripcion: 'D', activo: false },
    };
    const res = createRes();

    await PlantillasController.create(req, res as any);

    expect(PlantillasService.create).toHaveBeenCalledWith({
      tenantEmpresaId: 1,
      clienteId: 22,
      nombre: 'P1',
      descripcion: 'D',
      activo: false,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 10 } });
  });

  it('update responde success y delega a service', async () => {
    (PlantillasService.update as jest.Mock).mockResolvedValueOnce({ id: 5, nombre: 'N' });
    const req: any = { tenantId: 1, params: { id: '5' }, body: { nombre: 'N' } };
    const res = createRes();

    await PlantillasController.update(req, res as any);

    expect(PlantillasService.update).toHaveBeenCalledWith(1, 5, expect.objectContaining({ nombre: 'N' }));
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 5, nombre: 'N' } });
  });

  it('remove responde success cuando el service elimina', async () => {
    (PlantillasService.remove as jest.Mock).mockResolvedValueOnce(undefined);
    const req: any = { tenantId: 1, params: { id: '5' } };
    const res = createRes();

    await PlantillasController.remove(req, res as any);

    expect(PlantillasService.remove).toHaveBeenCalledWith(1, 5);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('getConsolidatedTemplates llama al service cuando hay IDs', async () => {
    (PlantillasService.getConsolidatedTemplates as jest.Mock).mockResolvedValueOnce({ templates: [{ templateId: 1 }], byEntityType: {} });
    const req: any = { tenantId: 1, query: { plantillaIds: [1, 2] } };
    const res = createRes();

    await PlantillasController.getConsolidatedTemplates(req, res as any);

    expect(PlantillasService.getConsolidatedTemplates).toHaveBeenCalledWith(1, [1, 2]);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { templates: [{ templateId: 1 }], byEntityType: {} } });
  });

  it('listByEquipo parsea soloActivas=false y responde success', async () => {
    (PlantillasService.listByEquipo as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
    const req: any = { tenantId: 1, params: { equipoId: '99' }, query: { soloActivas: 'false' } };
    const res = createRes();

    await PlantillasController.listByEquipo(req, res as any);

    expect(PlantillasService.listByEquipo).toHaveBeenCalledWith(1, 99, false);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });

  it('unassignFromEquipo desasocia y responde success', async () => {
    (PlantillasService.unassignFromEquipo as jest.Mock).mockResolvedValueOnce(undefined);
    const req: any = { tenantId: 1, params: { equipoId: '10', plantillaId: '11' } };
    const res = createRes();

    await PlantillasController.unassignFromEquipo(req, res as any);

    expect(PlantillasService.unassignFromEquipo).toHaveBeenCalledWith(10, 11);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('getEquipoConsolidatedTemplates responde success', async () => {
    (PlantillasService.getEquipoConsolidatedTemplates as jest.Mock).mockResolvedValueOnce({ templates: [], byEntityType: {} });
    const req: any = { tenantId: 1, params: { equipoId: '10' } };
    const res = createRes();

    await PlantillasController.getEquipoConsolidatedTemplates(req, res as any);

    expect(PlantillasService.getEquipoConsolidatedTemplates).toHaveBeenCalledWith(1, 10);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { templates: [], byEntityType: {} } });
  });

  it('listTemplates responde success', async () => {
    (PlantillasService.listTemplates as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
    const req: any = { tenantId: 1, params: { id: '5' } };
    const res = createRes();

    await PlantillasController.listTemplates(req, res as any);

    expect(PlantillasService.listTemplates).toHaveBeenCalledWith(1, 5);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });
  });

  it('addTemplate responde 201 y delega a service', async () => {
    (PlantillasService.addTemplate as jest.Mock).mockResolvedValueOnce({ id: 1 });
    const req: any = {
      tenantId: 1,
      params: { id: '5' },
      body: { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 7, visibleChofer: false },
    };
    const res = createRes();

    await PlantillasController.addTemplate(req, res as any);

    expect(PlantillasService.addTemplate).toHaveBeenCalledWith(1, 5, expect.objectContaining({ templateId: 1, entityType: 'CHOFER' }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
  });

  it('updateTemplate responde success', async () => {
    (PlantillasService.updateTemplate as jest.Mock).mockResolvedValueOnce({ id: 1 });
    const req: any = { tenantId: 1, params: { templateConfigId: '77' }, body: { obligatorio: false } };
    const res = createRes();

    await PlantillasController.updateTemplate(req, res as any);

    expect(PlantillasService.updateTemplate).toHaveBeenCalledWith(1, 77, expect.objectContaining({ obligatorio: false }));
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
  });

  it('removeTemplate responde success', async () => {
    (PlantillasService.removeTemplate as jest.Mock).mockResolvedValueOnce(undefined);
    const req: any = { tenantId: 1, params: { templateConfigId: '77' } };
    const res = createRes();

    await PlantillasController.removeTemplate(req, res as any);

    expect(PlantillasService.removeTemplate).toHaveBeenCalledWith(1, 77);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

