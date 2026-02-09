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

jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    getSignedUrl: jest.fn(async () => 'http://signed'),
    deleteDocument: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/flowise.service', () => ({
  flowiseService: {
    classifyDocument: jest.fn(async () => ({
      success: true,
      entityType: 'CHOFER',
      entityId: 123,
      expirationDate: '2025-01-01T00:00:00.000Z',
      documentType: 'X',
      confidence: 0.9,
      raw: { metadata: { aiParsed: { entidad: 'CHOFER', idEntidad: '123', vencimientoDate: '2025-01-01T00:00:00.000Z' } } },
    })),
  },
}));

jest.mock('../../src/services/websocket.service', () => ({
  webSocketService: {
    notifyDocumentStatusChange: jest.fn(),
    notifyDashboardUpdate: jest.fn(),
  },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: {
    addDocumentAIValidation: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/document-validation.service', () => ({
  documentValidationService: { isEnabled: () => true },
}));

// bullmq + ioredis already mocked globally in __tests__/setup.ts, but keep here explicit typings safe
jest.mock('bullmq', () => ({
  Worker: jest.fn(() => ({ on: jest.fn(), close: jest.fn() })),
  Queue: jest.fn(() => ({})),
}));
jest.mock('ioredis', () => ({
  Redis: jest.fn(() => ({ quit: jest.fn(async () => 'OK') })),
}));

import { getDocumentValidationWorker, closeDocumentValidationWorker } from '../../src/workers/document-validation.worker';
import { minioService } from '../../src/services/minio.service';
import { flowiseService } from '../../src/services/flowise.service';
import { queueService } from '../../src/services/queue.service';

describe('DocumentValidationWorker', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await closeDocumentValidationWorker();
  });

  it('processValidation returns error when document missing', async () => {
    const worker = getDocumentValidationWorker();
    prismaMock.document.findUnique.mockResolvedValueOnce(null);
    const out = await (worker as any).processValidation({ data: { documentId: 1, filePath: 'b/p', templateName: 'T', entityType: 'X' } });
    expect(out.isValid).toBe(false);
  });

  it('processValidation classifies, saves classification, associates template, enqueues AI, updates statuses', async () => {
    const worker = getDocumentValidationWorker();

    // documentExists checks multiple times
    prismaMock.document.findUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 1 });

    prismaMock.document.update.mockResolvedValue({} as any);
    prismaMock.documentClassification.upsert.mockResolvedValue({} as any);
    prismaMock.documentTemplate.findFirst.mockResolvedValueOnce({ id: 99 } as any);

    const out = await (worker as any).processValidation({ data: { documentId: 1, filePath: 'bucket/path.pdf', templateName: 'AUTO', entityType: 'X' } });
    expect(out.isValid).toBe(true);
    expect(minioService.getSignedUrl).toHaveBeenCalled();
    expect(flowiseService.classifyDocument).toHaveBeenCalled();
    expect(prismaMock.documentClassification.upsert).toHaveBeenCalled();
    expect(prismaMock.document.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ templateId: 99 }) }));
    expect(queueService.addDocumentAIValidation).toHaveBeenCalled();
  });

  it('markDocumentAsApproved updates doc, applies deprecate+retention, notifies', async () => {
    const worker = getDocumentValidationWorker();

    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      empresaId: 2,
      status: 'PENDIENTE',
      entityType: 'CHOFER',
      entityId: 10,
      templateId: 5,
      fileName: 'a',
      template: { name: 'T' },
    } as any);

    prismaMock.document.update.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2, empresaId: 2, status: 'APROBADO', entityType: 'CHOFER', entityId: 10, templateId: 5, expiresAt: new Date(), template: { name: 'T' } } as any);

    // deprecateDuplicates findMany -> 1 stale to update
    prismaMock.document.findMany.mockResolvedValueOnce([{ id: 22, validationData: {} }] as any);
    prismaMock.document.update.mockResolvedValueOnce({} as any);

    // retention list deprecated > maxKeep so deletes
    prismaMock.document.findMany.mockResolvedValueOnce([{ id: 33, filePath: 'b/x' }, { id: 34, filePath: 'b/y' }] as any);
    prismaMock.document.delete.mockResolvedValue({} as any);

    await worker.markDocumentAsApproved(1, { metadata: { aiParsed: { vencimientoDate: '2025-01-01T00:00:00.000Z' } } });
    expect(prismaMock.document.update).toHaveBeenCalled();
  });

  it('markDocumentAsRejected updates doc and notifies', async () => {
    const worker = getDocumentValidationWorker();

    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 1,
      dadorCargaId: 2,
      empresaId: 2,
      status: 'PENDIENTE',
      entityType: 'CHOFER',
      entityId: 10,
      fileName: 'a',
      template: { name: 'T' },
    } as any);
    prismaMock.document.update.mockResolvedValueOnce({} as any);

    await worker.markDocumentAsRejected(1, ['bad']);
    expect(prismaMock.document.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RECHAZADO' }) }));
  });
});


