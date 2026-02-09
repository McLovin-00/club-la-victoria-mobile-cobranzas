/**
 * Tests reales para auth.middleware.ts
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

const verify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { verify: (...args: any[]) => verify(...args) },
  verify: (...args: any[]) => verify(...args),
}));

const authSvc = {
  getProfile: jest.fn(),
};
jest.mock('../../services/auth.service', () => ({
  authService: authSvc,
}));

import { authenticateToken, isAdmin, isAuthenticated, isSuperAdmin, verifyToken } from '../auth.middleware';

describe('auth.middleware (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_PUBLIC_KEY = 'pub';
    process.env.JWT_LEGACY_SECRET = 'legacy';
  });

  it('verifyToken uses RS256 when verify succeeds', () => {
    verify.mockReturnValue({ userId: 1, email: 'a', role: 'admin' });
    const out = verifyToken('t');
    expect(out?.userId).toBe(1);
  });

  it('verifyToken falls back to legacy secret HS256', () => {
    // first call throws (RS256), second succeeds (HS256)
    verify.mockImplementationOnce(() => {
      throw new Error('bad');
    });
    verify.mockImplementationOnce(() => ({ userId: 2, email: 'b', role: 'admin' }));
    const out = verifyToken('t');
    expect(out?.userId).toBe(2);
  });

  it('authenticateToken returns 401 when missing token', async () => {
    const req: any = { headers: {} };
    const res = createMockRes();
    const next = createNext();
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authenticateToken returns 401 when invalid token', async () => {
    verify.mockImplementation(() => {
      throw new Error('bad');
    });
    const req: any = { headers: { authorization: 'Bearer t' } };
    const res = createMockRes();
    const next = createNext();
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authenticateToken returns 401 when user not found', async () => {
    verify.mockReturnValue({ userId: 10, email: 'a', role: 'admin' });
    authSvc.getProfile.mockResolvedValue(null);
    const req: any = { headers: { authorization: 'Bearer t' } };
    const res = createMockRes();
    const next = createNext();
    await authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authenticateToken success calls next and sets req.user', async () => {
    verify.mockReturnValue({ userId: 10, email: 'a', role: 'admin' });
    authSvc.getProfile.mockResolvedValue({ id: 10, email: 'a', role: 'admin' });
    const req: any = { headers: { authorization: 'Bearer t' } };
    const res = createMockRes();
    const next = createNext();
    await authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });

  it('isAdmin denies when no user', () => {
    const req: any = {};
    const res = createMockRes();
    const next = createNext();
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('isAdmin denies when role insufficient', () => {
    const req: any = { user: { id: 1, email: 'x', role: 'user' } };
    const res = createMockRes();
    const next = createNext();
    isAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('isAdmin ok for admin/superadmin', () => {
    const req: any = { user: { id: 1, email: 'x', role: 'admin' } };
    const res = createMockRes();
    const next = createNext();
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('isSuperAdmin denies when no user', () => {
    const req: any = {};
    const res = createMockRes();
    const next = createNext();
    isSuperAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('isSuperAdmin denies when not superadmin', () => {
    const req: any = { user: { id: 1, role: 'admin' } };
    const res = createMockRes();
    const next = createNext();
    isSuperAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('isSuperAdmin ok', () => {
    const req: any = { user: { id: 1, role: 'superadmin' } };
    const res = createMockRes();
    const next = createNext();
    isSuperAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('isAuthenticated denies when no user', () => {
    const req: any = {};
    const res = createMockRes();
    const next = createNext();
    isAuthenticated(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('isAuthenticated ok when user exists', () => {
    const req: any = { user: { id: 1, role: 'user', email: 'x' } };
    const res = createMockRes();
    const next = createNext();
    isAuthenticated(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});


