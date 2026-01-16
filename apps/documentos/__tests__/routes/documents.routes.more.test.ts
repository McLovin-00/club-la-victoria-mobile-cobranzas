import type { Request, Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

const noopMiddleware = (_req: Request, _res: Response, next: () => void) => next();

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: noopMiddleware,
  authorize: () => noopMiddleware,
  validate: () => noopMiddleware,
}));

jest.mock('../../src/middlewares/rateLimiter.middleware', () => ({
  uploadRateLimit: noopMiddleware,
}));

type UploadField = { name: string; maxCount: number };

type UploadMiddleware = {
  fields: (fields: UploadField[]) => (req: Request, res: Response, next: () => void) => void;
};

const uploadFieldsMock = jest.fn<ReturnType<UploadMiddleware['fields']>, [UploadField[]]>(() => noopMiddleware);

jest.mock('../../src/controllers/documents.controller', () => ({
  DocumentsController: {
    getDocumentsByEmpresa: jest.fn(),
    uploadDocument: jest.fn(),
    getDocumentStatus: jest.fn(),
    getDocumentPreview: jest.fn(),
    downloadDocument: jest.fn(),
    getDocumentThumbnail: jest.fn(),
    renewDocument: jest.fn(),
    getDocumentHistory: jest.fn(),
    deleteDocument: jest.fn(),
    resubmitDocument: jest.fn(),
  },
  uploadMiddleware: { fields: (fields: UploadField[]) => uploadFieldsMock(fields) } as UploadMiddleware,
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

import router from '../../src/routes/documents.routes';

type MockResponse = Response & { json: jest.Mock; status: jest.Mock };

type RouterLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

const findHandler = (method: 'post', path: string) => {
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
  } as unknown as MockResponse;
  res.status.mockReturnValue(res);
  return res;
};

describe('documents.routes normalize expirations branches', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('usa 0 cuando updateMany no devuelve count', async () => {
    const updateResult: { count?: number } = {};
    prismaMock.document.updateMany.mockResolvedValueOnce(updateResult);
    const handler = findHandler('post', '/normalize-expirations');
    const res = createRes();
    await handler({} as Request, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { updated: 0 } });
  });
});
