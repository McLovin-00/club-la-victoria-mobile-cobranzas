/**
 * Tests reales para dashboard.controller.ts
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const prisma = {
  user: { findMany: jest.fn(), count: jest.fn() },
  empresa: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
};
jest.mock('../../config/prisma', () => ({ prisma }));

import * as controller from '../dashboard.controller';

describe('dashboard.controller (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getDashboardUser 401 when no user; 200 with activity when user exists', async () => {
    const res0 = createMockRes();
    await controller.getDashboardUser({ platformUser: undefined } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    const res1 = createMockRes();
    await controller.getDashboardUser({ platformUser: { userId: 1, email: 'a', role: 'OPERATOR' } } as any, res1 as any);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }));
  });

  it('getDashboardAdmin enforces auth/role and returns users list', async () => {
    const res0 = createMockRes();
    await controller.getDashboardAdmin({ platformUser: undefined } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    const res1 = createMockRes();
    await controller.getDashboardAdmin({ platformUser: { userId: 1, role: 'OPERATOR' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(403);

    prisma.user.findMany.mockResolvedValueOnce([{ id: 2, email: 'x', role: 'ADMIN', updatedAt: new Date() }]);
    const res2 = createMockRes();
    await controller.getDashboardAdmin({ platformUser: { userId: 1, role: 'ADMIN' } } as any, res2 as any);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: { not: 'SUPERADMIN' } } }));
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ usersCount: 1 }));
  });

  it('getDashboardSuperAdmin enforces role and returns stats', async () => {
    const res0 = createMockRes();
    await controller.getDashboardSuperAdmin({ platformUser: undefined } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    const res1 = createMockRes();
    await controller.getDashboardSuperAdmin({ platformUser: { userId: 1, role: 'ADMIN' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(403);

    prisma.user.count.mockResolvedValue(10);
    prisma.empresa.count.mockResolvedValue(2);
    prisma.empresa.findMany.mockResolvedValue([{ id: 1, nombre: 'E', descripcion: null, createdAt: new Date(), updatedAt: new Date() }]);
    prisma.empresa.groupBy.mockResolvedValue([{ createdAt: new Date('2025-01-01'), _count: { id: 1 } }]);
    prisma.user.findMany.mockResolvedValue([{ id: 9, email: 'u', role: 'OPERATOR', createdAt: new Date(), updatedAt: new Date() }]);

    const res2 = createMockRes();
    await controller.getDashboardSuperAdmin({ platformUser: { userId: 1, role: 'SUPERADMIN' } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ empresasCount: 2, totalUsersCount: 10 }));
  });

  it('getDashboard routes by role and refreshDashboard delegates', async () => {
    const res0 = createMockRes();
    await controller.getDashboard({ platformUser: undefined } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    prisma.user.findMany.mockResolvedValueOnce([]);
    const res1 = createMockRes();
    await controller.getDashboard({ platformUser: { userId: 1, role: 'ADMIN' } } as any, res1 as any);
    expect(res1.json).toHaveBeenCalled();

    const res2 = createMockRes();
    await controller.refreshDashboard({ platformUser: { userId: 1, role: 'OPERATOR', email: 'a' } } as any, res2 as any);
    expect(res2.json).toHaveBeenCalled();
  });
});


