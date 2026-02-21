/**
 * Tests reales para controllers/user.controller.ts (PlatformUserController)
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// JWT + express-validator mocks
const jwtSign = jest.fn((..._args: unknown[]) => 'token');
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { sign: (...args: unknown[]) => jwtSign(...args) },
  sign: (...args: unknown[]) => jwtSign(...args),
}));

let validationErrors: any[] = [];
jest.mock('express-validator', () => ({
  validationResult: () => ({
    isEmpty: () => validationErrors.length === 0,
    array: () => validationErrors,
  }),
}));

const prisma = {
  user: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  empresa: { findUnique: jest.fn() },
};
jest.mock('../../config/prisma', () => ({ prisma }));

import { PlatformUserController } from '../user.controller';

describe('PlatformUserController (real)', () => {
  const originalJwtEnv = {
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validationErrors = [];
  });

  afterEach(() => {
    process.env.JWT_PRIVATE_KEY = originalJwtEnv.JWT_PRIVATE_KEY;
    process.env.JWT_PRIVATE_KEY_PATH = originalJwtEnv.JWT_PRIVATE_KEY_PATH;
    jest.useRealTimers();
  });

  it('getUsuarios 400 on validation error; applies admin restrictions; returns pagination', async () => {
    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await PlatformUserController.getUsuarios({ user: { userId: 1, role: 'ADMIN', empresaId: 2 }, query: {} } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    prisma.user.findMany.mockResolvedValueOnce([{ id: 1, email: 'a', role: 'OPERATOR', createdAt: new Date(), updatedAt: new Date() }]);
    prisma.user.count.mockResolvedValueOnce(1);
    const res1 = createMockRes();
    await PlatformUserController.getUsuarios({ user: { userId: 1, role: 'ADMIN', empresaId: 2 }, query: { page: '1', limit: '10', search: 'a' } } as any, res1 as any);
    // Admin: fuerza empresaId y excluye SUPERADMIN
    const call = prisma.user.findMany.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call.where.empresaId).toBe(2);
    expect(call.where.role).toEqual({ not: 'SUPERADMIN' });
    expect(res1.status).toHaveBeenCalledWith(200);
  });

  it('getUsuarios returns 500 on prisma error', async () => {
    prisma.user.findMany.mockRejectedValueOnce(new Error('db'));
    const res = createMockRes();
    await PlatformUserController.getUsuarios({ user: { userId: 1, role: 'ADMIN', empresaId: 2 }, query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getUsuarioById returns 404 when not found; 200 when found', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    const res0 = createMockRes();
    await PlatformUserController.getUsuarioById({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '9' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(404);

    prisma.user.findFirst.mockResolvedValueOnce({ id: 9, email: 'a', role: 'ADMIN', createdAt: new Date(), updatedAt: new Date() });
    const res1 = createMockRes();
    await PlatformUserController.getUsuarioById({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '9' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);
  });

  it('getUsuarioById returns 400 on validation error and 500 on exception', async () => {
    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await PlatformUserController.getUsuarioById({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '1' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    prisma.user.findFirst.mockRejectedValueOnce(new Error('db'));
    const res1 = createMockRes();
    await PlatformUserController.getUsuarioById({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '1' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(500);
  });

  it('updateEmpresa validates empresa existence and updates user', async () => {
    prisma.empresa.findUnique.mockResolvedValueOnce(null);
    const res0 = createMockRes();
    await PlatformUserController.updateEmpresa({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '9' }, body: { empresaId: 123 } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(404);

    prisma.empresa.findUnique.mockResolvedValueOnce({ id: 1, nombre: 'E' });
    prisma.user.update.mockResolvedValueOnce({ id: 9, email: 'a', role: 'OPERATOR', empresaId: 1 });
    const res1 = createMockRes();
    await PlatformUserController.updateEmpresa({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '9' }, body: { empresaId: 1 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);
  });

  it('updateEmpresa returns 400 on validation error and 500 on exception', async () => {
    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await PlatformUserController.updateEmpresa({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '1' }, body: {} } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    prisma.empresa.findUnique.mockRejectedValueOnce(new Error('db'));
    const res1 = createMockRes();
    await PlatformUserController.updateEmpresa({ user: { userId: 1, role: 'SUPERADMIN' }, params: { id: '1' }, body: { empresaId: 2 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(500);
  });

  it('updateOwnEmpresa returns 404 if empresa missing; returns token + empresa data on success', async () => {
    prisma.empresa.findUnique.mockResolvedValueOnce(null);
    const res0 = createMockRes();
    await PlatformUserController.updateOwnEmpresa({ user: { userId: 1, role: 'SUPERADMIN', empresaId: null }, body: { empresaId: 999 } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(404);

    prisma.empresa.findUnique.mockResolvedValueOnce({ id: 2, nombre: 'E' });
    prisma.user.update.mockResolvedValueOnce({ id: 1, email: 'a', role: 'SUPERADMIN', empresaId: 2 });
    prisma.empresa.findUnique.mockResolvedValueOnce({ id: 2, nombre: 'E', descripcion: 'd' });
    const res1 = createMockRes();
    await PlatformUserController.updateOwnEmpresa({ user: { userId: 1, role: 'SUPERADMIN', empresaId: null }, body: { empresaId: 2 } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(200);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'token', success: true }));
  });

  it('updateOwnEmpresa handles validation errors and empresaId null branch', async () => {
    validationErrors = [{ msg: 'bad' }];
    const res0 = createMockRes();
    await PlatformUserController.updateOwnEmpresa({ user: { userId: 1, role: 'SUPERADMIN', empresaId: null }, body: {} } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(400);

    validationErrors = [];
    process.env.JWT_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----';
    prisma.user.update.mockResolvedValueOnce({ id: 1, email: 'a', role: 'SUPERADMIN', empresaId: null });

    jest.useFakeTimers();
    const fixedDate = new Date('2024-01-02T00:00:00.000Z');
    jest.setSystemTime(fixedDate);

    const res1 = createMockRes();
    await PlatformUserController.updateOwnEmpresa({ user: { userId: 1, role: 'SUPERADMIN', empresaId: null }, body: { empresaId: null } } as any, res1 as any);

    expect(prisma.empresa.findUnique).not.toHaveBeenCalled();
    expect(res1.status).toHaveBeenCalledWith(200);
    expect(res1.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token',
        data: expect.objectContaining({ empresa: null }),
        timestamp: fixedDate.toISOString(),
      })
    );
  });

  it('updateOwnEmpresa returns 500 on update error', async () => {
    validationErrors = [];
    prisma.user.update.mockRejectedValueOnce(new Error('db'));
    const res = createMockRes();
    await PlatformUserController.updateOwnEmpresa({ user: { userId: 1, role: 'SUPERADMIN', empresaId: null }, body: { empresaId: null } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});


