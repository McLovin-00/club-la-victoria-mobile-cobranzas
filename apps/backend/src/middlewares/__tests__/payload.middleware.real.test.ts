/**
 * Tests reales para middlewares/payload.middleware.ts
 * @jest-environment node
 */

jest.mock('../../config/logger', () => ({
  AppLogger: { warn: jest.fn(), error: jest.fn() },
}));

import { validatePayloadSize, validateBatchCount } from '../payload.middleware';

describe('payload.middleware (real)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validatePayloadSize returns 413 when Content-Length exceeds limit', () => {
    const mw = validatePayloadSize(1); // 1MB
    const req: any = { get: jest.fn(() => String(2 * 1024 * 1024)), url: '/x', method: 'POST' };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const next = jest.fn();
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(next).not.toHaveBeenCalled();
  });

  it('validatePayloadSize calls next when no header or within limit; continues on internal error', () => {
    const mw = validatePayloadSize(1);
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const next = jest.fn();

    mw({ get: jest.fn(() => undefined) } as any, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    const reqErr: any = { get: jest.fn(() => { throw new Error('x'); }) };
    mw(reqErr, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('validateBatchCount returns 400 when array too big; calls next otherwise; continues on error', () => {
    const mw = validateBatchCount(2);
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const next = jest.fn();

    mw({ body: [1, 2, 3], url: '/x', method: 'POST' } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    mw({ body: [1], url: '/x', method: 'POST' } as any, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    mw({ body: { length: 3 }, url: '/x', method: 'POST' } as any, res, next);
    // no throw, still next or no-op; ensure it doesn't crash
  });
});


