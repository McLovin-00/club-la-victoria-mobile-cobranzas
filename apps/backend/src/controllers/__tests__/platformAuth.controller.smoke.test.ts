/**
 * Propósito: Smoke tests de `PlatformAuthController` para subir coverage.
 * Cubre validación de entrada (400) y flujo de éxito (200) con mocks.
 */

import type { Request, Response } from 'express';

jest.mock('express-validator', () => ({
  body: jest.fn(() => {
    // Proxy encadenable: cualquier método devuelve el mismo chain.
    const chain: any = new Proxy(
      {},
      {
        get: (_t, _p) => (..._args: any[]) => chain,
      }
    );
    return chain;
  }),
  validationResult: jest.fn(),
}));

jest.mock('../../services/platformAuth.service', () => ({
  PlatformAuthService: {
    login: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { validationResult } from 'express-validator';
import { PlatformAuthService } from '../../services/platformAuth.service';
import { PlatformAuthController } from '../platformAuth.controller';

function createRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('PlatformAuthController (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('login retorna 400 si validationResult trae errores', async () => {
    (validationResult as unknown as jest.Mock).mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'x' }] });
    const req = { body: {}, ip: '1.1.1.1', get: () => '' } as unknown as Request;
    const res = createRes();

    await PlatformAuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('login retorna 200 si el servicio autentica', async () => {
    (validationResult as unknown as jest.Mock).mockReturnValue({ isEmpty: () => true, array: () => [] });
    (PlatformAuthService.login as jest.Mock).mockResolvedValue({ success: true, token: 't', platformUser: { id: 1 } });

    const req: any = { body: { email: 'a@b.com', password: 'x' }, ip: '1.1.1.1', get: () => 'ua' };
    const res = createRes();

    await PlatformAuthController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 't' }));
  });
});


