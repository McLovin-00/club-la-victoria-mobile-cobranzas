/**
 * Coverage tests for DocumentService.checkExpiredDocuments
 * @jest-environment node
 */

const mockPrisma = {
  document: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockPrisma },
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/services/minio.service', () => ({
  minioService: { uploadFile: jest.fn(), getFile: jest.fn(), deleteFile: jest.fn() },
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: { addJob: jest.fn() },
}));

jest.mock('../src/services/document-event-handlers.service', () => ({
  DocumentEventHandlers: { onDocumentExpired: jest.fn().mockResolvedValue(undefined) },
}));

import { DocumentService } from '../src/services/document.service';
import { DocumentEventHandlers } from '../src/services/document-event-handlers.service';

describe('DocumentService.checkExpiredDocuments (coverage)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 0 si no hay documentos expirados', async () => {
    mockPrisma.document.findMany.mockResolvedValue([]);

    const count = await DocumentService.checkExpiredDocuments();

    expect(count).toBe(0);
    expect(mockPrisma.document.updateMany).not.toHaveBeenCalled();
  });

  it('marca documentos como vencidos y dispara event handlers', async () => {
    const expired = [{ id: 1 }, { id: 2 }, { id: 3 }];
    mockPrisma.document.findMany.mockResolvedValue(expired);
    mockPrisma.document.updateMany.mockResolvedValue({ count: 3 });

    const count = await DocumentService.checkExpiredDocuments();

    expect(count).toBe(3);
    expect(mockPrisma.document.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [1, 2, 3] } },
        data: { status: 'VENCIDO' },
      })
    );
    expect(DocumentEventHandlers.onDocumentExpired).toHaveBeenCalledTimes(3);
  });

  it('continúa procesando si un event handler falla', async () => {
    const expired = [{ id: 10 }, { id: 11 }];
    mockPrisma.document.findMany.mockResolvedValue(expired);
    mockPrisma.document.updateMany.mockResolvedValue({ count: 2 });
    (DocumentEventHandlers.onDocumentExpired as jest.Mock)
      .mockRejectedValueOnce(new Error('handler error'))
      .mockResolvedValueOnce(undefined);

    const count = await DocumentService.checkExpiredDocuments();

    expect(count).toBe(2);
    expect(DocumentEventHandlers.onDocumentExpired).toHaveBeenCalledTimes(2);
  });

  it('retorna 0 ante error general', async () => {
    mockPrisma.document.findMany.mockRejectedValue(new Error('DB down'));

    const count = await DocumentService.checkExpiredDocuments();

    expect(count).toBe(0);
  });
});
