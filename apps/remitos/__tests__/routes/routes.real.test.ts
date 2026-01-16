/**
 * Tests de rutas (importa routers para cubrir setup)
 * @jest-environment node
 */

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  ROLES_UPLOAD: ['ADMIN_INTERNO'],
  ROLES_APPROVE: ['ADMIN_INTERNO'],
  ROLES_CONFIG: ['SUPERADMIN'],
}));

jest.mock('multer', () => {
  const fn: any = () => ({
    array: () => (_req: any, _res: any, next: any) => next(),
  });
  fn.memoryStorage = () => ({});
  return fn;
});

describe('Routes (real)', () => {
  it('imports main router', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(() => require('../../src/routes/index')).not.toThrow();
  });

  it('imports remitos routes', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(() => require('../../src/routes/remitos.routes')).not.toThrow();
  });

  it('imports config routes', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(() => require('../../src/routes/config.routes')).not.toThrow();
  });
});


