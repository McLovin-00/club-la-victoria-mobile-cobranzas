/**
 * Propósito: Smoke test del `DocumentValidationWorker` para subir coverage sin Redis/MinIO/Flowise reales.
 * Estrategia: mockear dependencias y ejecutar el processor (método privado) con un Job stub.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const workerMock = {
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const redisMock = {
  quit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('bullmq', () => ({
  Worker: jest.fn(() => workerMock),
}));

jest.mock('ioredis', () => ({
  Redis: jest.fn(() => redisMock),
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ REDIS_URL: 'redis://mock:6379' }),
}));

const dbClientMock = {
  document: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  },
  documentClassification: {
    upsert: jest.fn().mockResolvedValue(undefined),
  },
  documentTemplate: {
    findFirst: jest.fn().mockResolvedValue(null),
  },
};

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => dbClientMock },
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    getSignedUrl: jest.fn().mockResolvedValue('http://signed-url'),
  },
}));

jest.mock('../../src/services/flowise.service', () => ({
  flowiseService: {
    classifyDocument: jest.fn().mockResolvedValue({
      entityType: 'CHOFER',
      entityId: '123',
      documentType: null, // fuerza skip de associateTemplate()
      expirationDate: null,
      confidence: 0.9,
      raw: { ok: true },
    }),
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
    addDocumentAIValidation: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { getDocumentValidationWorker, closeDocumentValidationWorker } from '../../src/workers/document-validation.worker';

describe('DocumentValidationWorker (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await closeDocumentValidationWorker();
  });

  it('procesa un job (happy path) sin I/O real', async () => {
    // documentExists: true (1), true (2), false (3) para evitar enqueue final
    let calls = 0;
    dbClientMock.document.findUnique.mockImplementation(async () => {
      calls += 1;
      if (calls <= 2) return { id: 10 };
      return null;
    });

    const worker = getDocumentValidationWorker() as any;

    const result = await worker.processValidation({
      id: 'job-1',
      data: {
        documentId: 10,
        filePath: 'bucket/path/file.pdf',
        templateName: 'Template',
        entityType: 'CHOFER',
      },
    });

    expect(result).toEqual(expect.objectContaining({ isValid: true, confidence: 0.9 }));
    expect(dbClientMock.document.update).toHaveBeenCalled();
    expect(dbClientMock.documentClassification.upsert).toHaveBeenCalled();
  });
});


