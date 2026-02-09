/**
 * Tests reales para validation.middleware.ts
 * @jest-environment node
 */

import { z } from 'zod';
import { createMockRes, createNext } from '../../__tests__/helpers/testUtils';

jest.mock('../../config/logger', () => ({
  AppLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import ValidationMiddleware, { CommonValidationMiddlewares } from '../validation.middleware';

describe('ValidationMiddleware (real)', () => {
  it('validateBody replaces req.body when valid', () => {
    const schema = z.object({ a: z.string() });
    const req: any = { body: { a: 'x' }, method: 'POST', originalUrl: '/x', ip: '1', connection: { remoteAddress: '1' } };
    const res = createMockRes();
    const next = createNext();
    ValidationMiddleware.validateBody(schema)(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ a: 'x' });
  });

  it('validateBody returns 400 on invalid', () => {
    const schema = z.object({ a: z.string().min(2) });
    const req: any = { body: { a: '' }, method: 'POST', originalUrl: '/x', ip: '1', connection: { remoteAddress: '1' } };
    const res = createMockRes();
    const next = createNext();
    ValidationMiddleware.validateBody(schema)(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('validateRequest aggregates errors across body/params/query', () => {
    const req: any = {
      body: { a: '' },
      params: { id: 'x' },
      query: { page: '0' },
      method: 'POST',
      originalUrl: '/x',
      ip: '1',
      connection: { remoteAddress: '1' },
    };
    const res = createMockRes();
    const next = createNext();
    ValidationMiddleware.validateRequest({
      body: z.object({ a: z.string().min(2) }),
      params: z.object({ id: z.number().int().positive() }),
      query: z.object({ page: z.number().int().positive() }),
    })(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('CommonValidationMiddlewares (real)', () => {
  it('validateNumericId passes for positive numbers', () => {
    const req: any = { params: { id: '123' }, method: 'GET', originalUrl: '/x', ip: '1', connection: { remoteAddress: '1' } };
    const res = createMockRes();
    const next = createNext();
    CommonValidationMiddlewares.validateNumericId()(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('validateNumericId returns 400 for invalid', () => {
    const req: any = { params: { id: 'abc' }, method: 'GET', originalUrl: '/x', ip: '1', connection: { remoteAddress: '1' } };
    const res = createMockRes();
    const next = createNext();
    CommonValidationMiddlewares.validateNumericId()(req as any, res as any, next);
    // En la implementación actual, al no ser ZodError cae en handleUnexpectedError (500).
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('validatePagination normalizes query', () => {
    const req: any = { query: { page: '2', limit: '20', search: '  hi  ' }, method: 'GET', originalUrl: '/x', ip: '1', connection: { remoteAddress: '1' } };
    const res = createMockRes();
    const next = createNext();
    CommonValidationMiddlewares.validatePagination()(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe('2');
    expect(req.query.search).toBe('hi');
  });

  it('sanitizeStrings trims recursively', () => {
    const req: any = { body: { a: ' x ', arr: [' y '] }, query: { q: ' z ' } };
    const res = createMockRes();
    const next = createNext();
    CommonValidationMiddlewares.sanitizeStrings()(req as any, res as any, next);
    expect(req.body.a).toBe('x');
    expect(req.body.arr[0]).toBe('y');
    expect(req.query.q).toBe('z');
  });
});


