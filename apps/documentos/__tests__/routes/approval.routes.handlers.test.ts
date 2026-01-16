import type { Response } from 'express';

jest.mock('../../src/middlewares/auth.middleware', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  authorize: () => (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../src/middlewares/rateLimiter.middleware', () => ({
  approvalRateLimit: (_req: any, _res: any, next: any) => next(),
}));

const approveDocument = jest.fn(async () => undefined);
jest.mock('../../src/controllers/approval.controller', () => ({
  ApprovalController: {
    getPendingDocuments: jest.fn(),
    getPendingDocument: jest.fn(),
    approveDocument,
    rejectDocument: jest.fn(),
    getStats: jest.fn(),
    batchApprove: jest.fn(),
    recheckDocument: jest.fn(),
  },
}));

const findFirst = jest.fn(async () => ({ value: 'true' }));
jest.mock('../../src/config/database', () => ({
  prisma: { systemConfig: { findFirst } },
}));

import router from '../../src/routes/approval.routes';

function createRes(): Response & { status: jest.Mock; json: jest.Mock } {
  const res: any = { status: jest.fn(), json: jest.fn() };
  res.status.mockImplementation(() => res);
  res.json.mockImplementation(() => res);
  return res;
}

function findPostHandler(path: string) {
  const layer: any = (router as any).stack.find((l: any) => l.route?.path === path && l.route?.methods?.post);
  if (!layer) throw new Error(`POST ${path} not found`);
  const stack = layer.route.stack;
  return stack[stack.length - 1].handle as Function;
}

describe('approval.routes approve handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findFirst.mockResolvedValue({ value: 'true' });
  });

  it('allows ADMIN_INTERNO directly', async () => {
    const handler = findPostHandler('/pending/:id/approve');
    const res = createRes();
    const req: any = { user: { role: 'ADMIN_INTERNO' } };
    const next = jest.fn();
    await handler(req, res, next);
    expect(approveDocument).toHaveBeenCalled();
  });

  it('requires dador id for DADOR_DE_CARGA', async () => {
    const handler = findPostHandler('/pending/:id/approve');
    const res = createRes();
    const req: any = { user: { role: 'DADOR_DE_CARGA', metadata: {} } };
    const next = jest.fn();
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DADOR_REQUIRED' }));
    expect(approveDocument).not.toHaveBeenCalled();
  });

  it('blocks dador approval when flag disabled; allows when enabled', async () => {
    const handler = findPostHandler('/pending/:id/approve');

    findFirst.mockResolvedValueOnce({ value: 'false' });
    const res = createRes();
    const req: any = { user: { role: 'DADOR_DE_CARGA', metadata: { dadorCargaId: 7 } } };
    const next = jest.fn();
    await handler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DADOR_APPROVAL_DISABLED' }));

    findFirst.mockResolvedValueOnce({ value: 'true' });
    const res2 = createRes();
    await handler(req, res2, next);
    expect(approveDocument).toHaveBeenCalled();
  });

  it('calls next on unexpected error', async () => {
    const handler = findPostHandler('/pending/:id/approve');
    findFirst.mockRejectedValueOnce(new Error('boom'));
    const res = createRes();
    const req: any = { user: { role: 'DADOR_DE_CARGA', metadata: { dadorCargaId: 7 } } };
    const next = jest.fn();
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});


