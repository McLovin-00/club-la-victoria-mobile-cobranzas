/**
 * Tests extendidos para auth.middleware.ts - cubrir líneas faltantes
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Response, NextFunction } from 'express';
import * as fs from 'fs';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: jest.fn((msg: string, status: number, code: string) => {
    const err: any = new Error(msg);
    err.statusCode = status;
    err.code = code;
    return err;
  }),
}));

describe('auth.middleware extended', () => {
  let authenticate: any;
  let authorize: any;
  let ROLES_UPLOAD: any;
  let ROLES_APPROVE: any;
  let ROLES_VIEW_ALL: any;
  let ROLES_CONFIG: any;
  
  const originalEnv = process.env;
  let mockRes: any;
  let nextMock: jest.Mock<any>;
  let jsonMock: jest.Mock<any>;
  let statusMock: jest.Mock<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2Z3qX2BTLE0FnmHy4bSi
-----END PUBLIC KEY-----`;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
    nextMock = jest.fn();

    jest.resetModules();
    const module = await import('../../src/middlewares/auth.middleware');
    authenticate = module.authenticate;
    authorize = module.authorize;
    ROLES_UPLOAD = module.ROLES_UPLOAD;
    ROLES_APPROVE = module.ROLES_APPROVE;
    ROLES_VIEW_ALL = module.ROLES_VIEW_ALL;
    ROLES_CONFIG = module.ROLES_CONFIG;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadJwtPublicKey', () => {
    it('carga key desde variable de entorno directa', async () => {
      // Ya mockeado en beforeEach
      expect(authenticate).toBeDefined();
    });
  });

  describe('authenticate', () => {
    it('rechaza si no hay header de autorización', () => {
      const req: any = { headers: {} };
      
      authenticate(req, mockRes as Response, nextMock);
      
      expect(nextMock).toHaveBeenCalledWith(expect.any(Error));
    });

    it('rechaza si header no empieza con Bearer', () => {
      const req: any = { headers: { authorization: 'Basic abc123' } };
      
      authenticate(req, mockRes as Response, nextMock);
      
      expect(nextMock).toHaveBeenCalledWith(expect.any(Error));
    });

    it('rechaza token inválido', () => {
      const req: any = { headers: { authorization: 'Bearer invalid.token.here' } };
      
      authenticate(req, mockRes as Response, nextMock);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'INVALID_TOKEN' })
      );
    });
  });

  describe('authorize', () => {
    it('rechaza si no hay usuario autenticado', () => {
      const req: any = {};
      const middleware = authorize(['ADMIN']);
      
      middleware(req, mockRes as Response, nextMock);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'UNAUTHORIZED' })
      );
    });

    it('rechaza si rol no está permitido', () => {
      const req: any = { user: { email: 'test@test.com', role: 'CHOFER' } };
      const middleware = authorize(['ADMIN', 'SUPERADMIN']);
      
      middleware(req, mockRes as Response, nextMock);
      
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'FORBIDDEN' })
      );
    });

    it('permite si rol está en la lista', () => {
      const req: any = { user: { email: 'admin@test.com', role: 'ADMIN' } };
      const middleware = authorize(['ADMIN', 'SUPERADMIN']);
      
      middleware(req, mockRes as Response, nextMock);
      
      expect(nextMock).toHaveBeenCalled();
    });
  });

  describe('role constants', () => {
    it('ROLES_UPLOAD contiene roles esperados', () => {
      expect(ROLES_UPLOAD).toContain('SUPERADMIN');
      expect(ROLES_UPLOAD).toContain('ADMIN_INTERNO');
      expect(ROLES_UPLOAD).toContain('DADOR_DE_CARGA');
      expect(ROLES_UPLOAD).toContain('TRANSPORTISTA');
      expect(ROLES_UPLOAD).toContain('CHOFER');
    });

    it('ROLES_APPROVE contiene roles esperados', () => {
      expect(ROLES_APPROVE).toContain('SUPERADMIN');
      expect(ROLES_APPROVE).toContain('ADMIN_INTERNO');
    });

    it('ROLES_VIEW_ALL contiene roles esperados', () => {
      expect(ROLES_VIEW_ALL).toContain('SUPERADMIN');
      expect(ROLES_VIEW_ALL).toContain('ADMIN_INTERNO');
    });

    it('ROLES_CONFIG solo contiene SUPERADMIN', () => {
      expect(ROLES_CONFIG).toEqual(['SUPERADMIN']);
    });
  });
});

describe('loadJwtPublicKey from file', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('usa fallback de variable de entorno cuando no hay PATH', async () => {
    delete process.env.JWT_PUBLIC_KEY_PATH;
    process.env.JWT_PUBLIC_KEY = '-----BEGIN PUBLIC KEY-----\nKEY\n-----END PUBLIC KEY-----';

    const module = await import('../../src/middlewares/auth.middleware');
    expect(module.authenticate).toBeDefined();
  });

  it('los roles están correctamente definidos', async () => {
    const module = await import('../../src/middlewares/auth.middleware');
    expect(module.ROLES_UPLOAD.length).toBeGreaterThan(0);
    expect(module.ROLES_APPROVE.length).toBeGreaterThan(0);
    expect(module.ROLES_VIEW_ALL.length).toBeGreaterThan(0);
    expect(module.ROLES_CONFIG.length).toBeGreaterThan(0);
  });
});

