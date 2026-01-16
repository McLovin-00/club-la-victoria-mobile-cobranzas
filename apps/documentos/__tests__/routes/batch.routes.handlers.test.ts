import type { Request, Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Middlewares: no-op
jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: Request, _res: Response, next: () => void) => next(),
  authorize: () => (_req: Request, _res: Response, next: () => void) => next(),
}));

type EquipoIdentifiersInput = {
  tenantEmpresaId: number;
  dadorCargaId: number;
  dniChofer: string;
  patenteTractor: string;
  patenteAcoplado?: string;
  choferPhones?: string[];
  empresaTransportistaCuit?: string;
  empresaTransportistaNombre?: string;
};

type DocumentsBatchInput = {
  tenantEmpresaId: number;
  dadorId: number;
  files: Express.Multer.File[];
  skipDedupe: boolean;
};

type JobItem = { documentId: number; fileName?: string };

type JobInfo = {
  id: string;
  items?: JobItem[];
};

type DocumentValidationPayload = {
  documentId: number;
  filePath: string;
  templateName: string;
  entityType: string;
};

const systemConfigGetMock = jest.fn<Promise<string | null>, [string]>();
jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: (key: string) => systemConfigGetMock(key) },
}));

const equipoCreateFromIdentifiersMock = jest.fn<Promise<void>, [EquipoIdentifiersInput]>();
jest.mock('../../src/services/equipo.service', () => ({
  EquipoService: { createFromIdentifiers: (input: EquipoIdentifiersInput) => equipoCreateFromIdentifiersMock(input) },
}));

const createDocumentsBatchMock = jest.fn<string, [DocumentsBatchInput]>();
const getJobMock = jest.fn<JobInfo | null, [string]>();
jest.mock('../../src/services/jobs.service', () => ({
  JobsService: {
    createDocumentsBatch: (input: DocumentsBatchInput) => createDocumentsBatchMock(input),
    getJob: (jobId: string) => getJobMock(jobId),
  },
}));

const addDocumentValidationMock = jest.fn<Promise<void>, [DocumentValidationPayload]>();
jest.mock('../../src/services/queue.service', () => ({
  queueService: { addDocumentValidation: (payload: DocumentValidationPayload) => addDocumentValidationMock(payload) },
}));

import router from '../../src/routes/batch.routes';

type MockResponse = Response & { json: jest.Mock; status: jest.Mock };

type RouterLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function createRes(): MockResponse {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { json, status } as unknown as MockResponse;
}

function findHandler(method: 'get' | 'post', path: string) {
  const stack = (router as unknown as { stack: RouterLayer[] }).stack;
  const layer = stack.find((layerItem) => layerItem.route?.path === path && layerItem.route?.methods?.[method]);
  if (!layer?.route) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
}

describe('batch.routes handlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  describe('POST /dadores/:dadorId/equipos/import-csv', () => {
    it('400 si faltan params o file', async () => {
      const handler = findHandler('post', '/dadores/:dadorId/equipos/import-csv');
      const res = createRes();
      const req = { params: { dadorId: '0' }, file: null } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('dryRun no llama createFromIdentifiers y devuelve errorsCsv', async () => {
      const handler = findHandler('post', '/dadores/:dadorId/equipos/import-csv');
      const csv = 'dni_chofer,patente_tractor\n20111222,AB123CD\n,ZZ999ZZ\n';
      const res = createRes();
      const req = {
        tenantId: 1,
        params: { dadorId: '9' },
        query: { dryRun: 'true' },
        file: { buffer: Buffer.from(csv) },
      } as unknown as Request;
      await handler(req, res);
      const payload = res.json.mock.calls[0][0] as { success: boolean; dryRun: boolean; total: number; errorsCsv: string };
      expect(payload.success).toBe(true);
      expect(payload.dryRun).toBe(true);
      expect(equipoCreateFromIdentifiersMock).not.toHaveBeenCalled();
      // una línea inválida => rows.length = 1 (se filtran nulls)
      expect(payload.total).toBeGreaterThanOrEqual(1);
      expect(typeof payload.errorsCsv).toBe('string');
    });

    it('crea equipos y captura errores por fila', async () => {
      equipoCreateFromIdentifiersMock.mockResolvedValueOnce(undefined);
      equipoCreateFromIdentifiersMock.mockRejectedValueOnce(new Error('fail, with "quotes"'));
      const handler = findHandler('post', '/dadores/:dadorId/equipos/import-csv');
      const csv = 'dni_chofer,patente_tractor,patente_acoplado,chofer_phones\n20111222,AB123CD,,+54911111111\n30999888,ZZ999ZZ,AA001BB,+54922222222\n';
      const res = createRes();
      const req = {
        tenantId: 1,
        params: { dadorId: '9' },
        query: {},
        file: { buffer: Buffer.from(csv) },
      } as unknown as Request;
      await handler(req, res);
      const payload = res.json.mock.calls[0][0] as { created: number; errors: Array<{ error?: string }>; errorsCsv: string };
      expect(payload.created).toBe(1);
      expect(payload.errors).toHaveLength(1);
      expect(payload.errorsCsv).toContain('error');
      expect(payload.errorsCsv).toContain('""'); // escape de comillas
    });

    it('parsea CSV sin header y limita teléfonos', async () => {
      const handler = findHandler('post', '/dadores/:dadorId/equipos/import-csv');
      const csv = '20111222,AB123CD,AA001BB,+549111;+549222;+549333;+549444,20304050607,Transporte SA\n';
      const res = createRes();
      const req = {
        tenantId: 7,
        params: { dadorId: '11' },
        query: {},
        file: { buffer: Buffer.from(csv) },
      } as unknown as Request;
      await handler(req, res);
      expect(equipoCreateFromIdentifiersMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantEmpresaId: 7,
          dadorCargaId: 11,
          patenteAcoplado: 'AA001BB',
          choferPhones: ['+549111', '+549222', '+549333'],
          empresaTransportistaCuit: '20304050607',
          empresaTransportistaNombre: 'Transporte SA',
        })
      );
    });
  });

  describe('POST /dadores/:dadorId/documentos/batch', () => {
    it('400 si no hay archivos', async () => {
      const handler = findHandler('post', '/dadores/:dadorId/documentos/batch');
      const res = createRes();
      const req = { tenantId: 1, params: { dadorId: '2' }, files: [] } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Parámetros inválidos' });
    });

    it('202 si crea batch para dador', async () => {
      createDocumentsBatchMock.mockReturnValueOnce('job-9');
      const handler = findHandler('post', '/dadores/:dadorId/documentos/batch');
      const res = createRes();
      const files = [{ originalname: 'a.pdf' } as unknown as Express.Multer.File];
      const req = {
        tenantId: 1,
        params: { dadorId: '2' },
        files,
        query: { skipDedupe: 'true' },
      } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ success: true, jobId: 'job-9' });
      expect(createDocumentsBatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ dadorId: 2, tenantEmpresaId: 1, skipDedupe: true })
      );
    });
  });

  describe('POST /transportistas/documentos/batch', () => {
    it('400 si no hay dador por defecto configurado', async () => {
      systemConfigGetMock.mockResolvedValueOnce(null);
      systemConfigGetMock.mockResolvedValueOnce(null);
      const handler = findHandler('post', '/transportistas/documentos/batch');
      const res = createRes();
      const req = { tenantId: 1, files: [{ originalname: 'a.pdf' }] } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 si faltan archivos', async () => {
      systemConfigGetMock.mockResolvedValueOnce('7');
      const handler = findHandler('post', '/transportistas/documentos/batch');
      const res = createRes();
      const req = { tenantId: 1, files: [] } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Sin archivos' });
    });

    it('202 si crea batch (usa fallback key)', async () => {
      systemConfigGetMock.mockResolvedValueOnce(null); // namespaced
      systemConfigGetMock.mockResolvedValueOnce('9'); // legacy
      createDocumentsBatchMock.mockReturnValueOnce('job-1');
      const handler = findHandler('post', '/transportistas/documentos/batch');
      const res = createRes();
      const req = {
        tenantId: 1,
        files: [{ originalname: 'a.pdf' }],
        query: { skipDedupe: 'true' },
      } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ success: true, jobId: 'job-1' });
    });

    it('202 si crea batch con dador namespaced', async () => {
      systemConfigGetMock.mockResolvedValueOnce('11');
      createDocumentsBatchMock.mockReturnValueOnce('job-3');
      const handler = findHandler('post', '/transportistas/documentos/batch');
      const res = createRes();
      const req = {
        tenantId: 4,
        files: [{ originalname: 'b.pdf' }],
        query: {},
      } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(createDocumentsBatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ dadorId: 11, tenantEmpresaId: 4, skipDedupe: false })
      );
    });
  });

  describe('GET /jobs/:jobId/status', () => {
    it('404 si no existe job', async () => {
      getJobMock.mockReturnValueOnce(null);
      const handler = findHandler('get', '/jobs/:jobId/status');
      const res = createRes();
      const req = { params: { jobId: 'x' } } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('enriquece results si hay items y db responde', async () => {
      getJobMock.mockReturnValueOnce({ id: 'x', items: [{ documentId: 1, fileName: 'a.pdf' }] });
      prismaMock.document.findMany.mockResolvedValueOnce([
        { id: 1, status: 'APROBADO', validationData: { ai: { comprobante: 'C' } }, expiresAt: null, fileName: 'a.pdf' },
      ]);
      const handler = findHandler('get', '/jobs/:jobId/status');
      const res = createRes();
      const req = { params: { jobId: 'x' } } as unknown as Request;
      await handler(req, res);
      const payload = res.json.mock.calls[0][0] as { success: boolean; job: { results: Array<{ status: string; comprobante?: string }> } };
      expect(payload.success).toBe(true);
      expect(payload.job.results[0]).toMatchObject({ status: 'APROBADO', comprobante: 'C' });
    });

    it('usa defaults cuando no hay doc asociado', async () => {
      getJobMock.mockReturnValueOnce({ id: 'x', items: [{ documentId: 3 }] });
      prismaMock.document.findMany.mockResolvedValueOnce([]);
      const handler = findHandler('get', '/jobs/:jobId/status');
      const res = createRes();
      const req = { params: { jobId: 'x' } } as unknown as Request;
      await handler(req, res);
      const payload = res.json.mock.calls[0][0] as { job: { results: Array<{ status: string; fileName: string }> } };
      expect(payload.job.results[0]).toMatchObject({ status: 'PENDIENTE', fileName: 'document-3' });
    });

    it('responde aunque falle el enriquecimiento', async () => {
      getJobMock.mockReturnValueOnce({ id: 'x', items: [{ documentId: 1 }] });
      prismaMock.document.findMany.mockRejectedValueOnce(new Error('db down'));
      const handler = findHandler('get', '/jobs/:jobId/status');
      const res = createRes();
      const req = { params: { jobId: 'x' } } as unknown as Request;
      await handler(req, res);
      const payload = res.json.mock.calls[0][0] as { success: boolean; job: { results: Array<unknown> } };
      expect(payload.success).toBe(true);
      expect(payload.job.results).toHaveLength(0);
    });
  });

  describe('POST /jobs/:jobId/retry-failed', () => {
    it('404 si no existe job', async () => {
      getJobMock.mockReturnValueOnce(null);
      const handler = findHandler('post', '/jobs/:jobId/retry-failed');
      const res = createRes();
      const req = { params: { jobId: 'x' } } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('encola validaciones para RECHAZADO', async () => {
      getJobMock.mockReturnValueOnce({ id: 'x', items: [{ documentId: 1 }, { documentId: 2 }] });
      prismaMock.document.findMany.mockResolvedValueOnce([{ id: 2, filePath: 'p2' }]);
      const handler = findHandler('post', '/jobs/:jobId/retry-failed');
      const res = createRes();
      const req = { params: { jobId: 'x' } } as unknown as Request;
      await handler(req, res);
      expect(addDocumentValidationMock).toHaveBeenCalledWith(expect.objectContaining({ documentId: 2, filePath: 'p2' }));
      expect(res.json).toHaveBeenCalledWith({ success: true, retried: 1 });
    });

    it('500 si falla la recuperación de documentos', async () => {
      getJobMock.mockReturnValueOnce({ id: 'x', items: [{ documentId: 1 }] });
      prismaMock.document.findMany.mockRejectedValueOnce(new Error('boom'));
      const handler = findHandler('post', '/jobs/:jobId/retry-failed');
      const res = createRes();
      const req = { params: { jobId: 'x' } } as unknown as Request;
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'boom' });
    });
  });
});
