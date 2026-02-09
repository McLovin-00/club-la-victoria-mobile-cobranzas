import type { Response } from 'express';

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/websocket.service', () => ({
  webSocketService: { notifyDocumentApproved: jest.fn() },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/performance.service', () => ({
  performanceService: { refreshMaterializedView: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/approval.service', () => ({
  ApprovalService: {
    getPendingDocuments: jest.fn(async () => ({ data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } })),
    getPendingDocument: jest.fn(async () => null),
    approveDocument: jest.fn(async () => ({ id: 1, dadorCargaId: 2, expiresAt: null })),
    rejectDocument: jest.fn(async () => ({ id: 1 })),
    getApprovalStats: jest.fn(async () => ({ total: 0 })),
  },
}));

// Para recheckDocument (imports dinámicos)
jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

const addDocumentAIValidationMock = jest.fn();
jest.mock('../../src/services/queue.service', () => ({
  queueService: { addDocumentAIValidation: (...args: any[]) => addDocumentAIValidationMock(...args) },
}));

const validationEnabledMock = jest.fn();
jest.mock('../../src/services/document-validation.service', () => ({
  documentValidationService: { isEnabled: () => validationEnabledMock() },
}));

import { ApprovalController } from '../../src/controllers/approval.controller';
import { ApprovalService } from '../../src/services/approval.service';
import { webSocketService } from '../../src/services/websocket.service';

describe('ApprovalController (more)', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    validationEnabledMock.mockReturnValue(true);
    addDocumentAIValidationMock.mockResolvedValue('job-1');
  });

  it('approveDocument returns 401 when userId missing and success triggers websocket', async () => {
    const res = makeRes();
    await ApprovalController.approveDocument({ tenantId: 1, user: null, params: { id: '1' }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);

    (ApprovalService.approveDocument as jest.Mock).mockResolvedValueOnce({ id: 5, dadorCargaId: 9, expiresAt: null });
    const res2 = makeRes();
    await ApprovalController.approveDocument(
      { tenantId: 1, user: { userId: 7, role: 'ADMIN' }, params: { id: '5' }, body: { reviewNotes: 'ok' }, method: 'POST', path: '/x' } as any,
      res2 as any
    );
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect((webSocketService as any).notifyDocumentApproved).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: 5, empresaId: 9 })
    );
  });

  it('rejectDocument blocks transportista and maps not found', async () => {
    const res = makeRes();
    await ApprovalController.rejectDocument({ tenantId: 1, user: { userId: 1, role: 'TRANSPORTISTA' }, params: { id: '1' }, body: { reason: 'x' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(403);

    (ApprovalService.rejectDocument as jest.Mock).mockRejectedValueOnce(new Error('no encontrado'));
    const res2 = makeRes();
    await ApprovalController.rejectDocument({ tenantId: 1, user: { userId: 1, role: 'ADMIN' }, params: { id: '1' }, body: { reason: 'x' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(404);
  });

  it('getStats returns success and handles errors', async () => {
    const res = makeRes();
    await ApprovalController.getStats({ tenantId: 1 } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    (ApprovalService.getApprovalStats as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res2 = makeRes();
    await ApprovalController.getStats({ tenantId: 1 } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it('recheckDocument covers disabled validation, not found and success', async () => {
    const res0 = makeRes();
    await ApprovalController.recheckDocument({ tenantId: 1, user: null, params: { id: '1' } } as any, res0 as any);
    expect(res0.status).toHaveBeenCalledWith(401);

    validationEnabledMock.mockReturnValueOnce(false);
    const res1 = makeRes();
    await ApprovalController.recheckDocument({ tenantId: 1, user: { userId: 1, role: 'ADMIN' }, params: { id: '1' } } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(400);

    validationEnabledMock.mockReturnValueOnce(true);
    prismaMock.document.findFirst.mockResolvedValueOnce(null);
    const res2 = makeRes();
    await ApprovalController.recheckDocument({ tenantId: 1, user: { userId: 1, role: 'ADMIN' }, params: { id: '1' } } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(404);

    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 1, status: 'PENDIENTE_APROBACION' } as any);
    const res3 = makeRes();
    await ApprovalController.recheckDocument(
      { tenantId: 1, user: { userId: 1, role: 'ADMIN' }, params: { id: '1' }, method: 'POST', path: '/x' } as any,
      res3 as any
    );
    expect(addDocumentAIValidationMock).toHaveBeenCalledWith(expect.objectContaining({ documentId: 1, solicitadoPor: 1, esRechequeo: true }));
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: { documentId: 1, jobId: 'job-1' } }));
  });

  it('batchApprove handles per-id errors in results', async () => {
    (ApprovalService.approveDocument as jest.Mock)
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ id: 3 });
    const res = makeRes();
    await ApprovalController.batchApprove(
      { tenantId: 1, user: { userId: 1, role: 'ADMIN' }, body: { ids: [1, 2, 3] }, method: 'POST', path: '/x' } as any,
      res as any
    );
    const payload = res.json.mock.calls[0][0] as any;
    expect(payload.success).toBe(true);
    expect(payload.approved).toBe(2);
    expect(payload.failed).toBe(1);
  });
});


