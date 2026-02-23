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
    updatePlatformUser: jest.fn(),
    toggleUserActivo: jest.fn(),
    registerClientWithTempPassword: jest.fn(),
    registerDadorWithTempPassword: jest.fn(),
    registerTransportistaWithTempPassword: jest.fn(),
    registerChoferWithTempPassword: jest.fn(),
    revokeToken: jest.fn(),
    revokeAllUserTokens: jest.fn(),
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

  describe('toggleActivo', () => {
    const actorProfile = {
      id: 10, email: 'actor@b.com', role: 'ADMIN_INTERNO',
      empresaId: 1, createdAt: new Date(), updatedAt: new Date(),
    };

    it('retorna 400 si activo no es booleano', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      const req: any = { user: { userId: 10 }, params: { id: '5' }, body: { activo: 'yes' } };
      const res = createRes();

      await PlatformAuthController.toggleActivo(req as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 al activar usuario', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.toggleUserActivo as jest.Mock).mockResolvedValue({ id: 5, email: 'u@b.com', activo: true });
      const req: any = { user: { userId: 10 }, params: { id: '5' }, body: { activo: true } };
      const res = createRes();

      await PlatformAuthController.toggleActivo(req as any, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('retorna 404 si usuario no encontrado', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.toggleUserActivo as jest.Mock).mockRejectedValue(new Error('Usuario no encontrado'));
      const req: any = { user: { userId: 10 }, params: { id: '5' }, body: { activo: false } };
      const res = createRes();

      await PlatformAuthController.toggleActivo(req as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 403 si no tiene permisos', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.toggleUserActivo as jest.Mock).mockRejectedValue(new Error('No tiene permisos para modificar este usuario'));
      const req: any = { user: { userId: 10 }, params: { id: '5' }, body: { activo: false } };
      const res = createRes();

      await PlatformAuthController.toggleActivo(req as any, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 500 ante error inesperado', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.toggleUserActivo as jest.Mock).mockRejectedValue(new Error('DB crash'));
      const req: any = { user: { userId: 10 }, params: { id: '5' }, body: { activo: true } };
      const res = createRes();

      await PlatformAuthController.toggleActivo(req as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('logout', () => {
    it('retorna 200 y limpia cookies', async () => {
      const req: any = {
        headers: { authorization: 'Bearer tok' },
        cookies: {},
        ip: '127.0.0.1',
        get: () => 'ua',
        user: { userId: 1 },
      };
      const res = createRes();

      await PlatformAuthController.logout(req as any, res);

      expect(PlatformAuthService.revokeToken).toHaveBeenCalledWith('tok');
      expect(PlatformAuthService.revokeAllUserTokens).toHaveBeenCalledWith(1);
      expect(res.clearCookie).toHaveBeenCalledWith('platformToken');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('maneja logout sin token', async () => {
      const req: any = { headers: {}, cookies: {}, ip: '127.0.0.1', get: () => 'ua' };
      const res = createRes();

      await PlatformAuthController.logout(req as any, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('wizard endpoints', () => {
    const actorProfile = {
      id: 10, email: 'actor@b.com', role: 'ADMIN_INTERNO',
      empresaId: 1, createdAt: new Date(), updatedAt: new Date(),
    };

    it('registerClientWizard retorna 201 en éxito', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.registerClientWithTempPassword as jest.Mock).mockResolvedValue({
        success: true, message: 'ok', platformUser: { id: 1 }, tempPassword: 'tmp',
      });
      const req: any = {
        user: { userId: 10 },
        body: { email: 'c@b.com', nombre: 'N', apellido: 'A', clienteId: '5' },
      };
      const res = createRes();

      await PlatformAuthController.registerClientWizard(req as any, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('registerClientWizard retorna 400 en fallo', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.registerClientWithTempPassword as jest.Mock).mockResolvedValue({
        success: false, message: 'El email ya está en uso',
      });
      const req: any = {
        user: { userId: 10 },
        body: { email: 'c@b.com', nombre: 'N', apellido: 'A', clienteId: '5' },
      };
      const res = createRes();

      await PlatformAuthController.registerClientWizard(req as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('registerDadorWizard retorna 201 en éxito', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.registerDadorWithTempPassword as jest.Mock).mockResolvedValue({
        success: true, message: 'ok', platformUser: { id: 2 }, tempPassword: 'tmp',
      });
      const req: any = {
        user: { userId: 10 },
        body: { email: 'd@b.com', nombre: 'N', apellido: 'A', dadorCargaId: '3' },
      };
      const res = createRes();

      await PlatformAuthController.registerDadorWizard(req as any, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('registerTransportistaWizard retorna 201 en éxito', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.registerTransportistaWithTempPassword as jest.Mock).mockResolvedValue({
        success: true, message: 'ok', platformUser: { id: 3 }, tempPassword: 'tmp',
      });
      const req: any = {
        user: { userId: 10 },
        body: { email: 't@b.com', nombre: 'N', apellido: 'A', empresaTransportistaId: '7' },
      };
      const res = createRes();

      await PlatformAuthController.registerTransportistaWizard(req as any, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('registerChoferWizard retorna 201 en éxito', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.registerChoferWithTempPassword as jest.Mock).mockResolvedValue({
        success: true, message: 'ok', platformUser: { id: 4 }, tempPassword: 'tmp',
      });
      const req: any = {
        user: { userId: 10 },
        body: { email: 'ch@b.com', nombre: 'N', apellido: 'A', choferId: '2' },
      };
      const res = createRes();

      await PlatformAuthController.registerChoferWizard(req as any, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('registerChoferWizard retorna 500 en error inesperado', async () => {
      (PlatformAuthService.getUserProfile as jest.Mock).mockResolvedValue(actorProfile);
      (PlatformAuthService.registerChoferWithTempPassword as jest.Mock).mockRejectedValue(new Error('boom'));
      const req: any = {
        user: { userId: 10 },
        body: { email: 'ch@b.com', nombre: 'N', apellido: 'A', choferId: '2' },
      };
      const res = createRes();

      await PlatformAuthController.registerChoferWizard(req as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('refreshToken retorna 401 si no es exitoso', async () => {
      (PlatformAuthService.refreshAccessToken as jest.Mock).mockResolvedValue({
        success: false, message: 'expired',
      });
      const req: any = { body: { refreshToken: 'old' } };
      const res = createRes();

      await PlatformAuthController.refreshToken(req as any, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('refreshToken retorna 500 ante error inesperado', async () => {
      (PlatformAuthService.refreshAccessToken as jest.Mock).mockRejectedValue(new Error('crash'));
      const req: any = { body: { refreshToken: 'old' } };
      const res = createRes();

      await PlatformAuthController.refreshToken(req as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

