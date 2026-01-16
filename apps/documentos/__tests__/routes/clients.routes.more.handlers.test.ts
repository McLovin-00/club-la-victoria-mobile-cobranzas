import type { Request, Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

const archiveMock = {
  on: jest.fn(),
  pipe: jest.fn(),
  append: jest.fn(),
  finalize: jest.fn(),
};
const archiverFn = jest.fn(() => archiveMock);

jest.mock('archiver', () => ({
  __esModule: true,
  default: archiverFn,
}));

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: Request, _res: Response, next: () => void) => next(),
  authorize: () => (_req: Request, _res: Response, next: () => void) => next(),
  validate: () => (_req: Request, _res: Response, next: () => void) => next(),
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: { getObject: jest.fn(async () => ({})) },
}));

const documentZipServiceMock = {
  getJob: jest.fn(),
};

jest.mock('../../src/services/document-zip.service', () => ({
  DocumentZipService: documentZipServiceMock,
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn() },
}));

jest.mock('../../src/controllers/clients.controller', () => ({
  ClientsController: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    listRequirements: jest.fn(),
    addRequirement: jest.fn(),
    removeRequirement: jest.fn(),
  },
}));

import router from '../../src/routes/clients.routes';

type MockResponse = Response & { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock; end: jest.Mock };

type RouterLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

const findHandler = (method: 'get', path: string) => {
  const stack = (router as unknown as { stack: RouterLayer[] }).stack;
  const layer = stack.find((item) => item.route?.path === path && item.route?.methods?.[method]);
  if (!layer?.route) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
};

const createRes = (): MockResponse => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    end: jest.fn(),
  } as unknown as MockResponse;
  res.status.mockReturnValue(res);
  return res;
};

describe('clients.routes extra handlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('GET /equipos/:equipoId/documentos devuelve docs con equipo válido', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: null,
      truckId: null,
      trailerId: null,
      empresaTransportistaId: null,
    });
    prismaMock.document.findMany.mockResolvedValueOnce([{ id: 7 }]);
    const handler = findHandler('get', '/equipos/:equipoId/documentos');
    const res = createRes();
    const req = { params: { equipoId: '1' } } as unknown as Request;
    await handler(req, res);
    expect(prismaMock.document.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: undefined }) }));
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 7 }] });
  });

  it('GET /equipos/:equipoId/zip usa carpeta por defecto y filePath sin slash', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: null,
      truckId: null,
      trailerId: null,
      empresaTransportistaId: null,
      truckPlateNorm: 'AA',
      trailerPlateNorm: null,
      driverDniNorm: '30123456',
    });
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, entityType: 'OTRO', filePath: 'file.pdf', fileName: 'file.pdf', template: { name: 'Doc' }, uploadedAt: new Date(), status: 'APROBADO' },
    ]);
    const handler = findHandler('get', '/equipos/:equipoId/zip');
    const res = createRes();
    const req = { params: { equipoId: '1' } } as unknown as Request;
    await handler(req, res);
    expect(archiveMock.append).toHaveBeenCalled();
    expect(archiveMock.finalize).toHaveBeenCalled();
  });

  it('GET /jobs/:jobId mantiene signedUrl undefined si no completed', async () => {
    documentZipServiceMock.getJob.mockReturnValueOnce({ status: 'running' });
    const handler = findHandler('get', '/jobs/:jobId');
    const res = createRes();
    const req = { params: { jobId: 'x' } } as unknown as Request;
    await handler(req, res);
    const payload = (res.json as jest.Mock).mock.calls[0][0] as { job: { signedUrl?: string } };
    expect(payload.job.signedUrl).toBeUndefined();
  });
});
