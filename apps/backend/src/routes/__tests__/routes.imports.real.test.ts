/**
 * Import tests para rutas con 0% de cobertura (sin levantar server real).
 * Esto ejecuta la definición de rutas (router.get/post/...) y sube cobertura de archivos de routes.
 * @jest-environment node
 */

// Evitar dependencias reales en rutas (Prisma, auth)
jest.mock('../../config/prisma', () => ({
  prismaService: { checkConnection: jest.fn().mockResolvedValue(true), getClient: jest.fn(() => ({})) },
  prisma: {
    permiso: {
      findUnique: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../../middlewares/platformAuth.middleware', () => ({
  authenticateUser: (_req: any, _res: any, next: any) => next(),
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
  tenantResolver: (_req: any, _res: any, next: any) => next(),
  logAction: () => async (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('routes imports (real)', () => {
  it('imports routes modules', async () => {
    const mods = await Promise.all([
      import('../docs.routes'),
      import('../endUser.routes'),
      import('../metrics.routes'),
      import('../notifications.routes'),
      import('../openapi.routes'),
      import('../permiso.routes'),
      import('../transportistas'),
      import('../evolution.routes'),
    ]);

    for (const m of mods) {
      expect(m.default).toBeDefined();
    }
  });
});


