import { Response } from 'express';

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

import { ApprovalService } from '../../src/services/approval.service';
import { ApprovalController } from '../../src/controllers/approval.controller';

describe('ApprovalController', () => {
  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status } as any as Partial<Response> & { json: jest.Mock; status: jest.Mock };
  };

  it('getPendingDocuments returns success and handles errors', async () => {
    const res = makeRes();
    await ApprovalController.getPendingDocuments({ tenantId: 1, query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    (ApprovalService.getPendingDocuments as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const res2 = makeRes();
    await ApprovalController.getPendingDocuments({ tenantId: 1, query: {} } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(500);
  });

  it('batchApprove validates user/role/ids and returns results', async () => {
    const res = makeRes();
    await ApprovalController.batchApprove({ tenantId: 1, user: null, body: { ids: [1] }, method: 'POST', path: '/x' } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);

    const res2 = makeRes();
    await ApprovalController.batchApprove({ tenantId: 1, user: { userId: 1, role: 'TRANSPORTISTA' }, body: { ids: [1] }, method: 'POST', path: '/x' } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(403);

    const res3 = makeRes();
    await ApprovalController.batchApprove({ tenantId: 1, user: { userId: 1, role: 'ADMIN' }, body: { ids: [] }, method: 'POST', path: '/x' } as any, res3 as any);
    expect(res3.status).toHaveBeenCalledWith(400);

    const res4 = makeRes();
    await ApprovalController.batchApprove({ tenantId: 1, user: { userId: 1, role: 'ADMIN' }, body: { ids: [1, 2] }, method: 'POST', path: '/x' } as any, res4 as any);
    expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getPendingDocument returns 404 when null and returns previewUrl when found', async () => {
    const res = makeRes();
    await ApprovalController.getPendingDocument({ tenantId: 1, params: { id: '1' }, get: jest.fn(), protocol: 'http' } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);

    (ApprovalService.getPendingDocument as jest.Mock).mockResolvedValueOnce({ id: 1 } as any);
    const res2 = makeRes();
    const req2: any = { tenantId: 1, params: { id: '1' }, get: jest.fn((h: string) => (h === 'host' ? 'h' : 'http')), protocol: 'http' };
    await ApprovalController.getPendingDocument(req2, res2 as any);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('approveDocument/rejectDocument enforce role and map not found', async () => {
    const res = makeRes();
    await ApprovalController.approveDocument({ tenantId: 1, user: { userId: 1, role: 'EMPRESA_TRANSPORTISTA' }, params: { id: '1' }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(403);

    (ApprovalService.approveDocument as jest.Mock).mockRejectedValueOnce(new Error('no encontrado'));
    const res2 = makeRes();
    await ApprovalController.approveDocument({ tenantId: 1, user: { userId: 1, role: 'ADMIN' }, params: { id: '1' }, body: {} } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(404);

    const res3 = makeRes();
    await ApprovalController.rejectDocument({ tenantId: 1, user: { userId: 1, role: 'ADMIN' }, params: { id: '1' }, body: { reason: 'x' } } as any, res3 as any);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});


