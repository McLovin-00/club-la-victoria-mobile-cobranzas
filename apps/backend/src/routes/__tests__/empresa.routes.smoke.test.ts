/**
 * Smoke tests para empresa.routes.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';

const getAllEmpresas = jest.fn((_req: Request, res: Response) => res.json({ list: [] }));
const getEmpresaById = jest.fn((_req: Request, res: Response) => res.json({ id: 1 }));
const createEmpresa = jest.fn((_req: Request, res: Response) => res.json({ created: true }));
const updateEmpresa = jest.fn((_req: Request, res: Response) => res.json({ updated: true }));
const deleteEmpresa = jest.fn((_req: Request, res: Response) => res.json({ deleted: true }));
const getAllEmpresasSimple = jest.fn((_req: Request, res: Response) => res.json({ simple: [] }));

// Función middleware para mocks de express-validator
const mockValidatorMiddleware = (_req: any, _res: any, next: any) => next();

// Factory para crear cadenas de validación que devuelven siempre la función middleware
const createValidatorChain = () => {
  const fn = mockValidatorMiddleware;
  (fn as any).optional = () => mockValidatorMiddleware;
  (fn as any).isString = () => mockValidatorMiddleware;
  (fn as any).isLength = () => mockValidatorMiddleware;
  (fn as any).withMessage = () => mockValidatorMiddleware;
  (fn as any).trim = () => mockValidatorMiddleware;
  (fn as any).isInt = () => mockValidatorMiddleware;
  return fn;
};

const chain = createValidatorChain();

let validationErrors: Array<{ msg: string }> = [];

jest.mock('../../controllers/empresa.controller', () => ({
  getAllEmpresas,
  getEmpresaById,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  getAllEmpresasSimple,
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: jest.fn((_req: Request, _res: Response, next: () => void) => next()),
  tenantResolver: jest.fn((_req: Request, _res: Response, next: () => void) => next()),
  authorizeRoles: jest.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
}));

jest.mock('express-validator', () => ({
  body: jest.fn(() => chain),
  param: jest.fn(() => chain),
  validationResult: jest.fn(() => ({
    isEmpty: () => validationErrors.length === 0,
    array: () => validationErrors,
  })),
}));

type RouteHandler = (req: Request, res: Response, next?: () => Promise<void>) => unknown | Promise<unknown>;

async function runMiddlewares(handlers: RouteHandler[], req: Request, res: Response) {
  let index = 0;
  const next = async (): Promise<void> => {
    const handler = handlers[index];
    index += 1;
    if (!handler) {
      return;
    }
    if (handler.length >= 3) {
      await (handler as (req: Request, res: Response, next: () => Promise<void>) => unknown)(req, res, next);
      return;
    }
    await (handler as (req: Request, res: Response) => unknown)(req, res);
  };
  await next();
}

describe('EmpresaRoutes - Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validationErrors = [];
  });

  it('should import empresa routes without errors', () => {
    expect(() => require('../empresa.routes')).not.toThrow();
  });

  it('should export a router', () => {
    const empresaRoutes = require('../empresa.routes');
    expect(empresaRoutes).toBeDefined();
  });

  it('GET / ejecuta el controlador principal', async () => {
    const router = (await import('../empresa.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/') as RouteHandler[];
    const res = createMockRes() as unknown as Response;

    await runMiddlewares(handlers, {} as Request, res);

    expect(getAllEmpresas).toHaveBeenCalled();
  });

  it('GET /:id retorna 400 cuando hay errores de validación', async () => {
    const router = (await import('../empresa.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/:id') as RouteHandler[];
    const res = createMockRes() as unknown as Response;
    validationErrors = [{ msg: 'invalid' }];

    await runMiddlewares(handlers, { params: { id: '0' } } as unknown as Request, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getEmpresaById).not.toHaveBeenCalled();
  });

  it('GET /:id ejecuta el controlador cuando no hay errores', async () => {
    const router = (await import('../empresa.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/:id') as RouteHandler[];
    const res = createMockRes() as unknown as Response;

    await runMiddlewares(handlers, { params: { id: '1' } } as unknown as Request, res);

    expect(getEmpresaById).toHaveBeenCalled();
  });
});
