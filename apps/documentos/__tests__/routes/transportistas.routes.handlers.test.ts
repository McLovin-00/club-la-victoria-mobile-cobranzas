import type { Request, Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

const noopMiddleware = (_req: Request, _res: Response, next: () => void) => next();

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: noopMiddleware,
}));

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

import router from '../../src/routes/transportistas.routes';

type MockResponse = Response & { status: jest.Mock; json: jest.Mock };

type RouterLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

const findHandler = (method: 'get' | 'post', path: string) => {
  const stack = (router as unknown as { stack: RouterLayer[] }).stack;
  const layer = stack.find((item) => item.route?.path === path && item.route?.methods?.[method]);
  if (!layer?.route) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
};

const createRes = (): MockResponse => {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as MockResponse;
  res.status.mockReturnValue(res);
  return res;
};

describe('transportistas.routes handlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('GET /mis-equipos responde 401 si no hay usuario', async () => {
    const handler = findHandler('get', '/mis-equipos');
    const res = createRes();
    await handler({} as Request, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'UNAUTHORIZED' });
  });

  it('GET /mis-equipos devuelve equipos si encuentra chofer', async () => {
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 4 });
    prismaMock.equipo.findMany.mockResolvedValueOnce([
      { id: 1, driverDniNorm: '30123456', truckPlateNorm: 'AA000BB', trailerPlateNorm: null },
    ]);
    const handler = findHandler('get', '/mis-equipos');
    const res = createRes();
    const req = { user: { dni: '30.123.456' } } as unknown as Request;
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('GET /mis-equipos usa choferId cuando no hay dni', async () => {
    prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 9 });
    prismaMock.equipo.findMany.mockResolvedValueOnce([
      { id: 2, driverDniNorm: '30123456', truckPlateNorm: 'BB000CC', trailerPlateNorm: null },
    ]);
    const handler = findHandler('get', '/mis-equipos');
    const res = createRes();
    const req = { user: { choferId: 9 } } as unknown as Request;
    await handler(req, res);
    expect(prismaMock.chofer.findUnique).toHaveBeenCalledWith({ where: { id: 9 } });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /search responde vacío si no hay filtros', async () => {
    const handler = findHandler('post', '/search');
    const res = createRes();
    const req = { user: { metadata: {} }, body: {} } as unknown as Request;
    await handler(req, res);
    expect(prismaMock.equipo.findMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('POST /search filtra por patente', async () => {
    prismaMock.equipo.findMany.mockResolvedValueOnce([
      { id: 9, driverDniNorm: '30123456', truckPlateNorm: 'AA000BB', trailerPlateNorm: null, empresaTransportistaId: 1 },
    ]);
    const handler = findHandler('post', '/search');
    const res = createRes();
    const req = { user: { metadata: {} }, body: { plate: 'aa-000-bb' } } as unknown as Request;
    await handler(req, res);
    expect(prismaMock.equipo.findMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
