/**
 * Propósito: subir "Coverage on New Code" de PlatformAuthController.
 * Cubre refreshToken endpoint y ramas de error 403/500 en deleteUser.
 */

import type { Request, Response } from 'express';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('express-validator', () => ({
  body: jest.fn(() => {
    const chain: any = new Proxy(
      {},
      {
        get: (_t, _p) => (..._args: any[]) => chain,
      }
    );
    return chain;
  }),
  validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] })),
}));

jest.mock('../../services/platformAuth.service', () => ({
  PlatformAuthService: {
    login: jest.fn(),
    refreshAccessToken: jest.fn(),
    getUserProfile: jest.fn(),
    deletePlatformUser: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { PlatformAuthService } from '../../services/platformAuth.service';
import { PlatformAuthController } from '../platformAuth.controller';

function createRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('PlatformAuthController (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('incluye refreshToken en la respuesta cuando el servicio lo retorna', async () => {
      (PlatformAuthService.login as jest.Mock).mockResolvedValue({
        success: true,
        token: 't',
        refreshToken: 'rt',
        platformUser: { id: 1 },
      });

      const req: any = { body: { email: 'a@b.com', password: 'x' }, ip: '1.1.1.1', get: () => 'ua' };
      const res = createRes();

      await PlatformAuthController.login(req as Request, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, token: 't', refreshToken: 'rt' })
      );
    });
  });

  describe('refreshToken', () => {
    it('retorna 400 si no viene refreshToken', async () => {
      const req: any = { body: {} };
      const res = createRes();

      await PlatformAuthController.refreshToken(req as Request, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 con el resultado del servicio', async () => {
      (PlatformAuthService.refreshAccessToken as jest.Mock).mockResolvedValue({
        success: true,
        token: 'new',
        refreshToken: 'newrt',
        platformUser: { id: 1 },
      });

      const req: any = { body: { refreshToken: 'rt' } };
      const res = createRes();

      await PlatformAuthController.refreshToken(req as Request, res);

      expect(PlatformAuthService.refreshAccessToken).toHaveBeenCalledWith('rt');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteUser', () => {
    const actorProfile = {
      id: 10,
      email: 'actor@b.com',
      role: 'ADMIN_INTERNO',
      empresaId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('retorna 403 ante error de negocio', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.deletePlatformUser as jest.Mock).mockRejectedValue(
        new Error('No tiene permisos para eliminar usuarios de otra empresa')
      );

      const req: any = { user: { userId: 10 }, params: { id: '5' } };
      const res = createRes();

      await PlatformAuthController.deleteUser(req as any, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 500 ante error inesperado', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.deletePlatformUser as jest.Mock).mockRejectedValue(new Error('DB down'));

      const req: any = { user: { userId: 10 }, params: { id: '5' } };
      const res = createRes();

      await PlatformAuthController.deleteUser(req as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

