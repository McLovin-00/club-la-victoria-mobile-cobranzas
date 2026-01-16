import type { Response } from 'express';
import type { AuthRequest } from '../../src/middlewares/auth.middleware';


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

import { EntityDataController } from '../../src/controllers/entity-data.controller';

function createRes(): Response & { json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as any;
}

describe('EntityDataController', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('getExtractedData', () => {
    it('400 si params inválidos', async () => {
      const res = createRes();
      await EntityDataController.getExtractedData({ tenantId: 1, params: { entityType: '', entityId: 'x' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 si no hay datos ni disparidades', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, uploadedAt: new Date(), template: { name: 'DNI' }, classification: { aiResponse: null } },
      ] as any);
      const res = createRes();
      await EntityDataController.getExtractedData({ tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('procesa aiResponse + disparidades + lastValidation', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([
        {
          id: 1,
          uploadedAt: new Date('2025-01-01'),
          template: { name: 'DNI' },
          classification: {
            aiResponse: { datosExtraidos: { dni: '1' }, datosNuevos: { nombre: 'Juan' } },
            disparidades: [{ campo: 'dni', expected: '1', actual: '2' }],
            validationStatus: 'validated',
            updatedAt: '2025-01-02T00:00:00.000Z',
          },
        },
        {
          id: 2,
          uploadedAt: new Date('2025-01-03'),
          template: { name: 'Licencia' },
          classification: {
            aiResponse: { datosExtraidos: { licencia: 'A' } },
            disparidades: [],
            validationStatus: 'validated',
            updatedAt: '2025-01-05T00:00:00.000Z',
          },
        },
      ] as any);

      const res = createRes();
      await EntityDataController.getExtractedData({ tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' } } as any, res);

      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data.extractedData).toMatchObject({ dni: '1', nombre: 'Juan', licencia: 'A' });
      expect(payload.data.disparidades[0]).toMatchObject({ campo: 'dni', documentId: 1, templateName: 'DNI' });
      expect(payload.data.lastValidation).toBeInstanceOf(Date);
    });

    it('500 en error inesperado', async () => {
      prismaMock.document.findMany.mockRejectedValueOnce(new Error('boom'));
      const res = createRes();
      await EntityDataController.getExtractedData({ tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteExtractedData', () => {
    it('400 si params inválidos', async () => {
      const res = createRes();
      await EntityDataController.deleteExtractedData({ tenantId: 1, params: { entityType: '', entityId: 'x' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('no hace updateMany si no hay docs', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([]);
      const res = createRes();
      await EntityDataController.deleteExtractedData({ tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' } } as any, res);
      expect(prismaMock.documentClassification.updateMany).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, documentsAffected: 0 }));
    });

    it('updateMany si hay docs', async () => {
      prismaMock.document.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
      prismaMock.documentClassification.updateMany.mockResolvedValueOnce({ count: 2 } as any);
      const res = createRes();
      await EntityDataController.deleteExtractedData({ tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' } } as any, res);
      expect(prismaMock.documentClassification.updateMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, documentsAffected: 2 }));
    });
  });

  describe('updateExtractedData', () => {
    it('400 si falta data', async () => {
      const res = createRes();
      await EntityDataController.updateExtractedData(
        { tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' }, body: {} } as any,
        res
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 si no hay doc con clasificación', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce(null);
      const res = createRes();
      await EntityDataController.updateExtractedData(
        { tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' }, body: { data: { x: 1 } }, user: { userId: 7 } } as any,
        res
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('actualiza aiResponse mergeando datosExtraidos y marca manuallyEdited', async () => {
      prismaMock.document.findFirst.mockResolvedValueOnce({
        id: 1,
        classification: { id: 99, aiResponse: { datosExtraidos: { a: 1 } } },
      } as unknown);
      prismaMock.documentClassification.update.mockResolvedValueOnce({ id: 99 } as unknown);

      const res = createRes();
      const req: Partial<AuthRequest> = {
        tenantId: 1,
        params: { entityType: 'CHOFER', entityId: '10' },
        body: { data: { b: 2 } },
        user: { userId: 7 } as AuthRequest['user'],
      };
      await EntityDataController.updateExtractedData(req as AuthRequest, res);

      expect(prismaMock.documentClassification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 99 },
          data: expect.objectContaining({
            aiResponse: expect.objectContaining({
              datosExtraidos: { a: 1, b: 2 },
              manuallyEdited: true,
              editedBy: 7,
            }),
          }),
        })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('500 si hay error inesperado', async () => {
      prismaMock.document.findFirst.mockRejectedValueOnce(new Error('boom'));
      const res = createRes();
      const req: Partial<AuthRequest> = {
        tenantId: 1,
        params: { entityType: 'CHOFER', entityId: '10' },
        body: { data: { b: 2 } },
        user: { userId: 7 } as AuthRequest['user'],
      };
      await EntityDataController.updateExtractedData(req as AuthRequest, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });


  describe('getExtractionHistory', () => {
    it('400 si params inválidos', async () => {
      const res = createRes();
      await EntityDataController.getExtractionHistory({ tenantId: 1, params: { entityType: '', entityId: 'x' }, query: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('lista logs con paginación', async () => {
      prismaMock.entityExtractionLog.findMany.mockResolvedValueOnce([{ id: 1 }]);
      prismaMock.entityExtractionLog.count.mockResolvedValueOnce(21);
      const res = createRes();
      await EntityDataController.getExtractionHistory(
        { tenantId: 1, params: { entityType: 'CHOFER', entityId: '10' }, query: { page: '2', limit: '200' } } as any,
        res
      );
      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.pagination).toMatchObject({ page: 2, limit: 100, total: 21, pages: 1 });
    });
  });

  describe('listExtractedData', () => {
    it('lista data con filtro entityType y limit cap', async () => {
      prismaMock.entityExtractedData.findMany.mockResolvedValueOnce([{ id: 1 }]);
      prismaMock.entityExtractedData.count.mockResolvedValueOnce(1);
      const res = createRes();
      await EntityDataController.listExtractedData(
        { tenantId: 1, query: { entityType: 'CHOFER', page: '1', limit: '999' } } as any,
        res
      );
      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.pagination.limit).toBe(100);
    });
  });
});


