/**
 * Tests reales para platformAuth.middleware.ts
 * @jest-environment node
 */

import { createMockRes, createNext } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const PlatformAuth = {
  verifyToken: jest.fn(),
};
jest.mock('../../services/platformAuth.service', () => ({
  PlatformAuthService: PlatformAuth,
}));

const prisma = {
  auditLog: { create: jest.fn() },
};
jest.mock('../../config/prisma', () => ({
  prismaService: { getClient: () => prisma },
}));

import {
  authenticateUser,
  authorizeEmpresaAccess,
  authorizeRoles,
  logAction,
  optionalAuth,
  tenantResolver,
} from '../platformAuth.middleware';

describe('platformAuth.middleware (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticateUser 401 when no token', async () => {
    const req: any = { headers: {}, cookies: {} };
    const res = createMockRes();
    const next = createNext();
    await authenticateUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authenticateUser 401 when invalid token', async () => {
    PlatformAuth.verifyToken.mockResolvedValue(null);
    const req: any = { headers: { authorization: 'Bearer t' }, cookies: {} };
    const res = createMockRes();
    const next = createNext();
    await authenticateUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authenticateUser success attaches user and calls next', async () => {
    PlatformAuth.verifyToken.mockResolvedValue({ userId: 1, email: 'a', role: 'SUPERADMIN', empresaId: null });
    const req: any = { headers: { authorization: 'Bearer t' }, cookies: {} };
    const res = createMockRes();
    const next = createNext();
    await authenticateUser(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.userId).toBe(1);
    expect(req.platformUser.userId).toBe(1);
  });

  it('authorizeRoles denies when not authenticated', () => {
    const req: any = {};
    const res = createMockRes();
    const next = createNext();
    authorizeRoles(['SUPERADMIN'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authorizeRoles denies forbidden', () => {
    const req: any = { user: { role: 'OPERATOR', userId: 1 } };
    const res = createMockRes();
    const next = createNext();
    authorizeRoles(['SUPERADMIN'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('authorizeRoles ok', () => {
    const req: any = { user: { role: 'SUPERADMIN', userId: 1 } };
    const res = createMockRes();
    const next = createNext();
    authorizeRoles(['SUPERADMIN'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('authorizeEmpresaAccess allows SUPERADMIN', () => {
    const req: any = { user: { role: 'SUPERADMIN', userId: 1 }, params: { empresaId: '2' }, body: {}, query: {} };
    const res = createMockRes();
    const next = createNext();
    authorizeEmpresaAccess(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('tenantResolver sets tenantId for SUPERADMIN when header present', () => {
    const req: any = { user: { role: 'SUPERADMIN' }, headers: { 'x-empresa-id': '5' }, query: {}, body: {} };
    const res = createMockRes();
    const next = createNext();
    tenantResolver(req, res, next);
    expect(req.tenantId).toBe(5);
    expect(next).toHaveBeenCalled();
  });

  it('optionalAuth sets user when token valid, otherwise continues', async () => {
    PlatformAuth.verifyToken.mockResolvedValue({ userId: 2, email: 'b', role: 'ADMIN', empresaId: 1 });
    const req: any = { headers: { authorization: 'Bearer t' }, cookies: {} };
    const res = createMockRes();
    const next = createNext();
    await optionalAuth(req, res, next);
    expect(req.user.userId).toBe(2);
    expect(next).toHaveBeenCalled();
  });

  it('logAction writes audit log when user exists', async () => {
    const req: any = { user: { userId: 1, email: 'a', role: 'SUPERADMIN' }, params: { instanceId: '3' }, get: () => 'ua', ip: '1', method: 'GET', path: '/x' };
    const res = createMockRes();
    const next = createNext();
    await logAction('X') (req, res, next);
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});


