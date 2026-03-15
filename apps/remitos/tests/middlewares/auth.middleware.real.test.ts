/**
 * Tests reales para auth.middleware.ts
 * @jest-environment node
 */

import { createMockRes, createNext } from '../../__tests__/helpers/testUtils';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const verify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { verify: (...args: any[]) => verify(...args) },
  verify: (...args: any[]) => verify(...args),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
}));

process.env.JWT_PUBLIC_KEY = 'public';

import { authenticate, authorize } from '../../src/middlewares/auth.middleware';

describe('auth.middleware (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticate: requires Bearer token', () => {
    const req: any = { headers: {} };
    const res = createMockRes();
    const next = createNext();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('authenticate: maps decoded fields to req.user', () => {
    verify.mockReturnValue({ userId: 10, email: 'a@b.com', role: 'ADMIN_INTERNO', empresaId: 5, dadorCargaId: 7, choferId: 9 });
    const req: any = { headers: { authorization: 'Bearer token' } };
    const res = createMockRes();
    const next = createNext();
    authenticate(req, res, next);
    expect(req.user.userId).toBe(10);
    expect(req.user.tenantId).toBe(5);
    expect(next).toHaveBeenCalled();
  });

  it('authenticate: returns 401 on JsonWebTokenError', () => {
    verify.mockImplementation(() => {
      const e: any = new Error('bad');
      e.name = 'JsonWebTokenError';
      throw e;
    });
    const req: any = { headers: { authorization: 'Bearer token' } };
    const res = createMockRes();
    const next = createNext();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authorize: denies when no user', () => {
    const req: any = {};
    const res = createMockRes();
    const next = createNext();
    authorize(['ADMIN_INTERNO'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('authorize: denies forbidden role', () => {
    const req: any = { user: { role: 'CHOFER', email: 'x' } };
    const res = createMockRes();
    const next = createNext();
    authorize(['ADMIN_INTERNO'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});


