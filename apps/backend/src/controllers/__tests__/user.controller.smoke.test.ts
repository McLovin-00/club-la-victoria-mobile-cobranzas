/**
 * Propósito: Smoke tests de `PlatformUserController` para subir coverage sin DB real.
 * Cubre validación (400) y flujo de éxito (200) de `getUsuarios`, incluyendo restricciones por rol.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Response } from 'express';

const prismaMock = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../config/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('express-validator', () => ({
  validationResult: jest.fn(),
}));

import { validationResult } from 'express-validator';
import { PlatformUserController } from '../user.controller';

function createRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('PlatformUserController.getUsuarios (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 400 si validationResult trae errores', async () => {
    (validationResult as unknown as jest.Mock).mockReturnValueOnce({
      isEmpty: () => false,
      array: () => [{ msg: 'x' }],
    });

    const req: any = { query: {}, user: { userId: 1, role: 'SUPERADMIN', empresaId: 1 }, tenantId: 1 };
    const res = createRes();

    await PlatformUserController.getUsuarios(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 200 con lista/paginación para superadmin', async () => {
    (validationResult as unknown as jest.Mock).mockReturnValueOnce({ isEmpty: () => true, array: () => [] });
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: 1, email: 'a@b.com', role: 'ADMIN', nombre: 'A', apellido: 'B', empresaId: 1, createdAt: new Date(), updatedAt: new Date() },
    ]);
    prismaMock.user.count.mockResolvedValueOnce(1);

    const req: any = {
      query: { page: '1', limit: '10', search: 'a' },
      user: { userId: 1, role: 'SUPERADMIN', empresaId: 99 },
      tenantId: 1,
    };
    const res = createRes();

    await PlatformUserController.getUsuarios(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(prismaMock.user.findMany).toHaveBeenCalled();
    expect(prismaMock.user.count).toHaveBeenCalled();
  });

  it('admin restringe por empresaId y excluye SUPERADMIN', async () => {
    (validationResult as unknown as jest.Mock).mockReturnValueOnce({ isEmpty: () => true, array: () => [] });
    prismaMock.user.findMany.mockResolvedValueOnce([]);
    prismaMock.user.count.mockResolvedValueOnce(0);

    const req: any = {
      query: { page: '1', limit: '10', empresaId: '123' },
      user: { userId: 2, role: 'ADMIN', empresaId: 7 },
      tenantId: 7,
    };
    const res = createRes();

    await PlatformUserController.getUsuarios(req, res);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 7,
          role: { not: 'SUPERADMIN' },
        }),
      })
    );
  });
});


