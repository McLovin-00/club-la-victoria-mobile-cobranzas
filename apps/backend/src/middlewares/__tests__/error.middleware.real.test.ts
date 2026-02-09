/**
 * Tests reales para ErrorMiddleware
 * @jest-environment node
 */

import { z } from 'zod';
import { createMockRes } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import ErrorMiddleware, {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  createError,
} from '../error.middleware';

describe('ErrorMiddleware (real)', () => {
  it('createError sets fields', () => {
    const e = createError('x', 400, 'CODE', { a: 1 });
    expect(e.message).toBe('x');
    expect((e as any).statusCode).toBe(400);
    expect((e as any).code).toBe('CODE');
    expect((e as any).details).toEqual({ a: 1 });
  });

  it('helpers create proper errors', () => {
    expect(NotFoundError('X').statusCode).toBe(404);
    expect(UnauthorizedError().statusCode).toBe(401);
    expect(ForbiddenError().statusCode).toBe(403);
    expect(ConflictError('x').statusCode).toBe(409);
    expect(BadRequestError('x').statusCode).toBe(400);
  });

  it('handle ZodError -> 400 with details', () => {
    const schema = z.object({ a: z.string().min(2) });
    const err = schema.safeParse({ a: '' });
    expect(err.success).toBe(false);

    const req: any = { originalUrl: '/x', method: 'POST', ip: '1.1.1.1', get: () => 'ua', body: {}, query: {}, params: {} };
    const res = createMockRes();

    ErrorMiddleware.handle((err as any).error, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Validation Error' }));
  });

  it('handle custom error uses statusCode', () => {
    const req: any = { originalUrl: '/x', method: 'GET', ip: '1', get: () => 'ua', body: {}, query: {}, params: {} };
    const res = createMockRes();
    ErrorMiddleware.handle(createError('no', 403, 'FORBIDDEN'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('handle database-like errors maps to 409/400/404', () => {
    const req: any = { originalUrl: '/x', method: 'GET', ip: '1', get: () => 'ua', body: {}, query: {}, params: {} };
    const res = createMockRes();

    class PrismaClientKnownRequestError extends Error {}
    ErrorMiddleware.handle(new PrismaClientKnownRequestError('Unique constraint failed'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);

    const res2 = createMockRes();
    ErrorMiddleware.handle(new PrismaClientKnownRequestError('Foreign key constraint'), req, res2, jest.fn());
    expect(res2.status).toHaveBeenCalledWith(400);

    const res3 = createMockRes();
    ErrorMiddleware.handle(new PrismaClientKnownRequestError('Record to update not found'), req, res3, jest.fn());
    expect(res3.status).toHaveBeenCalledWith(404);
  });

  it('handle jwt-like error -> 401', () => {
    const req: any = { originalUrl: '/x', method: 'GET', ip: '1', get: () => 'ua', body: {}, query: {}, params: {} };
    const res = createMockRes();
    const e = new Error('jwt expired');
    (e as any).name = 'TokenExpiredError';
    ErrorMiddleware.handle(e, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('generic error -> 500', () => {
    const req: any = { originalUrl: '/x', method: 'GET', ip: '1', get: () => 'ua', body: {}, query: {}, params: {} };
    const res = createMockRes();
    ErrorMiddleware.handle(new Error('boom'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('asyncHandler catches rejected promise', async () => {
    const next = jest.fn();
    const handler = ErrorMiddleware.asyncHandler(async () => {
      throw new Error('x');
    });
    await handler({} as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('notFound passes error to next', () => {
    const next = jest.fn();
    ErrorMiddleware.notFound({ method: 'GET', originalUrl: '/nope' } as any, {} as any, next);
    expect(next).toHaveBeenCalled();
  });
});


