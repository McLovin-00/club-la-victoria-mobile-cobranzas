/**
 * Tests reales para EndUserService
 * @jest-environment node
 */

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const prisma = {
  endUser: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
};

jest.mock('../../config/prisma', () => ({
  prismaService: {
    getClient: () => prisma,
  },
}));

import { EndUserService } from '../endUser.service';

describe('EndUserService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('identifyUser returns null when not found', async () => {
    prisma.endUser.findUnique.mockResolvedValue(null);
    const out = await EndUserService.identifyUser('EMAIL' as any, 'a@b.com');
    expect(out).toBeNull();
  });

  it('identifyUser returns user and updates last_access', async () => {
    prisma.endUser.findUnique.mockResolvedValue({ id: 1, empresaId: 2, is_active: true });
    prisma.endUser.update.mockResolvedValue({});
    const out = await EndUserService.identifyUser('EMAIL' as any, 'a@b.com');
    expect(out?.id).toBe(1);
    expect(prisma.endUser.update).toHaveBeenCalled();
  });

  it('createEndUser throws when already exists', async () => {
    prisma.endUser.findUnique.mockResolvedValue({ id: 1 });
    await expect(
      EndUserService.createEndUser({ identifierType: 'EMAIL', identifier_value: 'a@b.com' } as any)
    ).rejects.toThrow('Usuario final ya existe');
  });

  it('createEndUser creates new user', async () => {
    prisma.endUser.findUnique.mockResolvedValue(null);
    prisma.endUser.create.mockResolvedValue({ id: 2, identifierType: 'EMAIL', empresaId: 1 });
    const out = await EndUserService.createEndUser({ identifierType: 'EMAIL', identifier_value: 'a@b.com', empresaId: 1 } as any);
    expect(out.id).toBe(2);
    expect(prisma.endUser.create).toHaveBeenCalled();
  });

  it('getOrCreateEndUser reactivates inactive user', async () => {
    prisma.endUser.findUnique.mockResolvedValue({ id: 3, is_active: false });
    prisma.endUser.update.mockResolvedValue({ id: 3, is_active: true });
    const out = await EndUserService.getOrCreateEndUser({ identifierType: 'EMAIL', identifier_value: 'a@b.com' } as any);
    expect(out.id).toBe(3);
    expect(prisma.endUser.update).toHaveBeenCalled();
  });

  it('updateEndUser maps isActive to is_active', async () => {
    prisma.endUser.update.mockResolvedValue({ id: 4 });
    await EndUserService.updateEndUser(4, { isActive: false } as any);
    const call = prisma.endUser.update.mock.calls[0][0];
    expect(call.data.is_active).toBe(false);
  });

  it('searchEndUsers returns pagination', async () => {
    prisma.endUser.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.endUser.count.mockResolvedValue(1);
    const out = await EndUserService.searchEndUsers({ search: 'a', page: 1, limit: 10 });
    expect(out.total).toBe(1);
    expect(out.totalPages).toBe(1);
  });

  it('deactivateEndUser uses updateEndUser', async () => {
    prisma.endUser.update.mockResolvedValue({ id: 5 });
    await EndUserService.deactivateEndUser(5);
    expect(prisma.endUser.update).toHaveBeenCalled();
  });

  it('getEndUserStats aggregates groupBy', async () => {
    prisma.endUser.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.endUser.groupBy.mockResolvedValue([{ identifierType: 'EMAIL', _count: { id: 3 } }]);
    const out = await EndUserService.getEndUserStats();
    expect(out.total).toBe(3);
    expect(out.byIdentifierType.EMAIL).toBe(3);
  });
});


