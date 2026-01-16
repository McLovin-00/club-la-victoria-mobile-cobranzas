import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ REDIS_URL: 'redis://localhost:6379' }),
}));

const minioService = { getObject: jest.fn() };
jest.mock('../../src/services/minio.service', () => ({ minioService }));

const documentValidationService = {
  isEnabled: jest.fn(),
  getEntityData: jest.fn(),
  validateDocument: jest.fn(),
};
jest.mock('../../src/services/document-validation.service', () => ({ documentValidationService }));

const PdfRasterizeService = { pdfToImages: jest.fn() };
jest.mock('../../src/services/pdf-rasterize.service', () => ({ PdfRasterizeService }));

import { startDocumentAIValidationWorker, stopDocumentAIValidationWorker } from '../../src/workers/document-ai-validation.worker';

describe('document-ai-validation.worker', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('processValidation: disabled => success with VALIDATION_DISABLED', async () => {
    documentValidationService.isEnabled.mockReturnValue(false);
    const w: any = startDocumentAIValidationWorker();
    const out = await w.processValidation({ id: '1', data: { documentId: 1 } });
    expect(out.success).toBe(true);
    expect(out.error).toBe('VALIDATION_DISABLED');
    await stopDocumentAIValidationWorker();
  });

  it('processValidation: document not found', async () => {
    documentValidationService.isEnabled.mockReturnValue(true);
    prismaMock.document.findUnique.mockResolvedValueOnce(null);
    const w: any = startDocumentAIValidationWorker();
    const out = await w.processValidation({ id: '1', data: { documentId: 1 } });
    expect(out.success).toBe(false);
    expect(out.error).toBe('DOCUMENT_NOT_FOUND');
    await stopDocumentAIValidationWorker();
  });

  it('processValidation: minio error', async () => {
    documentValidationService.isEnabled.mockReturnValue(true);
    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: 'b/x.png',
      mimeType: 'image/png',
      fileName: 'x.png',
      entityType: 'CHOFER',
      entityId: 1,
      template: { name: 'Licencia' },
      expiresAt: null,
    });
    minioService.getObject.mockRejectedValueOnce(new Error('minio'));
    const w: any = startDocumentAIValidationWorker();
    const out = await w.processValidation({ id: '1', data: { documentId: 1 } });
    expect(out.success).toBe(false);
    expect(out.error).toBe('MINIO_ERROR');
    await stopDocumentAIValidationWorker();
  });

  it('processValidation: pdf rasterize error', async () => {
    documentValidationService.isEnabled.mockReturnValue(true);
    prismaMock.document.findUnique.mockResolvedValueOnce({
      id: 1,
      filePath: 'b/x.pdf',
      mimeType: 'application/pdf',
      fileName: 'x.pdf',
      entityType: 'CHOFER',
      entityId: 1,
      template: { name: 'Licencia' },
      expiresAt: null,
    });
    minioService.getObject.mockResolvedValueOnce(Buffer.from('%PDF'));
    PdfRasterizeService.pdfToImages.mockResolvedValueOnce([]);
    const w: any = startDocumentAIValidationWorker();
    const out = await w.processValidation({ id: '1', data: { documentId: 1 } });
    expect(out.success).toBe(false);
    expect(out.error).toBe('PDF_RASTERIZE_ERROR');
    await stopDocumentAIValidationWorker();
  });

  it('processValidation: validation error and success', async () => {
    documentValidationService.isEnabled.mockReturnValue(true);
    prismaMock.document.findUnique.mockResolvedValue({
      id: 1,
      filePath: 'b/x.png',
      mimeType: 'image/png',
      fileName: 'x.png',
      entityType: 'CHOFER',
      entityId: 1,
      template: { name: 'Licencia' },
      expiresAt: null,
    });
    minioService.getObject.mockResolvedValue(Buffer.from('img'));
    documentValidationService.getEntityData.mockResolvedValue({ dni: '1' });

    documentValidationService.validateDocument.mockResolvedValueOnce({ success: false, error: 'BAD' });
    const w: any = startDocumentAIValidationWorker();
    const out1 = await w.processValidation({ id: '1', data: { documentId: 1 } });
    expect(out1.success).toBe(false);
    expect(out1.error).toBe('BAD');

    documentValidationService.validateDocument.mockResolvedValueOnce({ success: true, data: { esDocumentoCorrecto: true, disparidades: [] } });
    const out2 = await w.processValidation({ id: '2', data: { documentId: 1 } });
    expect(out2.success).toBe(true);
    expect(out2.esValido).toBe(true);
    await stopDocumentAIValidationWorker();
  });
});


