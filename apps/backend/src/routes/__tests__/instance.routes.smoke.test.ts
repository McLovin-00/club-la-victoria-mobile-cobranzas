/**
 * Propósito: Smoke test del router `instance.routes` para subir coverage sin inicializar Prisma real.
 */

jest.mock('../../config/prisma', () => ({
  prismaService: { getClient: () => ({}) },
  prisma: {},
}));

jest.mock('express-validator', () => ({
  body: jest.fn(() => {
    const chain: any = (..._args: any[]) => chain;
    const methods = [
      'isString',
      'isLength',
      'withMessage',
      'trim',
      'isInt',
      'isBoolean',
      'optional',
      'isIn',
      'isObject',
      'isArray',
      'notEmpty',
      'custom',
    ];
    for (const m of methods) chain[m] = (..._args: any[]) => chain;
    return chain;
  }),
  param: jest.fn(() => {
    const chain: any = (..._args: any[]) => chain;
    const methods = ['isInt', 'withMessage', 'optional'];
    for (const m of methods) chain[m] = (..._args: any[]) => chain;
    return chain;
  }),
  query: jest.fn(() => {
    const chain: any = (..._args: any[]) => chain;
    const methods = ['optional', 'isString', 'withMessage', 'isInt', 'isIn'];
    for (const m of methods) chain[m] = (..._args: any[]) => chain;
    return chain;
  }),
  validationResult: () => ({ isEmpty: () => true, array: () => [] }),
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../controllers/instance.controller', () => ({
  getInstances: jest.fn(),
  getInstanceById: jest.fn(),
  createInstance: jest.fn(),
  updateInstance: jest.fn(),
  deleteInstance: jest.fn(),
  getInstanceStats: jest.fn(),
  changeInstanceEstado: jest.fn(),
}));

import router from '../instance.routes';

describe('instance.routes (smoke)', () => {
  it('exporta un router con rutas registradas', () => {
    const anyRouter = router as any;
    expect(Array.isArray(anyRouter.stack)).toBe(true);
    expect(anyRouter.stack.length).toBeGreaterThan(0);
  });
});


