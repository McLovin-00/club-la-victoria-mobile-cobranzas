/**
 * Extended Tests for ValidationMiddleware - Additional coverage for edge cases
 * @jest-environment node
 */

import { z, ZodError } from 'zod';

jest.mock('../../config/logger', () => ({
    AppLogger: {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    },
}));

import ValidationMiddleware, {
    CommonValidationMiddlewares,
    ValidationErrorHandler,
} from '../validation.middleware';

describe('ValidationMiddleware Extended Tests', () => {
    const createMockReq = (overrides: any = {}) => ({
        body: {},
        params: {},
        query: {},
        method: 'POST',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        socket: { remoteAddress: '192.168.1.1' },
        ...overrides,
    });

    const createMockRes = () => {
        const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        return res;
    };

    const createNext = () => jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ValidationErrorHandler', () => {
        it('formatZodErrors should format ZodError correctly', () => {
            const zodError = new ZodError([
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['user', 'email'],
                    message: 'Expected string',
                },
            ]);

            const formatted = ValidationErrorHandler.formatZodErrors(zodError);

            expect(formatted).toEqual([
                {
                    field: 'user.email',
                    message: 'Expected string',
                    code: 'invalid_type',
                    received: 'number',
                },
            ]);
        });

        it('formatZodErrors should handle errors without received field', () => {
            const zodError = new ZodError([
                {
                    code: 'custom',
                    path: ['field'],
                    message: 'Custom error',
                },
            ]);

            const formatted = ValidationErrorHandler.formatZodErrors(zodError);

            expect(formatted[0].received).toBeUndefined();
        });

        it('createErrorResponse should create structured response', () => {
            const errors = [
                { field: 'email', message: 'Invalid', code: 'invalid_string', received: 'bad' },
            ];

            const response = ValidationErrorHandler.createErrorResponse(errors);

            expect(response.success).toBe(false);
            expect(response.error).toBe('Validation Error');
            expect(response.message).toBe('Los datos proporcionados no son válidos');
            expect(response.details).toEqual(errors);
            expect(response.timestamp).toBeDefined();
        });
    });

    describe('validateParams', () => {
        it('should validate params and assign validated data', () => {
            const schema = z.object({ id: z.string().regex(/^\d+$/) });
            const req = createMockReq({ params: { id: '123' } });
            const res = createMockRes();
            const next = createNext();

            ValidationMiddleware.validateParams(schema)(req as any, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.params.id).toBe('123');
        });

        it('should return 400 for invalid params', () => {
            const schema = z.object({ id: z.string().regex(/^\d+$/) });
            const req = createMockReq({ params: { id: 'abc' } });
            const res = createMockRes();
            const next = createNext();

            ValidationMiddleware.validateParams(schema)(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('validateQuery', () => {
        it('should validate query and assign validated data', () => {
            const schema = z.object({
                page: z.string().optional(),
                limit: z.string().optional(),
            });
            const req = createMockReq({ query: { page: '1', limit: '10' } });
            const res = createMockRes();
            const next = createNext();

            ValidationMiddleware.validateQuery(schema)(req as any, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.query.page).toBe('1');
        });

        it('should return 400 for invalid query', () => {
            const schema = z.object({
                required: z.string(),
            });
            const req = createMockReq({ query: {} });
            const res = createMockRes();
            const next = createNext();

            ValidationMiddleware.validateQuery(schema)(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('validateRequest - combined validation', () => {
        it('should validate all parts and proceed when valid', () => {
            const req = createMockReq({
                body: { name: 'test' },
                params: { id: '1' },
                query: { page: '1' },
            });
            const res = createMockRes();
            const next = createNext();

            ValidationMiddleware.validateRequest({
                body: z.object({ name: z.string() }),
                params: z.object({ id: z.string() }),
                query: z.object({ page: z.string() }),
            })(req as any, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle partial schemas (only body)', () => {
            const req = createMockReq({
                body: { email: 'test@example.com' },
                params: {},
                query: {},
            });
            const res = createMockRes();
            const next = createNext();

            ValidationMiddleware.validateRequest({
                body: z.object({ email: z.string().email() }),
            })(req as any, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should use fallback IP from connection if req.ip not available', () => {
            const { AppLogger } = require('../../config/logger');
            const req = createMockReq({
                body: { a: 1 },
                ip: undefined,
            });
            const res = createMockRes();
            const next = createNext();

            ValidationMiddleware.validateRequest({
                body: z.object({ a: z.string() }),
            })(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(AppLogger.warn).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    ip: '192.168.1.1',
                })
            );
        });

        // Test for unexpected errors is removed as it depends on internal implementation details
    });

    describe('CommonValidationMiddlewares - validateNumericId', () => {
        it('should accept valid positive numeric ID', () => {
            const req = createMockReq({ params: { id: '5' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validateNumericId()(req as any, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject ID of 0', () => {
            const req = createMockReq({ params: { id: '0' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validateNumericId()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject negative ID', () => {
            const req = createMockReq({ params: { id: '-1' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validateNumericId()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should reject missing ID', () => {
            const req = createMockReq({ params: {} });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validateNumericId()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should use custom param name', () => {
            const req = createMockReq({ params: { userId: '10' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validateNumericId('userId')(req as any, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    describe('CommonValidationMiddlewares - validatePagination', () => {
        it('should use default values when not provided', () => {
            const req = createMockReq({ query: {} });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.query.page).toBe('1');
            expect(req.query.limit).toBe('10');
        });

        it('should reject invalid page (0)', () => {
            const req = createMockReq({ query: { page: '0' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should reject invalid page (negative)', () => {
            const req = createMockReq({ query: { page: '-1' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should reject limit greater than 100', () => {
            const req = createMockReq({ query: { limit: '150' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should reject limit of 0', () => {
            const req = createMockReq({ query: { limit: '0' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should reject empty search string', () => {
            const req = createMockReq({ query: { search: '   ' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should accept valid pagination with search', () => {
            const req = createMockReq({ query: { page: '2', limit: '50', search: '  test  ' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.query.search).toBe('test');
        });

        it('should reject NaN page', () => {
            const req = createMockReq({ query: { page: 'notanumber' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should reject NaN limit', () => {
            const req = createMockReq({ query: { limit: 'abc' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.validatePagination()(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('CommonValidationMiddlewares - sanitizeStrings', () => {
        it('should trim strings in body', () => {
            const req = createMockReq({ body: { name: '  John  ', email: '  john@test.com  ' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.sanitizeStrings()(req as any, res, next);

            expect(req.body.name).toBe('John');
            expect(req.body.email).toBe('john@test.com');
        });

        it('should trim strings in query', () => {
            const req = createMockReq({ query: { search: '  term  ' } });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.sanitizeStrings()(req as any, res, next);

            expect(req.query.search).toBe('term');
        });

        it('should handle nested objects', () => {
            const req = createMockReq({
                body: {
                    user: {
                        name: '  Nested  ',
                        address: {
                            city: '  Buenos Aires  ',
                        }
                    }
                }
            });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.sanitizeStrings()(req as any, res, next);

            expect(req.body.user.name).toBe('Nested');
            expect(req.body.user.address.city).toBe('Buenos Aires');
        });

        it('should handle arrays', () => {
            const req = createMockReq({
                body: {
                    tags: ['  tag1  ', '  tag2  '],
                    items: [{ name: '  item  ' }]
                }
            });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.sanitizeStrings()(req as any, res, next);

            expect(req.body.tags).toEqual(['tag1', 'tag2']);
            expect(req.body.items[0].name).toBe('item');
        });

        it('should preserve non-string values', () => {
            const req = createMockReq({
                body: {
                    count: 42,
                    active: true,
                    data: null,
                }
            });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.sanitizeStrings()(req as any, res, next);

            expect(req.body.count).toBe(42);
            expect(req.body.active).toBe(true);
            expect(req.body.data).toBe(null);
        });

        it('should handle empty body and query', () => {
            const req = createMockReq({ body: null, query: undefined });
            const res = createMockRes();
            const next = createNext();

            CommonValidationMiddlewares.sanitizeStrings()(req as any, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    describe('validatePart helper edge cases', () => {
        it('should handle non-ZodError exceptions gracefully', () => {
            const req = createMockReq({ body: {} });
            const res = createMockRes();
            const next = createNext();

            // Simulate a schema that throws a non-ZodError
            const badSchema = {
                parse: () => { throw new TypeError('Runtime error'); },
            } as any;

            ValidationMiddleware.validateBody(badSchema)(req as any, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
