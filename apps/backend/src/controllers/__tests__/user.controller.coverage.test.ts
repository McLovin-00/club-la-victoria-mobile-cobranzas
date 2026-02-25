/**
 * Coverage tests for PlatformUserController – getUsuarios,
 * getUsuarioById, updateEmpresa, updateOwnEmpresa with all
 * role-restriction branches (ADMIN, SUPERADMIN), validation errors,
 * search/role/empresa filters, error paths, and JWT generation.
 */

import type { Response } from 'express';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const prismaMock = {
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  empresa: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../config/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockValidationResult = jest.fn(() => ({ isEmpty: () => true, array: () => [] }));
jest.mock('express-validator', () => ({
  validationResult: (...args: any[]) => mockValidationResult(...args),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'new-jwt-token'),
}));

import { PlatformUserController } from '../user.controller';

function createRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function makeReq(overrides: Record<string, any> = {}): any {
  return {
    user: { userId: 1, role: 'SUPERADMIN', empresaId: null },
    query: {},
    params: {},
    body: {},
    tenantId: null,
    ...overrides,
  };
}

describe('PlatformUserController (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  // ==========================================================================
  // getUsuarios
  // ==========================================================================
  describe('getUsuarios', () => {
    it('returns paginated user list for superadmin', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 1, email: 'a@b.com', role: 'ADMIN', nombre: 'A', apellido: 'B', empresaId: 1, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prismaMock.user.count.mockResolvedValue(1);

      const req = makeReq({ query: { page: '1', limit: '10' } });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, pagination: expect.objectContaining({ total: 1 }) })
      );
    });

    it('applies ADMIN role restrictions', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const req = makeReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10 },
        query: {},
      });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaId: 10, role: { not: 'SUPERADMIN' } }),
        })
      );
    });

    it('applies SUPERADMIN tenant filter', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const req = makeReq({
        user: { userId: 1, role: 'SUPERADMIN', empresaId: null },
        tenantId: 5,
        query: {},
      });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaId: 5 }),
        })
      );
    });

    it('applies search filter', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const req = makeReq({ query: { search: 'john' } });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.objectContaining({ contains: 'john' }) }),
            ]),
          }),
        })
      );
    });

    it('applies role filter', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const req = makeReq({ query: { role: 'admin' } });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        })
      );
    });

    it('applies empresaId filter', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const req = makeReq({ query: { empresaId: '10' } });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaId: 10 }),
        })
      );
    });

    it('ignores invalid empresaId', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const req = makeReq({ query: { empresaId: 'invalid' } });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 400 on validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'invalid' }],
      });

      const req = makeReq();
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on internal error', async () => {
      prismaMock.user.findMany.mockRejectedValue(new Error('db fail'));

      const req = makeReq();
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('caps limit to 100', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const req = makeReq({ query: { limit: '200' } });
      const res = createRes();

      await PlatformUserController.getUsuarios(req, res);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });

  // ==========================================================================
  // getUsuarioById
  // ==========================================================================
  describe('getUsuarioById', () => {
    it('returns user when found', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 5, email: 'x@x.com', role: 'ADMIN', nombre: 'A', apellido: 'B', empresaId: 1, createdAt: new Date(), updatedAt: new Date(),
      });

      const req = makeReq({ params: { id: '5' } });
      const res = createRes();

      await PlatformUserController.getUsuarioById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      const req = makeReq({ params: { id: '999' } });
      const res = createRes();

      await PlatformUserController.getUsuarioById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('applies ADMIN restrictions', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 5 });

      const req = makeReq({
        user: { userId: 2, role: 'ADMIN', empresaId: 10 },
        params: { id: '5' },
      });
      const res = createRes();

      await PlatformUserController.getUsuarioById(req, res);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaId: 10, role: { not: 'SUPERADMIN' } }),
        })
      );
    });

    it('applies SUPERADMIN tenant restrictions', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 5 });

      const req = makeReq({
        user: { userId: 1, role: 'SUPERADMIN', empresaId: null },
        tenantId: 3,
        params: { id: '5' },
      });
      const res = createRes();

      await PlatformUserController.getUsuarioById(req, res);

      expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ empresaId: 3 }),
        })
      );
    });

    it('returns 400 on validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'invalid id' }],
      });

      const req = makeReq({ params: { id: 'abc' } });
      const res = createRes();

      await PlatformUserController.getUsuarioById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on internal error', async () => {
      prismaMock.user.findFirst.mockRejectedValue(new Error('db fail'));

      const req = makeReq({ params: { id: '1' } });
      const res = createRes();

      await PlatformUserController.getUsuarioById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // updateEmpresa
  // ==========================================================================
  describe('updateEmpresa', () => {
    it('updates empresa successfully', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue({ id: 20, nombre: 'Empresa' });
      prismaMock.user.update.mockResolvedValue({
        id: 5, email: 'x@x.com', role: 'ADMIN', empresaId: 20,
      });

      const req = makeReq({ params: { id: '5' }, body: { empresaId: 20 } });
      const res = createRes();

      await PlatformUserController.updateEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('sets empresa to null', async () => {
      prismaMock.user.update.mockResolvedValue({
        id: 5, email: 'x@x.com', role: 'ADMIN', empresaId: null,
      });

      const req = makeReq({ params: { id: '5' }, body: { empresaId: null } });
      const res = createRes();

      await PlatformUserController.updateEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when empresa not found', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue(null);

      const req = makeReq({ params: { id: '5' }, body: { empresaId: 999 } });
      const res = createRes();

      await PlatformUserController.updateEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 on validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'invalid' }],
      });

      const req = makeReq({ params: { id: '5' }, body: {} });
      const res = createRes();

      await PlatformUserController.updateEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on internal error', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue({ id: 20 });
      prismaMock.user.update.mockRejectedValue(new Error('fail'));

      const req = makeReq({ params: { id: '5' }, body: { empresaId: 20 } });
      const res = createRes();

      await PlatformUserController.updateEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // updateOwnEmpresa
  // ==========================================================================
  describe('updateOwnEmpresa', () => {
    it('updates own empresa and returns new JWT', async () => {
      prismaMock.empresa.findUnique
        .mockResolvedValueOnce({ id: 20, nombre: 'Emp' }) // validation
        .mockResolvedValueOnce({ id: 20, nombre: 'Emp', descripcion: 'Desc' }); // fetch after update
      prismaMock.user.update.mockResolvedValue({
        id: 1, email: 'x@x.com', role: 'SUPERADMIN', empresaId: 20,
      });

      const req = makeReq({ body: { empresaId: 20 } });
      const res = createRes();

      await PlatformUserController.updateOwnEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'new-jwt-token' })
      );
    });

    it('sets own empresa to null', async () => {
      prismaMock.user.update.mockResolvedValue({
        id: 1, email: 'x@x.com', role: 'SUPERADMIN', empresaId: null,
      });

      const req = makeReq({ body: { empresaId: null } });
      const res = createRes();

      await PlatformUserController.updateOwnEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when empresa not found', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue(null);

      const req = makeReq({ body: { empresaId: 999 } });
      const res = createRes();

      await PlatformUserController.updateOwnEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 on validation errors', async () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'invalid' }],
      });

      const req = makeReq({ body: {} });
      const res = createRes();

      await PlatformUserController.updateOwnEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 on internal error', async () => {
      prismaMock.empresa.findUnique.mockResolvedValue({ id: 20 });
      prismaMock.user.update.mockRejectedValue(new Error('fail'));

      const req = makeReq({ body: { empresaId: 20 } });
      const res = createRes();

      await PlatformUserController.updateOwnEmpresa(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
