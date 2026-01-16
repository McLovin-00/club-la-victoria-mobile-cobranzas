import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    REDIS_URL: 'redis://mock',
    DOCS_MAX_DEPRECATED_VERSIONS: 1,
  }),
}));

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

const minioMock = {
  getSignedUrl: jest.fn(async () => 'http://signed'),
  deleteDocument: jest.fn(async () => undefined),
};
jest.mock('../../src/services/minio.service', () => ({ minioService: minioMock }));

const flowiseMock = {
  classifyDocument: jest.fn(),
};
jest.mock('../../src/services/flowise.service', () => ({ flowiseService: flowiseMock }));

jest.mock('../../src/services/websocket.service', () => ({
  webSocketService: { notifyDocumentStatusChange: jest.fn(), notifyDashboardUpdate: jest.fn() },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addDocumentAIValidation: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/document-validation.service', () => ({
  documentValidationService: { isEnabled: () => false },
}));

jest.mock('../../src/services/maestros.service', () => ({
  MaestrosService: {
    createChofer: jest.fn(async () => ({ id: 99, dadorCargaId: 2 })),
  },
}));

// bullmq + ioredis
const workerOnMock = jest.fn();
jest.mock('bullmq', () => ({
  Worker: jest.fn(() => ({ on: workerOnMock, close: jest.fn() })),
  Queue: jest.fn(() => ({})),
}));
jest.mock('ioredis', () => ({
  Redis: jest.fn(() => ({ quit: jest.fn(async () => 'OK') })),
}));

import { getDocumentValidationWorker, closeDocumentValidationWorker } from '../../src/workers/document-validation.worker';
import { MaestrosService } from '../../src/services/maestros.service';

describe('DocumentValidationWorker (more)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await closeDocumentValidationWorker();
  });

  it('constructor: should register worker event handlers', () => {
    getDocumentValidationWorker();
    expect(workerOnMock).toHaveBeenCalled();
    const events = workerOnMock.mock.calls.map((c) => c[0]);
    expect(events).toEqual(expect.arrayContaining(['completed', 'failed', 'error', 'ready']));
  });

  it('processValidation: should handle classifyDocument errors and return isValid=false', async () => {
    const worker = getDocumentValidationWorker();
    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 } as any);
    prismaMock.document.update.mockResolvedValue({} as any);
    minioMock.getSignedUrl.mockRejectedValueOnce(new Error('minio down'));

    const out = await (worker as any).processValidation({ data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' } });
    expect(out.isValid).toBe(false);
    expect(out.errors?.[0]).toContain('minio down');
  });

  it('classifyDocument: should sanitize unknown/invalid fields and skip template association when missing', async () => {
    const worker = getDocumentValidationWorker();
    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1 } as any);
    prismaMock.document.update.mockResolvedValue({} as any);

    flowiseMock.classifyDocument.mockResolvedValueOnce({
      success: true,
      entityType: 'INVALID',
      entityId: null,
      expirationDate: 'not-a-date',
      documentType: 'Desconocido',
      confidence: 0.1,
      raw: { metadata: { aiParsed: { idEntidad: 'Desconocido' } } },
    });

    // Running processValidation exercises classifyDocument/sanitize/normalize.
    await (worker as any).processValidation({ data: { documentId: 1, filePath: 'bucket/x.pdf', templateName: 'AUTO', entityType: 'X' } });

    // Because entityType/documentType normalize to null, associateTemplate returns early.
    expect(prismaMock.documentTemplate.findFirst).not.toHaveBeenCalled();
  });

  it('markDocumentAsApproved: should resolve entity via MaestrosService when AI provides CHOFER dni and entity missing', async () => {
    const worker = getDocumentValidationWorker();

    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      empresaId: 2,
      status: 'PENDIENTE',
      entityType: 'CHOFER',
      entityId: 0,
      templateId: 5,
      fileName: 'a',
      template: { name: 'T' },
    } as any);

    // resolveChofer: first findFirst returns null -> createChofer called
    prismaMock.chofer.findFirst.mockResolvedValueOnce(null);

    prismaMock.document.update.mockResolvedValueOnce({ id: 1, status: 'APROBADO', tenantEmpresaId: 1, dadorCargaId: 2, entityType: 'CHOFER', entityId: 99, templateId: 5, expiresAt: new Date(), template: { name: 'T' } } as any);
    prismaMock.document.findMany.mockResolvedValueOnce([] as any);
    prismaMock.document.findMany.mockResolvedValueOnce([] as any);

    await worker.markDocumentAsApproved(1, { metadata: { aiParsed: { entidad: 'CHOFER', idEntidad: '12.345.678', vencimientoDate: '2026-01-01T00:00:00.000Z' } } });

    expect((MaestrosService as any).createChofer).toHaveBeenCalled();
    expect(prismaMock.document.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ entityId: 99, entityType: 'CHOFER' }) }));
  });
});


