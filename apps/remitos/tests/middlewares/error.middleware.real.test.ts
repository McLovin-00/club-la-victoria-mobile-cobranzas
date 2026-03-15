/**
 * Tests reales para error.middleware.ts
 * @jest-environment node
 */

import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { createError, errorHandler, notFoundHandler } from '../../src/middlewares/error.middleware';

describe('error.middleware', () => {
  it('createError sets statusCode and code', () => {
    const e = createError('x', 400, 'BAD');
    expect((e as any).statusCode).toBe(400);
    expect((e as any).code).toBe('BAD');
  });

  it('errorHandler returns json with timestamp', () => {
    const res = createMockRes();
    errorHandler(createError('boom', 500, 'X'), {} as any, res as any, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalled();
    const payload = JSON.parse((res.send as any).mock.calls[0][0]);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('X');
    expect(payload.message).toBe('Error interno del servidor');
    expect(payload.timestamp).toBeDefined();
  });

  it('notFoundHandler returns 404', () => {
    const res = createMockRes();
    notFoundHandler({ method: 'GET', path: '/nope' } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});


