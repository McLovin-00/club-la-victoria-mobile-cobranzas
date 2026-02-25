/**
 * Coverage tests for approval.controller.ts
 * Covers: helpers (extractUserFromRequest, validateCanApprove), all controller methods,
 *         error paths, WebSocket notification, audit logging, performance refresh.
 * @jest-environment node
 */

const mockApprovalService = {
  getPendingDocuments: jest.fn(),
  getPendingDocument: jest.fn(),
  approveDocument: jest.fn(),
  rejectDocument: jest.fn(),
  getApprovalStats: jest.fn(),
};

const mockWebSocketService = {
  notifyDocumentApproved: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

const mockPerformanceService = {
  refreshMaterializedView: jest.fn(),
};

const mockQueueService = {
  addDocumentAIValidation: jest.fn(),
};

const mockDocumentValidationService = {
  isEnabled: jest.fn(),
};

const mockPrisma = {
  document: { findFirst: jest.fn() },
};

jest.mock('../src/services/approval.service', () => ({
  ApprovalService: mockApprovalService,
}));

jest.mock('../src/services/websocket.service', () => ({
  webSocketService: mockWebSocketService,
}));

jest.mock('../src/services/audit.service', () => ({
  AuditService: mockAuditService,
}));

jest.mock('../src/services/performance.service', () => ({
  performanceService: mockPerformanceService,
}));

jest.mock('../src/services/queue.service', () => ({
  queueService: mockQueueService,
}));

jest.mock('../src/services/document-validation.service', () => ({
  documentValidationService: mockDocumentValidationService,
}));

jest.mock('../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { ApprovalController } from '../src/controllers/approval.controller';

function mockReq(overrides: Record<string, any> = {}): any {
  return {
    tenantId: 1,
    user: { userId: 1, id: 1, role: 'ADMIN' },
    query: {},
    params: {},
    body: {},
    method: 'POST',
    originalUrl: '/api/approval',
    path: '/api/approval',
    get: jest.fn().mockReturnValue(null),
    protocol: 'https',
    statusCode: 200,
    ...overrides,
  };
}

function mockRes(): any {
  const res: any = { statusCode: 200 };
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('ApprovalController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ====================================================================
  // getPendingDocuments
  // ====================================================================
  describe('getPendingDocuments', () => {
    it('should return pending docs with default params', async () => {
      mockApprovalService.getPendingDocuments.mockResolvedValue({ documents: [], total: 0 });
      const req = mockReq({ query: {} });
      const res = mockRes();

      await ApprovalController.getPendingDocuments(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should parse filter params', async () => {
      mockApprovalService.getPendingDocuments.mockResolvedValue({ documents: [], total: 0 });
      const req = mockReq({
        query: { entityType: 'CHOFER', minConfidence: '0.5', maxConfidence: '0.9', page: '2', limit: '20' },
      });
      const res = mockRes();

      await ApprovalController.getPendingDocuments(req, res);

      expect(mockApprovalService.getPendingDocuments).toHaveBeenCalledWith(1, {
        entityType: 'CHOFER',
        minConfidence: 0.5,
        maxConfidence: 0.9,
        page: 2,
        limit: 20,
      });
    });

    it('should handle missing filter params', async () => {
      mockApprovalService.getPendingDocuments.mockResolvedValue({ documents: [] });
      const req = mockReq({ query: { entityType: undefined } });
      const res = mockRes();

      await ApprovalController.getPendingDocuments(req, res);

      expect(mockApprovalService.getPendingDocuments).toHaveBeenCalledWith(1, expect.objectContaining({
        minConfidence: undefined,
        maxConfidence: undefined,
      }));
    });

    it('should return 500 on error', async () => {
      mockApprovalService.getPendingDocuments.mockRejectedValue(new Error('fail'));
      const req = mockReq();
      const res = mockRes();

      await ApprovalController.getPendingDocuments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // getPendingDocument
  // ====================================================================
  describe('getPendingDocument', () => {
    it('should return document with preview URL', async () => {
      mockApprovalService.getPendingDocument.mockResolvedValue({ id: 1, fileName: 'test.pdf' });
      const req = mockReq({
        params: { id: '1' },
        get: jest.fn((h: string) => (h === 'host' ? 'localhost:3000' : null)),
        protocol: 'https',
      });
      const res = mockRes();

      await ApprovalController.getPendingDocument(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.previewUrl).toContain('https://localhost:3000/api/docs/documents/1/download');
    });

    it('should use X-Forwarded-Proto header', async () => {
      mockApprovalService.getPendingDocument.mockResolvedValue({ id: 1 });
      const req = mockReq({
        params: { id: '1' },
        get: jest.fn((h: string) => {
          if (h === 'X-Forwarded-Proto') return 'http';
          if (h === 'host') return 'example.com';
          return null;
        }),
        protocol: 'https',
      });
      const res = mockRes();

      await ApprovalController.getPendingDocument(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.data.previewUrl).toContain('http://example.com');
    });

    it('should return 404 when document not found', async () => {
      mockApprovalService.getPendingDocument.mockResolvedValue(null);
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();

      await ApprovalController.getPendingDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on error', async () => {
      mockApprovalService.getPendingDocument.mockRejectedValue(new Error('fail'));
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.getPendingDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // batchApprove
  // ====================================================================
  describe('batchApprove', () => {
    it('should reject TRANSPORTISTA', async () => {
      const req = mockReq({ user: { userId: 1, role: 'TRANSPORTISTA' } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject EMPRESA_TRANSPORTISTA', async () => {
      const req = mockReq({ user: { userId: 1, role: 'EMPRESA_TRANSPORTISTA' } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject when userId missing', async () => {
      const req = mockReq({ user: { role: 'ADMIN' } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when ids is empty', async () => {
      const req = mockReq({ body: { ids: [] } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when ids is not an array', async () => {
      const req = mockReq({ body: { ids: 'not-array' } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should batch approve documents', async () => {
      mockApprovalService.approveDocument.mockResolvedValue({ id: 1 });
      const req = mockReq({ body: { ids: [1, 2, 3] } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.approved).toBe(3);
      expect(body.failed).toBe(0);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should handle individual approval failures', async () => {
      mockApprovalService.approveDocument
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce(new Error('Not found'));
      const req = mockReq({ body: { ids: [1, 2] } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.approved).toBe(1);
      expect(body.failed).toBe(1);
    });

    it('should pass overrides to approve', async () => {
      mockApprovalService.approveDocument.mockResolvedValue({ id: 1 });
      const req = mockReq({
        body: {
          ids: [1],
          overrides: {
            confirmedEntityType: 'CHOFER',
            confirmedEntityId: 10,
            confirmedExpiration: '2025-12-31',
            reviewNotes: 'OK',
          },
        },
      });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(mockApprovalService.approveDocument).toHaveBeenCalledWith(1, 1, expect.objectContaining({
        confirmedEntityType: 'CHOFER',
        confirmedExpiration: expect.any(Date),
      }));
    });

    it('should handle overrides without confirmedExpiration', async () => {
      mockApprovalService.approveDocument.mockResolvedValue({ id: 1 });
      const req = mockReq({ body: { ids: [1], overrides: {} } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(mockApprovalService.approveDocument).toHaveBeenCalledWith(1, 1, expect.objectContaining({
        confirmedExpiration: undefined,
      }));
    });

    it('should return 500 on outer error', async () => {
      const req = mockReq({
        user: { userId: 1, role: 'ADMIN' },
        body: null,
      });
      // Force body destructuring to throw
      Object.defineProperty(req, 'body', { get: () => { throw new Error('fail'); } });
      const res = mockRes();

      await ApprovalController.batchApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // approveDocument
  // ====================================================================
  describe('approveDocument', () => {
    it('should approve document and notify WS', async () => {
      mockApprovalService.approveDocument.mockResolvedValue({ id: 1, dadorCargaId: 10, expiresAt: new Date() });
      const req = mockReq({ params: { id: '1' }, body: { reviewNotes: 'OK' } });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Documento aprobado' }));
      expect(mockWebSocketService.notifyDocumentApproved).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should handle WS notification failure gracefully', async () => {
      mockApprovalService.approveDocument.mockResolvedValue({ id: 1, dadorCargaId: 10, expiresAt: null });
      mockWebSocketService.notifyDocumentApproved.mockImplementation(() => { throw new Error('WS fail'); });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should reject TRANSPORTISTA', async () => {
      const req = mockReq({ user: { userId: 1, role: 'TRANSPORTISTA' }, params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject when userId missing', async () => {
      const req = mockReq({ user: { role: 'ADMIN' }, params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should pass confirmedExpiration as Date', async () => {
      mockApprovalService.approveDocument.mockResolvedValue({ id: 1, dadorCargaId: 10, expiresAt: null });
      const req = mockReq({
        params: { id: '1' },
        body: { confirmedExpiration: '2025-12-31', confirmedEntityType: 'CHOFER', confirmedEntityId: 10, confirmedTemplateId: 5 },
      });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(mockApprovalService.approveDocument).toHaveBeenCalledWith(1, 1, expect.objectContaining({
        confirmedExpiration: expect.any(Date),
        confirmedTemplateId: 5,
      }));
    });

    it('should handle undefined confirmedExpiration', async () => {
      mockApprovalService.approveDocument.mockResolvedValue({ id: 1, dadorCargaId: 10, expiresAt: null });
      const req = mockReq({ params: { id: '1' }, body: {} });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(mockApprovalService.approveDocument).toHaveBeenCalledWith(1, 1, expect.objectContaining({
        confirmedExpiration: undefined,
      }));
    });

    it('should return 404 when error contains "no encontrado"', async () => {
      mockApprovalService.approveDocument.mockRejectedValue(new Error('Documento no encontrado'));
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockApprovalService.approveDocument.mockRejectedValue(new Error('DB error'));
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle error without message', async () => {
      mockApprovalService.approveDocument.mockRejectedValue({});
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.approveDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = res.json.mock.calls[0][0];
      expect(body.message).toBe('Error interno del servidor');
    });
  });

  // ====================================================================
  // rejectDocument
  // ====================================================================
  describe('rejectDocument', () => {
    it('should reject document', async () => {
      mockApprovalService.rejectDocument.mockResolvedValue({ id: 1 });
      const req = mockReq({ params: { id: '1' }, body: { reason: 'Ilegible', reviewNotes: 'Nota' } });
      const res = mockRes();

      await ApprovalController.rejectDocument(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Documento rechazado' }));
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should reject TRANSPORTISTA from rejecting', async () => {
      const req = mockReq({ user: { userId: 1, id: 1, role: 'TRANSPORTISTA' }, params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.rejectDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject EMPRESA_TRANSPORTISTA from rejecting', async () => {
      const req = mockReq({ user: { userId: 1, id: 1, role: 'EMPRESA_TRANSPORTISTA' }, params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.rejectDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 401 when userId missing', async () => {
      const req = mockReq({ user: { role: 'ADMIN' }, params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.rejectDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 404 when error contains "no encontrado"', async () => {
      mockApprovalService.rejectDocument.mockRejectedValue(new Error('Documento no encontrado'));
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.rejectDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic error', async () => {
      mockApprovalService.rejectDocument.mockRejectedValue(new Error('DB error'));
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.rejectDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle error without message', async () => {
      mockApprovalService.rejectDocument.mockRejectedValue({});
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.rejectDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // getStats
  // ====================================================================
  describe('getStats', () => {
    it('should return stats', async () => {
      mockApprovalService.getApprovalStats.mockResolvedValue({ pending: 5 });
      const req = mockReq();
      const res = mockRes();

      await ApprovalController.getStats(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: { pending: 5 } });
    });

    it('should return 500 on error', async () => {
      mockApprovalService.getApprovalStats.mockRejectedValue(new Error('fail'));
      const req = mockReq();
      const res = mockRes();

      await ApprovalController.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ====================================================================
  // recheckDocument
  // ====================================================================
  describe('recheckDocument', () => {
    it('should return 401 when userId missing', async () => {
      const req = mockReq({ user: { role: 'ADMIN' }, params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.recheckDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when validation not enabled', async () => {
      mockDocumentValidationService.isEnabled.mockReturnValue(false);
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.recheckDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when document not found', async () => {
      mockDocumentValidationService.isEnabled.mockReturnValue(true);
      mockPrisma.document.findFirst.mockResolvedValue(null);
      const req = mockReq({ params: { id: '999' } });
      const res = mockRes();

      await ApprovalController.recheckDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should enqueue recheck and return job id', async () => {
      mockDocumentValidationService.isEnabled.mockReturnValue(true);
      mockPrisma.document.findFirst.mockResolvedValue({ id: 1, status: 'PENDIENTE_APROBACION' });
      mockQueueService.addDocumentAIValidation.mockResolvedValue('job-123');
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.recheckDocument(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBe('job-123');
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      mockDocumentValidationService.isEnabled.mockImplementation(() => { throw new Error('fail'); });
      const req = mockReq({ params: { id: '1' } });
      const res = mockRes();

      await ApprovalController.recheckDocument(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
