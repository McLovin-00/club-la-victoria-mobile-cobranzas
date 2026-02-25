/**
 * Coverage tests for DocumentsController + helper functions
 * Covers: uploadDocument, getDocumentsByEmpresa, getDocumentStatus, getDocumentPreview,
 *         downloadDocument, getDocumentThumbnail, renewDocument, getDocumentHistory,
 *         deleteDocument, resubmitDocument, and all helper functions
 * @jest-environment node
 */

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockDbClient: Record<string, any> = {
  documentTemplate: { findUnique: jest.fn() },
  document: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  documentClassification: { deleteMany: jest.fn() },
};

jest.mock('../src/config/database', () => ({
  db: { getClient: () => mockDbClient },
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    CLAMAV_HOST: undefined,
    CLAMAV_PORT: undefined,
  }),
}));

const mockMinioService = {
  uploadDocument: jest.fn().mockResolvedValue({ bucketName: 'test-bucket', objectPath: 'docs/file.pdf' }),
  deleteDocument: jest.fn().mockResolvedValue(undefined),
  getObject: jest.fn(),
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.com/file'),
  ensureBucketExists: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../src/services/minio.service', () => ({
  minioService: mockMinioService,
}));

const mockDocumentService = {
  processDocument: jest.fn().mockResolvedValue(undefined),
  renew: jest.fn().mockResolvedValue({ id: 2, status: 'PENDIENTE' }),
  getHistory: jest.fn().mockResolvedValue([{ id: 1, version: 1 }]),
};
jest.mock('../src/services/document.service', () => ({
  DocumentService: mockDocumentService,
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: {
    addDocumentValidation: jest.fn(),
    cancelDocumentValidationJobs: jest.fn(),
  },
}));

jest.mock('../src/services/websocket.service', () => ({
  webSocketService: { notifyNewDocument: jest.fn() },
}));

jest.mock('../src/services/audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../src/services/media.service', () => ({
  MediaService: {
    decodeDataUrl: jest.fn().mockReturnValue({ buffer: Buffer.from('decoded'), mimeType: 'image/png' }),
    isImage: jest.fn().mockReturnValue(true),
    composePdfFromImages: jest.fn().mockResolvedValue(Buffer.from('pdf-from-images')),
  },
}));

jest.mock('../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn() },
}));

jest.mock('../src/services/thumbnail.service', () => ({
  ThumbnailService: { getSignedUrl: jest.fn().mockResolvedValue('https://thumb-url.com') },
}));

jest.mock('../src/utils/expiration.utils', () => ({
  normalizeExpirationToEndOfDayAR: jest.fn((d: any) => d),
}));

import { DocumentsController } from '../src/controllers/documents.controller';
import { MediaService } from '../src/services/media.service';

// ── Helpers ────────────────────────────────────────────────────────────────
function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
}

function baseReq(overrides: any = {}): any {
  return {
    body: {
      templateId: '1', entityType: 'CHOFER', entityId: '100',
      dadorCargaId: '5', confirmNewVersion: 'true',
    },
    params: {},
    query: {},
    file: null,
    files: {},
    tenantId: 10,
    user: { userId: 1, email: 'test@test.com', role: 'ADMIN_INTERNO', empresaId: 5 },
    method: 'POST',
    originalUrl: '/api/docs/documents/upload',
    path: '/upload',
    protocol: 'https',
    get: jest.fn((header: string) => {
      if (header === 'host') return 'localhost:4802';
      if (header === 'X-Forwarded-Proto') return undefined;
      return undefined;
    }),
    ...overrides,
  };
}

const pdfFile: any = {
  originalname: 'test.pdf',
  buffer: Buffer.from('pdf-content'),
  mimetype: 'application/pdf',
  size: 11,
};

const imageFile: any = {
  originalname: 'photo.jpg',
  buffer: Buffer.from('jpg-data'),
  mimetype: 'image/jpeg',
  size: 8,
};

function setupUploadMocks() {
  mockDbClient.documentTemplate.findUnique.mockResolvedValue({ id: 1, name: 'DNI', active: true });
  mockDbClient.document.findFirst.mockResolvedValue({ id: 99, status: 'VENCIDO' });
  mockDbClient.document.create.mockResolvedValue({
    id: 200, templateId: 1, entityType: 'CHOFER', entityId: 100,
    dadorCargaId: 5, status: 'PENDIENTE', uploadedAt: new Date(),
    fileName: 'DNI_CHOFER_100.pdf', fileSize: 11, mimeType: 'application/pdf',
    filePath: 'test-bucket/docs/file.pdf', template: { name: 'DNI', entityType: 'CHOFER' },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('DocumentsController (coverage)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Helper: parseDateString ────────────────────────────────────────────
  describe('parseDateString (via extractExpirationDate)', () => {
    it('parses ISO date with T', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, expiresAt: '2025-12-31T23:59:59Z' },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('parses ISO date without T (YYYY-MM-DD)', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, expiresAt: '2025-12-31' },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('parses DD/MM/YYYY format', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, expiresAt: '31/12/2025' },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('parses DD/MM/YY format (20xx)', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, expiresAt: '31/12/25' },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('parses DD/MM/YY format (19xx for year >= 50)', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, expiresAt: '31/12/99' },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('handles invalid date string', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, expiresAt: 'not-a-date' },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reads date from planilla.vencimientos by templateId', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: {
          ...baseReq().body,
          planilla: { vencimientos: { '1': '15/06/2025' } },
        },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reads date from planilla.vencimientos by string templateId', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: {
          ...baseReq().body,
          planilla: { vencimientos: { 1: '15/06/2025' } },
        },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('handles null expiresAt', async () => {
      setupUploadMocks();
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── uploadDocument ────────────────────────────────────────────────────
  describe('uploadDocument', () => {
    it('succeeds with single PDF via file field', async () => {
      setupUploadMocks();
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('succeeds with files from documents field', async () => {
      setupUploadMocks();
      const req = baseReq({ files: { documents: [pdfFile] } });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('succeeds with base64 input', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, documentsBase64: 'data:image/png;base64,abc123' },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('succeeds with base64 array', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, documentsBase64: ['data:image/png;base64,abc'] },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('throws FILE_REQUIRED when no files provided', async () => {
      const req = baseReq();
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Se requiere al menos una imagen o PDF');
    });

    it('throws TEMPLATE_NOT_FOUND for inactive template', async () => {
      mockDbClient.documentTemplate.findUnique.mockResolvedValue({ id: 1, active: false });
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Plantilla no encontrada o inactiva');
    });

    it('throws TEMPLATE_NOT_FOUND for null template', async () => {
      mockDbClient.documentTemplate.findUnique.mockResolvedValue(null);
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Plantilla no encontrada o inactiva');
    });

    it('throws CONFIRM_NEW_VERSION when previous doc not vencido and not confirmed', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue({ id: 99, status: 'APROBADO' });
      const req = baseReq({
        file: pdfFile,
        body: { ...baseReq().body, confirmNewVersion: false },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Confirme si es una nueva versión');
    });

    it('throws INITIAL_UPLOAD_REQUIRES_BATCH for unauthorized roles without history', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue(null);
      const req = baseReq({
        file: pdfFile,
        user: { userId: 1, email: 'x@x.com', role: 'CLIENTE', empresaId: 5 },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Alta inicial rechazada');
    });

    it('allows initial upload for SUPERADMIN', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue(null);
      const req = baseReq({
        file: pdfFile,
        user: { userId: 1, email: 'x@x.com', role: 'SUPERADMIN', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('allows initial upload for CHOFER role', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue(null);
      const req = baseReq({
        file: pdfFile,
        user: { userId: 1, email: 'x@x.com', role: 'CHOFER', empresaId: 5, dadorCargaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('deprecates previous document when confirmNewVersion is true', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue({ id: 99, status: 'APROBADO' });
      mockDbClient.document.update.mockResolvedValue({ id: 99, status: 'DEPRECADO' });
      const req = baseReq({
        file: pdfFile,
        body: { ...baseReq().body, confirmNewVersion: true },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(mockDbClient.document.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 99 }, data: expect.objectContaining({ status: 'DEPRECADO' }) })
      );
    });

    it('skips deprecation when previous doc is VENCIDO', async () => {
      setupUploadMocks();
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(mockDbClient.document.update).not.toHaveBeenCalled();
    });

    it('handles deprecation error gracefully', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue({ id: 99, status: 'APROBADO' });
      mockDbClient.document.update.mockRejectedValue(new Error('db error'));
      const req = baseReq({
        file: pdfFile,
        body: { ...baseReq().body, confirmNewVersion: true },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('wraps unknown errors in UPLOAD_DOCUMENT_ERROR', async () => {
      mockDbClient.documentTemplate.findUnique.mockRejectedValue(new Error('db crash'));
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Error al subir documento');
    });

    it('re-throws errors with code property', async () => {
      const err: any = new Error('Custom');
      err.code = 'CUSTOM';
      mockDbClient.documentTemplate.findUnique.mockRejectedValue(err);
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Custom');
    });
  });

  // ── validateUploadPermissions ─────────────────────────────────────────
  describe('validateUploadPermissions', () => {
    it('allows DADOR_DE_CARGA with matching dadorCargaId', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue(null);
      const req = baseReq({
        file: pdfFile,
        user: { userId: 1, role: 'DADOR_DE_CARGA', email: 'x@x.com', dadorCargaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('denies DADOR_DE_CARGA with mismatched dadorCargaId', async () => {
      setupUploadMocks();
      const req = baseReq({
        file: pdfFile,
        user: { userId: 1, role: 'DADOR_DE_CARGA', email: 'x@x.com', dadorCargaId: 999 },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Acceso denegado');
    });

    it('denies TRANSPORTISTA with mismatched dadorCargaId', async () => {
      setupUploadMocks();
      const req = baseReq({
        file: pdfFile,
        user: { userId: 1, role: 'TRANSPORTISTA', email: 'x@x.com', dadorCargaId: 999 },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Acceso denegado');
    });

    it('denies CLIENTE with missing dadorCargaId', async () => {
      setupUploadMocks();
      const req = baseReq({
        file: pdfFile,
        user: { userId: 1, role: 'CLIENTE', email: 'x@x.com' },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Acceso denegado');
    });
  });

  // ── prepareMediaInputs / prepareFinalPdf ──────────────────────────────
  describe('prepareFinalPdf branches', () => {
    it('throws when mixing PDF with images', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue(null);
      (MediaService.decodeDataUrl as jest.Mock).mockReturnValue({ buffer: Buffer.from('x'), mimeType: 'image/png' });

      const req = baseReq({
        files: { documents: [pdfFile, imageFile] },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('No mezclar PDF con imágenes');
    });

    it('throws for invalid base64', async () => {
      setupUploadMocks();
      (MediaService.decodeDataUrl as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });
      const req = baseReq({
        body: { ...baseReq().body, documentsBase64: 'invalid-b64' },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('documentsBase64 inválido');
    });

    it('composes PDF from multiple images', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue(null);
      const req = baseReq({
        files: { documents: [imageFile, { ...imageFile, originalname: 'photo2.jpg' }] },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(MediaService.composePdfFromImages).toHaveBeenCalled();
    });

    it('throws UNSUPPORTED_MEDIA_TYPE for non-image non-pdf', async () => {
      setupUploadMocks();
      mockDbClient.document.findFirst.mockResolvedValue(null);
      (MediaService.isImage as jest.Mock).mockReturnValue(false);
      const nonImageFile = { ...imageFile, mimetype: 'application/octet-stream' };
      const req = baseReq({
        files: { documents: [nonImageFile] },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await expect(DocumentsController.uploadDocument(req, res)).rejects.toThrow('Solo se admiten imágenes');
      (MediaService.isImage as jest.Mock).mockReturnValue(true);
    });
  });

  // ── getDocumentsByEmpresa ─────────────────────────────────────────────
  describe('getDocumentsByEmpresa', () => {
    it('returns documents for empresa', async () => {
      mockDbClient.document.findMany.mockResolvedValue([{ id: 1 }]);
      const req = baseReq({
        params: { empresaId: '5' },
        query: { page: '1', limit: '10' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentsByEmpresa(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('uses dadorId param when available', async () => {
      mockDbClient.document.findMany.mockResolvedValue([]);
      const req = baseReq({
        params: { dadorId: '7', empresaId: '5' },
        query: {},
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 7 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentsByEmpresa(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      mockDbClient.document.findMany.mockResolvedValue([]);
      const req = baseReq({
        params: { empresaId: '5' },
        query: { status: 'APROBADO', page: '1', limit: '50' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentsByEmpresa(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('denies non-superadmin access to other empresa', async () => {
      const req = baseReq({
        params: { empresaId: '999' },
        query: {},
        user: { userId: 1, role: 'ADMIN_INTERNO', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await expect(DocumentsController.getDocumentsByEmpresa(req, res)).rejects.toThrow();
    });

    it('caps limit at 100', async () => {
      mockDbClient.document.findMany.mockResolvedValue([]);
      const req = baseReq({
        params: { empresaId: '5' },
        query: { limit: '500' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentsByEmpresa(req, res);
      expect(mockDbClient.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });

  // ── getDocumentStatus ─────────────────────────────────────────────────
  describe('getDocumentStatus', () => {
    it('returns documents with stats', async () => {
      mockDbClient.document.findMany.mockResolvedValue([{ id: 1 }]);
      mockDbClient.document.count.mockResolvedValue(1);
      const req = baseReq({
        query: { page: '1', limit: '10', empresaId: '5', entityType: 'CHOFER', entityId: '100', status: 'PENDIENTE' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentStatus(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
    });

    it('filters by user empresa for non-superadmin', async () => {
      mockDbClient.document.findMany.mockResolvedValue([]);
      mockDbClient.document.count.mockResolvedValue(0);
      const req = baseReq({
        query: { page: '1', limit: '10' },
        user: { userId: 1, role: 'ADMIN_INTERNO', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentStatus(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('wraps errors in GET_DOCUMENT_STATUS_ERROR', async () => {
      mockDbClient.document.findMany.mockRejectedValue(new Error('db'));
      const req = baseReq({ query: { page: '1', limit: '10' } });
      const res = mockRes();
      await expect(DocumentsController.getDocumentStatus(req, res)).rejects.toThrow('Error al obtener documentos');
    });

    it('handles missing query params gracefully', async () => {
      mockDbClient.document.findMany.mockResolvedValue([]);
      mockDbClient.document.count.mockResolvedValue(0);
      const req = baseReq({
        query: { page: '1', limit: '10' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com' },
      });
      const res = mockRes();
      await DocumentsController.getDocumentStatus(req, res);
      expect(res.json).toHaveBeenCalled();
    });
  });

  // ── getDocumentPreview ────────────────────────────────────────────────
  describe('getDocumentPreview', () => {
    const previewDoc = {
      id: 1, filePath: 'bucket/path/file.pdf', fileName: 'file.pdf',
      mimeType: 'application/pdf', dadorCargaId: 5, tenantEmpresaId: 10,
      entityType: 'CHOFER', entityId: 100,
      template: { name: 'DNI' },
    };

    it('returns preview URL for superadmin', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(previewDoc);
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentPreview(req, res);
      const data = res.json.mock.calls[0][0];
      expect(data.success).toBe(true);
      expect(data.data.previewUrl).toContain('/download?inline=1');
    });

    it('uses X-Forwarded-Proto when available', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(previewDoc);
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 10 },
        get: jest.fn((h: string) => {
          if (h === 'X-Forwarded-Proto') return 'https';
          if (h === 'host') return 'app.example.com';
          return undefined;
        }),
      });
      const res = mockRes();
      await DocumentsController.getDocumentPreview(req, res);
      const url = res.json.mock.calls[0][0].data.previewUrl;
      expect(url).toContain('https://app.example.com');
    });

    it('throws DOCUMENT_NOT_FOUND for missing doc', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(null);
      const req = baseReq({ params: { id: '999' } });
      const res = mockRes();
      await expect(DocumentsController.getDocumentPreview(req, res)).rejects.toThrow('Documento no encontrado');
    });

    it('denies access for non-superadmin wrong tenant', async () => {
      mockDbClient.document.findUnique.mockResolvedValue({ ...previewDoc, tenantEmpresaId: 99 });
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'ADMIN_INTERNO', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await expect(DocumentsController.getDocumentPreview(req, res)).rejects.toThrow('Acceso denegado');
    });

    it('handles ensureBucketExists error gracefully', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(previewDoc);
      mockMinioService.ensureBucketExists.mockRejectedValueOnce(new Error('minio down'));
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentPreview(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('wraps unknown error in DOCUMENT_PREVIEW_ERROR', async () => {
      mockDbClient.document.findUnique.mockRejectedValue(new Error('db'));
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.getDocumentPreview(req, res)).rejects.toThrow('Error al generar preview');
    });
  });

  // ── downloadDocument ──────────────────────────────────────────────────
  describe('downloadDocument', () => {
    const dlDoc = {
      id: 1, filePath: 'bucket/path/file.pdf', fileName: 'file.pdf',
      mimeType: 'application/pdf', dadorCargaId: 5, tenantEmpresaId: 10,
      entityType: 'CHOFER', entityId: 100,
      template: { name: 'DNI' },
    };

    it('streams file as attachment', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(dlDoc);
      const { PassThrough } = require('stream');
      const fakeStream = new PassThrough();
      fakeStream.pipe = jest.fn();
      fakeStream.on = jest.fn((event: string, cb: any) => {
        if (event === 'end') setTimeout(cb, 10);
        return fakeStream;
      });
      mockMinioService.getObject.mockResolvedValue(fakeStream);
      const req = baseReq({
        params: { id: '1' },
        query: {},
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await DocumentsController.downloadDocument(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="file.pdf"');
    });

    it('streams file inline when inline=1', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(dlDoc);
      const { PassThrough } = require('stream');
      const fakeStream = new PassThrough();
      fakeStream.pipe = jest.fn();
      fakeStream.on = jest.fn().mockReturnThis();
      mockMinioService.getObject.mockResolvedValue(fakeStream);
      const req = baseReq({
        params: { id: '1' },
        query: { inline: '1' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await DocumentsController.downloadDocument(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="file.pdf"');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    });

    it('throws DOCUMENT_NOT_FOUND', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(null);
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.downloadDocument(req, res)).rejects.toThrow('Documento no encontrado');
    });

    it('denies access for wrong tenant', async () => {
      mockDbClient.document.findUnique.mockResolvedValue({ ...dlDoc, tenantEmpresaId: 999 });
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'ADMIN_INTERNO', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await expect(DocumentsController.downloadDocument(req, res)).rejects.toThrow('Acceso denegado');
    });

    it('wraps unknown error in DOCUMENT_DOWNLOAD_ERROR', async () => {
      mockDbClient.document.findUnique.mockRejectedValue(new Error('db'));
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.downloadDocument(req, res)).rejects.toThrow('Error al descargar documento');
    });

    it('handles ensureBucketExists error gracefully', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(dlDoc);
      mockMinioService.ensureBucketExists.mockRejectedValueOnce(new Error('minio'));
      const { PassThrough } = require('stream');
      const fakeStream = new PassThrough();
      fakeStream.pipe = jest.fn();
      fakeStream.on = jest.fn().mockReturnThis();
      mockMinioService.getObject.mockResolvedValue(fakeStream);
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await DocumentsController.downloadDocument(req, res);
      expect(fakeStream.pipe).toHaveBeenCalled();
    });
  });

  // ── getDocumentThumbnail ──────────────────────────────────────────────
  describe('getDocumentThumbnail', () => {
    it('returns thumbnail URL', async () => {
      mockDbClient.document.findUnique.mockResolvedValue({
        id: 1, tenantEmpresaId: 10, dadorCargaId: 5, mimeType: 'application/pdf',
      });
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await DocumentsController.getDocumentThumbnail(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ mimeType: 'image/jpeg' }) })
      );
    });

    it('throws DOCUMENT_NOT_FOUND', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(null);
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.getDocumentThumbnail(req, res)).rejects.toThrow('Documento no encontrado');
    });

    it('denies access for wrong tenant', async () => {
      mockDbClient.document.findUnique.mockResolvedValue({
        id: 1, tenantEmpresaId: 999, dadorCargaId: 5, mimeType: 'application/pdf',
      });
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'ADMIN_INTERNO', email: 'x@x.com', empresaId: 10 },
      });
      const res = mockRes();
      await expect(DocumentsController.getDocumentThumbnail(req, res)).rejects.toThrow('Acceso denegado');
    });

    it('wraps unknown error in DOCUMENT_THUMBNAIL_ERROR', async () => {
      mockDbClient.document.findUnique.mockRejectedValue(new Error('db'));
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.getDocumentThumbnail(req, res)).rejects.toThrow('Error al generar thumbnail');
    });
  });

  // ── renewDocument ─────────────────────────────────────────────────────
  describe('renewDocument', () => {
    it('renews document with expiresAt', async () => {
      const req = baseReq({
        params: { id: '1' },
        body: { expiresAt: '2025-12-31' },
        user: { userId: 5 },
      });
      const res = mockRes();
      await DocumentsController.renewDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('renews document without expiresAt', async () => {
      const req = baseReq({
        params: { id: '1' },
        body: {},
        user: { userId: 5 },
      });
      const res = mockRes();
      await DocumentsController.renewDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('wraps error in DOCUMENT_RENEW_ERROR', async () => {
      mockDocumentService.renew.mockRejectedValueOnce(new Error('renew fail'));
      const req = baseReq({ params: { id: '1' }, body: {} });
      const res = mockRes();
      await expect(DocumentsController.renewDocument(req, res)).rejects.toThrow('Error al renovar documento');
    });
  });

  // ── getDocumentHistory ────────────────────────────────────────────────
  describe('getDocumentHistory', () => {
    it('returns history', async () => {
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await DocumentsController.getDocumentHistory(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Array) })
      );
    });

    it('wraps error in DOCUMENT_HISTORY_ERROR', async () => {
      mockDocumentService.getHistory.mockRejectedValueOnce(new Error('fail'));
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.getDocumentHistory(req, res)).rejects.toThrow('Error al obtener historial');
    });
  });

  // ── deleteDocument ────────────────────────────────────────────────────
  describe('deleteDocument', () => {
    const delDoc = {
      id: 1, filePath: 'bucket/path/file.pdf', fileName: 'file.pdf',
      dadorCargaId: 5, entityType: 'CHOFER', entityId: 100,
      template: { name: 'DNI' },
    };

    it('deletes document successfully', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(delDoc);
      mockDbClient.document.delete.mockResolvedValue(delDoc);
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'SUPERADMIN', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.deleteDocument(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(mockMinioService.deleteDocument).toHaveBeenCalledWith('bucket', 'path/file.pdf');
    });

    it('throws DOCUMENT_NOT_FOUND', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(null);
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.deleteDocument(req, res)).rejects.toThrow('Documento no encontrado');
    });

    it('denies non-superadmin with wrong empresa', async () => {
      mockDbClient.document.findUnique.mockResolvedValue({ ...delDoc, dadorCargaId: 999 });
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'ADMIN_INTERNO', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await expect(DocumentsController.deleteDocument(req, res)).rejects.toThrow('Acceso denegado');
    });

    it('allows non-superadmin with matching empresa', async () => {
      mockDbClient.document.findUnique.mockResolvedValue(delDoc);
      mockDbClient.document.delete.mockResolvedValue(delDoc);
      const req = baseReq({
        params: { id: '1' },
        user: { userId: 1, role: 'ADMIN_INTERNO', email: 'x@x.com', empresaId: 5 },
      });
      const res = mockRes();
      await DocumentsController.deleteDocument(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('wraps unknown error in DELETE_DOCUMENT_ERROR', async () => {
      mockDbClient.document.findUnique.mockRejectedValue(new Error('db'));
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.deleteDocument(req, res)).rejects.toThrow('Error al eliminar documento');
    });

    it('re-throws errors with code property', async () => {
      const err: any = new Error('Forbidden');
      err.code = 'FORBIDDEN';
      mockDbClient.document.findUnique.mockRejectedValue(err);
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.deleteDocument(req, res)).rejects.toThrow('Forbidden');
    });
  });

  // ── resubmitDocument ──────────────────────────────────────────────────
  describe('resubmitDocument', () => {
    const resubDoc = {
      id: 1, filePath: 'bucket/old-file.pdf', entityType: 'CHOFER', entityId: 100,
      status: 'RECHAZADO', tenantEmpresaId: 10,
      template: { name: 'DNI', entityType: 'CHOFER' },
    };

    it('resubmits rejected document', async () => {
      mockDbClient.document.findFirst.mockResolvedValue(resubDoc);
      mockDbClient.document.update.mockResolvedValue({ id: 1, status: 'PENDIENTE_APROBACION' });
      mockDbClient.documentClassification.deleteMany.mockResolvedValue({ count: 0 });
      const req = baseReq({
        params: { id: '1' },
        files: { documents: [pdfFile] },
      });
      const res = mockRes();
      await DocumentsController.resubmitDocument(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('resubmits using document field', async () => {
      mockDbClient.document.findFirst.mockResolvedValue(resubDoc);
      mockDbClient.document.update.mockResolvedValue({ id: 1 });
      mockDbClient.documentClassification.deleteMany.mockResolvedValue({ count: 0 });
      const req = baseReq({
        params: { id: '1' },
        files: { document: [imageFile] },
      });
      const res = mockRes();
      await DocumentsController.resubmitDocument(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('throws DOCUMENT_NOT_FOUND for non-rejected doc', async () => {
      mockDbClient.document.findFirst.mockResolvedValue(null);
      const req = baseReq({
        params: { id: '1' },
        files: { documents: [pdfFile] },
      });
      const res = mockRes();
      await expect(DocumentsController.resubmitDocument(req, res)).rejects.toThrow('Documento no encontrado');
    });

    it('throws FILE_REQUIRED when no file provided', async () => {
      mockDbClient.document.findFirst.mockResolvedValue(resubDoc);
      const req = baseReq({ params: { id: '1' } });
      const res = mockRes();
      await expect(DocumentsController.resubmitDocument(req, res)).rejects.toThrow('Se requiere un archivo');
    });

    it('handles old file deletion error gracefully', async () => {
      mockDbClient.document.findFirst.mockResolvedValue(resubDoc);
      mockDbClient.document.update.mockResolvedValue({ id: 1 });
      mockDbClient.documentClassification.deleteMany.mockResolvedValue({ count: 0 });
      mockMinioService.deleteDocument.mockRejectedValueOnce(new Error('minio error'));
      const req = baseReq({
        params: { id: '1' },
        files: { documents: [pdfFile] },
      });
      const res = mockRes();
      await DocumentsController.resubmitDocument(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('handles queue error gracefully', async () => {
      mockDbClient.document.findFirst.mockResolvedValue(resubDoc);
      mockDbClient.document.update.mockResolvedValue({ id: 1, filePath: 'b/f.pdf' });
      mockDbClient.documentClassification.deleteMany.mockResolvedValue({ count: 0 });
      const { queueService } = require('../src/services/queue.service');
      queueService.addDocumentValidation.mockRejectedValueOnce(new Error('queue fail'));
      const req = baseReq({
        params: { id: '1' },
        files: { documents: [pdfFile] },
      });
      const res = mockRes();
      await DocumentsController.resubmitDocument(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('wraps unknown error in RESUBMIT_ERROR', async () => {
      mockDbClient.document.findFirst.mockRejectedValue(new Error('db'));
      const req = baseReq({ params: { id: '1' }, files: { documents: [pdfFile] } });
      const res = mockRes();
      await expect(DocumentsController.resubmitDocument(req, res)).rejects.toThrow('Error al resubir documento');
    });

    it('re-throws errors with code property', async () => {
      const err: any = new Error('Custom');
      err.code = 'CUSTOM';
      mockDbClient.document.findFirst.mockRejectedValue(err);
      const req = baseReq({ params: { id: '1' }, files: { documents: [pdfFile] } });
      const res = mockRes();
      await expect(DocumentsController.resubmitDocument(req, res)).rejects.toThrow('Custom');
    });
  });

  // ── Helper: normalizeFileName ─────────────────────────────────────────
  describe('normalizeFileName / buildDocumentFileName (via upload)', () => {
    it('handles accented characters in template name', async () => {
      setupUploadMocks();
      mockDbClient.documentTemplate.findUnique.mockResolvedValue({ id: 1, name: 'Licéncia Cónducír', active: true });
      const req = baseReq({ file: pdfFile });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      const createCall = mockDbClient.document.create.mock.calls[0][0];
      expect(createCall.data.fileName).toMatch(/LICENCIA_CONDUCIR/);
    });
  });

  // ── Helper: getMulterFiles / extractFilesFromRequest ──────────────────
  describe('getMulterFiles edge cases', () => {
    it('falls back to req.file when document field is used', async () => {
      setupUploadMocks();
      const req = baseReq({ file: pdfFile, files: {} });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('handles files as non-array', async () => {
      setupUploadMocks();
      const req = baseReq({ files: { documents: 'not-an-array' as any }, file: pdfFile });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── Helper: normalizeBase64Input ──────────────────────────────────────
  describe('normalizeBase64Input', () => {
    it('handles empty string', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, documentsBase64: '' },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('handles non-string non-array', async () => {
      setupUploadMocks();
      const req = baseReq({
        body: { ...baseReq().body, documentsBase64: 123 },
        file: pdfFile,
      });
      const res = mockRes();
      await DocumentsController.uploadDocument(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── uploadMiddleware ──────────────────────────────────────────────────
  describe('uploadMiddleware file filter', () => {
    it('is exported', async () => {
      const mod = await import('../src/controllers/documents.controller');
      expect(mod.uploadMiddleware).toBeDefined();
    });
  });
});
