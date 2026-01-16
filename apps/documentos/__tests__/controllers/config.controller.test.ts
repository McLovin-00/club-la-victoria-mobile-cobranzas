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

import { ConfigController } from '../../src/controllers/config.controller';

function createRes(): Response & { json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as any;
}

describe('ConfigController', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('getEmpresaConfig', () => {
    it('devuelve config default + templates activos', async () => {
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1, name: 'DNI', entityType: 'CHOFER' }]);
      const res = createRes();

      await ConfigController.getEmpresaConfig({ params: { dadorId: '9' }, user: { userId: 1 }, tenantId: 1 } as any, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            config: expect.objectContaining({ empresaId: 9, enabled: false, templateIds: [] }),
            availableTemplates: [{ id: 1, name: 'DNI', entityType: 'CHOFER' }],
          }),
        })
      );
    });

    it('lanza createError en error inesperado', async () => {
      prismaMock.documentTemplate.findMany.mockRejectedValueOnce(new Error('boom'));
      const res = createRes();

      await expect(
        ConfigController.getEmpresaConfig({ params: { dadorId: '9' }, user: { userId: 1 }, tenantId: 1 } as any, res)
      ).rejects.toMatchObject({ statusCode: 500, code: 'GET_CONFIG_ERROR' });
    });
  });

  describe('updateEmpresaConfig', () => {
    it('rechaza templateIds inválidos', async () => {
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);
      const res = createRes();

      await expect(
        ConfigController.updateEmpresaConfig(
          { params: { dadorId: '9' }, body: { templateIds: [1, 2] }, user: { userId: 1 }, tenantId: 1, method: 'POST', originalUrl: '/x', path: '/x' } as any,
          res
        )
      ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_TEMPLATE_IDS' });
    });

    it('actualiza config y hace audit (fire-and-forget)', async () => {
      prismaMock.documentTemplate.findMany.mockResolvedValueOnce([{ id: 1 }]);
      const res = createRes();

      await ConfigController.updateEmpresaConfig(
        {
          params: { dadorId: '9' },
          body: { enabled: true, templateIds: [1], alertEmail: 'a@b.com', alertPhone: '1' },
          user: { userId: 1, role: 'ADMIN' },
          tenantId: 1,
          method: 'POST',
          originalUrl: '/api/docs/config/9',
          path: '/api/docs/config/9',
        } as any,
        res
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ empresaId: 9, enabled: true, templateIds: [1] }),
        })
      );
    });

    it('si el error ya tiene code, lo rethrow', async () => {
      const err: any = new Error('x');
      err.code = 'SOME_CODE';
      prismaMock.documentTemplate.findMany.mockRejectedValueOnce(err);
      const res = createRes();

      await expect(
        ConfigController.updateEmpresaConfig(
          { params: { dadorId: '9' }, body: { templateIds: [1] }, tenantId: 1, user: { userId: 1 }, method: 'POST', path: '/x' } as any,
          res
        )
      ).rejects.toBe(err);
    });
  });

  describe('getEmpresaStatus', () => {
    it('devuelve enabled=false por default, sin stats', async () => {
      const res = createRes();
      await ConfigController.getEmpresaStatus({ params: { dadorId: '9' }, user: { userId: 1 }, tenantId: 1 } as any, res);
      const payload = res.json.mock.calls[0][0] as any;
      expect(payload.success).toBe(true);
      expect(payload.data).toMatchObject({ empresaId: 9, enabled: false, hasTemplates: false, stats: null });
    });

    it('lanza createError en error inesperado', async () => {
      const res = createRes();
      // Forzamos un throw dentro del try al leer params.dadorId
      const req: any = {
        params: new Proxy(
          {},
          {
            get() {
              throw new Error('boom');
            },
          }
        ),
        user: { userId: 1 },
        tenantId: 1,
      };
      await expect(ConfigController.getEmpresaStatus(req, res)).rejects.toMatchObject({ statusCode: 500, code: 'GET_STATUS_ERROR' });
    });
  });
});


