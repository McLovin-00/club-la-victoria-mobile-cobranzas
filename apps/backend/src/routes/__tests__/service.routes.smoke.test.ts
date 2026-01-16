/**
 * Smoke tests para service.routes.ts
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { createMockRes } from '../../__tests__/helpers/testUtils';
import { getRouteHandlers } from '../../__tests__/helpers/routerTestUtils';

const getServices = jest.fn((_req: Request, res: Response) => res.json({ ok: true }));
const getServiceById = jest.fn((_req: Request, res: Response) => res.json({ id: 1 }));
const createService = jest.fn((_req: Request, res: Response) => res.json({ created: true }));
const updateService = jest.fn((_req: Request, res: Response) => res.json({ updated: true }));
const deleteService = jest.fn((_req: Request, res: Response) => res.json({ deleted: true }));
const getServicesSimple = jest.fn((_req: Request, res: Response) => res.json({ simple: true }));
const getServiceStats = jest.fn((_req: Request, res: Response) => res.json({ stats: true }));
const changeServiceEstado = jest.fn((_req: Request, res: Response) => res.json({ estado: 'activo' }));

type ValidatorChain = {
  optional: () => ValidatorChain;
  isString: () => ValidatorChain;
  isLength: (options: { min?: number; max?: number }) => ValidatorChain;
  withMessage: (_message: string) => ValidatorChain;
  trim: () => ValidatorChain;
  isIn: (_values: string[]) => ValidatorChain;
  isInt: (options?: { min?: number; max?: number }) => ValidatorChain;
};

const chain: ValidatorChain = {
  optional: () => chain,
  isString: () => chain,
  isLength: () => chain,
  withMessage: () => chain,
  trim: () => chain,
  isIn: () => chain,
  isInt: () => chain,
};

let validationErrors: Array<{ msg: string }> = [];

jest.mock('../../controllers/service.controller', () => ({
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServicesSimple,
  getServiceStats,
  changeServiceEstado,
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: jest.fn((_req: Request, _res: Response, next: () => void) => next()),
  tenantResolver: jest.fn((_req: Request, _res: Response, next: () => void) => next()),
  authorizeRoles: jest.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
}));

jest.mock('express-validator', () => ({
  body: jest.fn(() => chain),
  param: jest.fn(() => chain),
  query: jest.fn(() => chain),
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

describe('ServiceRoutes - Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validationErrors = [];
  });

  it('should import service routes without errors', () => {
    expect(() => require('../service.routes')).not.toThrow();
  });

  it('should export a router', () => {
    const serviceRoutes = require('../service.routes');
    expect(serviceRoutes).toBeDefined();
  });

  it('GET / ejecuta el controlador cuando no hay errores', async () => {
    const router = (await import('../service.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/') as RouteHandler[];
    const res = createMockRes() as unknown as Response;

    await runMiddlewares(handlers, {} as Request, res);

    expect(getServices).toHaveBeenCalled();
  });

  it('GET / retorna 400 cuando hay errores de validación', async () => {
    const router = (await import('../service.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/') as RouteHandler[];
    const res = createMockRes() as unknown as Response;
    validationErrors = [{ msg: 'invalid' }];

    await runMiddlewares(handlers, {} as Request, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getServices).not.toHaveBeenCalled();
  });

  it('GET /simple usa el controlador simple', async () => {
    const router = (await import('../service.routes')).default;
    const handlers = getRouteHandlers(router, 'get', '/simple') as RouteHandler[];
    const res = createMockRes() as unknown as Response;

    await runMiddlewares(handlers, {} as Request, res);

    expect(getServicesSimple).toHaveBeenCalled();
  });
});
