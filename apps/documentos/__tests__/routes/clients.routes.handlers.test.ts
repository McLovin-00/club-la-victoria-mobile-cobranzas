import type { Response } from 'express';

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

jest.mock('exceljs', () => {
  class WorksheetMock {
    columns: any[] = [];
    addRow = jest.fn();
  }
  class WorkbookMock {
    addWorksheet = jest.fn(() => new WorksheetMock());
    xlsx = { write: jest.fn(async () => undefined) };
  }
  return { __esModule: true, Workbook: WorkbookMock, default: { Workbook: WorkbookMock } };
});

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn() },
}));

// Middlewares no-op
jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));

const clientsServiceMock = {
  getConsolidatedTemplates: jest.fn(async () => [{ id: 1 }]),
  getMissingDocumentsForNewClient: jest.fn(async () => ({ missing: [] })),
};
jest.mock('../../src/services/clients.service', () => ({
  ClientsService: clientsServiceMock,
}));

const equipoServiceMock = {
  listByCliente: jest.fn(async () => [{ id: 1 }]),
};
jest.mock('../../src/services/equipo.service', () => ({
  EquipoService: equipoServiceMock,
}));

const documentZipServiceMock = {
  enqueueZipJob: jest.fn(() => 'job-1'),
  getJob: jest.fn(),
};
jest.mock('../../src/services/document-zip.service', () => ({
  DocumentZipService: documentZipServiceMock,
}));

const minioServiceMock = {
  getObject: jest.fn(async () => ({})),
  getSignedUrlInternal: jest.fn(async () => 'signed'),
};
jest.mock('../../src/services/minio.service', () => ({ minioService: minioServiceMock }));

const equipoEstadoServiceMock = {
  calculateEquipoEstado: jest.fn(async (equipoId: number) => ({
    equipoId,
    estado: 'OK',
    breakdown: { faltantes: 0, vencidos: 0, proximos: 0, vigentes: 1, pendientes: 0, rechazados: 0 },
  })),
};
jest.mock('../../src/services/equipo-estado.service', () => ({
  EquipoEstadoService: equipoEstadoServiceMock,
}));

// Controller mocked (rutas que delegan)
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

function createRes(): Response & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  end: jest.Mock;
} {
  const res: any = {
    status: jest.fn(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  res.status.mockImplementation(() => res);
  return res;
}

function findHandler(method: 'get' | 'post', path: string) {
  const layer: any = (router as any).stack.find((l: any) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as Function;
}

describe('clients.routes handlers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('GET /templates/consolidated', async () => {
    const handler = findHandler('get', '/templates/consolidated');
    const res = createRes();
    await handler({ tenantId: 1, query: { clienteIds: [1, 2] } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('GET /equipos/:equipoId/check-client/:clienteId', async () => {
    const handler = findHandler('get', '/equipos/:equipoId/check-client/:clienteId');
    const res = createRes();
    await handler({ tenantId: 1, params: { equipoId: '1', clienteId: '2' }, query: { existingClienteIds: [3] } }, res);
    expect(clientsServiceMock.getMissingDocumentsForNewClient).toHaveBeenCalledWith(1, 1, 2, [3]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('POST /bulk-search empty => []', async () => {
    const handler = findHandler('post', '/bulk-search');
    const res = createRes();
    await handler({ tenantId: 1, body: { plates: ['   '] } }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('POST /bulk-search builds clauses by type and queries prisma', async () => {
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const handler = findHandler('post', '/bulk-search');
    const res = createRes();
    await handler({ tenantId: 1, body: { plates: ['ab 123 cd'], type: 'truck' } }, res);
    expect(prismaMock.equipo.findMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [{ id: 1 }] }));
  });

  it('POST /bulk-zip => 202 + audit', async () => {
    const handler = findHandler('post', '/bulk-zip');
    const res = createRes();
    await handler({ tenantId: 1, body: { equipoIds: [1, 2] }, user: { userId: 1 }, method: 'POST', path: '/x' }, res);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true, jobId: 'job-1' });
  });

  it('GET /jobs/:jobId => 404 si no existe', async () => {
    documentZipServiceMock.getJob.mockReturnValueOnce(null);
    const handler = findHandler('get', '/jobs/:jobId');
    const res = createRes();
    await handler({ params: { jobId: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('GET /jobs/:jobId => agrega signedUrl si completed', async () => {
    documentZipServiceMock.getJob.mockReturnValueOnce({ status: 'completed', artifact: { bucketName: 'b', objectPath: 'p' } });
    const handler = findHandler('get', '/jobs/:jobId');
    const res = createRes();
    await handler({ params: { jobId: 'x' } }, res);
    const payload = res.json.mock.calls[0][0] as any;
    expect(payload.job.signedUrl).toBe('signed');
  });

  it('GET /equipos/:equipoId/documentos => equipo no existe => []', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    const handler = findHandler('get', '/equipos/:equipoId/documentos');
    const res = createRes();
    await handler({ params: { equipoId: '1' } }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('GET /equipos/:equipoId/zip => 404 si equipo no existe', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    const handler = findHandler('get', '/equipos/:equipoId/zip');
    const res = createRes();
    await handler({ params: { equipoId: '1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('GET /equipos/:equipoId/zip => genera zip con docs', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 9,
      driverId: 11,
      truckId: 22,
      trailerId: null,
      empresaTransportistaId: null,
      truckPlateNorm: 'AA',
      trailerPlateNorm: null,
      driverDniNorm: '1',
    });
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ dni: '1' } as any);
    prismaMock.camion.findUnique.mockResolvedValueOnce({ patente: 'AA' } as any);
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, entityType: 'CAMION', filePath: 'docs-t1/a.pdf', fileName: 'a.pdf', template: { name: 'Seguro' }, uploadedAt: new Date(), status: 'APROBADO' },
    ] as any);

    const handler = findHandler('get', '/equipos/:equipoId/zip');
    const res = createRes();
    await handler({ params: { equipoId: '1' } }, res);

    expect(archiverFn).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
    expect(archiveMock.append).toHaveBeenCalled();
    expect(archiveMock.finalize).toHaveBeenCalled();
  });

  it('GET /:clienteId/summary.xlsx => genera excel', async () => {
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }, { equipoId: 2 }]);
    const handler = findHandler('get', '/:clienteId/summary.xlsx');
    const res = createRes();
    await handler({ tenantId: 1, params: { clienteId: '10' } }, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.end).toHaveBeenCalled();
  });
});


