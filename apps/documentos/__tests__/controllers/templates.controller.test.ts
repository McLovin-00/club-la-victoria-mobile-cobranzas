import type { Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, status: number, code?: string) => {
    const err: any = new Error(message);
    err.statusCode = status;
    if (code) err.code = code;
    return err;
  },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn() },
}));

import { TemplatesController } from '../../src/controllers/templates.controller';

function createRes(): Response & { json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as any;
}

describe('TemplatesController', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('getTemplateById', () => {
    it('404 si no existe', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(null);
      const res = createRes();
      await expect(
        TemplatesController.getTemplateById({ params: { id: '1' }, tenantId: 1, user: { userId: 1 } } as any, res)
      ).rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
    });

    it('devuelve template adaptado', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({
        id: 1,
        name: 'DNI',
        entityType: 'CHOFER',
        active: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      });
      const res = createRes();
      await TemplatesController.getTemplateById({ params: { id: '1' }, tenantId: 1, user: { userId: 1 } } as any, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: 1, nombre: 'DNI', isActive: true, entityType: 'CHOFER' }),
        })
      );
    });

    it('rethrow si el error ya tiene code', async () => {
      const err: any = new Error('x');
      err.code = 'ALREADY';
      prismaMock.documentTemplate.findUnique.mockRejectedValueOnce(err);
      const res = createRes();
      await expect(
        TemplatesController.getTemplateById({ params: { id: '1' }, tenantId: 1, user: { userId: 1 } } as any, res)
      ).rejects.toBe(err);
    });
  });

  describe('getTemplates', () => {
    it('lista templates y adapta contrato', async () => {
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([
        { id: 1, name: 'DNI', entityType: 'CHOFER', active: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const res = createRes();
      await TemplatesController.getTemplates({ query: { entityType: 'CHOFER', active: true }, tenantId: 1, user: { userId: 1 } } as any, res);
      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1, nombre: 'DNI', isActive: true, entityType: 'CHOFER' }),
      ]);
    });
  });

  describe('createTemplate', () => {
    it('409 si ya existe', async () => {
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 1 });
      const res = createRes();
      await expect(
        TemplatesController.createTemplate(
          { body: { name: 'DNI', entityType: 'CHOFER' }, tenantId: 1, user: { userId: 1 }, method: 'POST', path: '/x' } as any,
          res
        )
      ).rejects.toMatchObject({ statusCode: 409, code: 'TEMPLATE_ALREADY_EXISTS' });
    });

    it('crea template y responde 201', async () => {
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce(null);
      prismaMock.documentTemplate.create.mockResolvedValueOnce({ id: 1, name: 'DNI', entityType: 'CHOFER', active: true, createdAt: new Date(), updatedAt: new Date() });
      const res = createRes();
      await TemplatesController.createTemplate(
        { body: { name: ' DNI ', entityType: 'CHOFER' }, tenantId: 1, user: { userId: 1, role: 'SUPERADMIN' }, method: 'POST', originalUrl: '/x', path: '/x' } as any,
        res
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateTemplate', () => {
    it('404 si no existe', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(null);
      const res = createRes();
      await expect(
        TemplatesController.updateTemplate(
          { params: { id: '1' }, body: { name: 'X' }, tenantId: 1, user: { userId: 1 }, method: 'PUT', path: '/x' } as any,
          res
        )
      ).rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
    });

    it('409 si hay conflicto de nombre', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'A', entityType: 'CHOFER' });
      prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 2 });
      const res = createRes();
      await expect(
        TemplatesController.updateTemplate(
          { params: { id: '1' }, body: { name: 'B' }, tenantId: 1, user: { userId: 1 }, method: 'PUT', path: '/x' } as any,
          res
        )
      ).rejects.toMatchObject({ statusCode: 409, code: 'TEMPLATE_NAME_CONFLICT' });
    });

    it('actualiza usando isActive (compatibilidad frontend)', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'A', entityType: 'CHOFER' });
      prismaMock.documentTemplate.update.mockResolvedValueOnce({ id: 1, name: 'A', entityType: 'CHOFER', active: false, createdAt: new Date(), updatedAt: new Date() });
      const res = createRes();
      await TemplatesController.updateTemplate(
        { params: { id: '1' }, body: { isActive: false }, tenantId: 1, user: { userId: 1 }, method: 'PUT', originalUrl: '/x', path: '/x' } as any,
        res
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('deleteTemplate', () => {
    it('404 si no existe', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce(null);
      const res = createRes();
      await expect(
        TemplatesController.deleteTemplate({ params: { id: '1' }, tenantId: 1, user: { userId: 1 }, method: 'DELETE', path: '/x' } as any, res)
      ).rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
    });

    it('409 si está en uso', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'A', entityType: 'CHOFER', documents: [{}], clientRequirements: [] });
      const res = createRes();
      await expect(
        TemplatesController.deleteTemplate({ params: { id: '1' }, tenantId: 1, user: { userId: 1 }, method: 'DELETE', path: '/x' } as any, res)
      ).rejects.toMatchObject({ statusCode: 409, code: 'TEMPLATE_IN_USE' });
    });

    it('borra si no está en uso', async () => {
      prismaMock.documentTemplate.findUnique.mockResolvedValueOnce({ id: 1, name: 'A', entityType: 'CHOFER', documents: [], clientRequirements: [] });
      prismaMock.documentTemplate.delete.mockResolvedValueOnce({ id: 1 } as any);
      const res = createRes();
      await TemplatesController.deleteTemplate(
        { params: { id: '1' }, tenantId: 1, user: { userId: 1, role: 'SUPERADMIN' }, method: 'DELETE', originalUrl: '/x', path: '/x' } as any,
        res
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});


