/**
 * Extended Tests for ErrorMiddleware - Coverage for database errors, JWT errors,
 * custom errors, and helper functions
 * @jest-environment node
 */

import { ZodError } from 'zod';

// Mock dependencies
jest.mock('../../config/logger', () => ({
    AppLogger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import ErrorMiddleware, {
    createError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    BadRequestError,
    CustomError,
} from '../error.middleware';

describe('ErrorMiddleware Extended Tests', () => {
    const mockReq = {
        method: 'POST',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        body: { test: 'data' },
        query: { page: '1' },
        params: { id: '1' },
        get: jest.fn().mockReturnValue('test-user-agent'),
        user: { id: 1, email: 'test@example.com' },
    } as any;

    const createMockRes = () => {
        const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        return res;
    };

    const mockNext = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handle - ZodError', () => {
        it('should handle ZodError with formatted validation errors', () => {
            const res = createMockRes();
            const zodError = new ZodError([
                {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'number',
                    path: ['email'],
                    message: 'Expected string, received number',
                },
                {
                    code: 'too_small',
                    minimum: 1,
                    type: 'string',
                    inclusive: true,
                    exact: false,
                    path: ['password'],
                    message: 'String must contain at least 1 character(s)',
                },
            ]);

            ErrorMiddleware.handle(zodError, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Validation Error',
                    message: 'Los datos proporcionados no son válidos',
                    details: expect.arrayContaining([
                        expect.objectContaining({
                            field: 'email',
                            code: 'invalid_type',
                        }),
                    ]),
                })
            );
        });
    });

    describe('handle - CustomError', () => {
        it('should handle CustomError with statusCode', () => {
            const res = createMockRes();
            const error: CustomError = new Error('Custom error message');
            error.statusCode = 403;
            error.code = 'FORBIDDEN';
            error.details = { reason: 'access denied' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Custom error message',
                    details: { reason: 'access denied' },
                })
            );
        });

        it('should handle CustomError with only code property', () => {
            const res = createMockRes();
            const error: CustomError = new Error('Code only error');
            error.code = 'SOME_ERROR_CODE';

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'SOME_ERROR_CODE',
                })
            );
        });
    });

    describe('handle - Database Errors', () => {
        it('should handle Unique constraint violation', () => {
            const res = createMockRes();
            const error = new Error('Unique constraint failed on the constraint');
            (error as any).constructor = { name: 'PrismaClientKnownRequestError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Database Error',
                    message: 'El registro ya existe',
                })
            );
        });

        it('should handle Foreign key constraint violation', () => {
            const res = createMockRes();
            const error = new Error('Foreign key constraint failed');
            (error as any).constructor = { name: 'PrismaClientKnownRequestError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Database Error',
                    message: 'Referencia inválida',
                })
            );
        });

        it('should handle Record to update not found', () => {
            const res = createMockRes();
            const error = new Error('Record to update not found');
            (error as any).constructor = { name: 'PrismaClientKnownRequestError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Database Error',
                    message: 'Registro no encontrado',
                })
            );
        });

        it('should handle generic database error', () => {
            const res = createMockRes();
            const error = new Error('Unknown database problem');
            (error as any).constructor = { name: 'PrismaClientUnknownRequestError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Database Error',
                    message: 'Error de base de datos',
                })
            );
        });

        it('should recognize PrismaClientValidationError', () => {
            const res = createMockRes();
            const error = new Error('Query validation failed');
            (error as any).constructor = { name: 'PrismaClientValidationError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Database Error',
                })
            );
        });
    });

    describe('handle - JWT Errors', () => {
        it('should handle jwt expired error', () => {
            const res = createMockRes();
            const error = new Error('jwt expired');
            (error as any).constructor = { name: 'TokenExpiredError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Authentication Error',
                    message: 'Token expirado',
                })
            );
        });

        it('should handle jwt malformed error', () => {
            const res = createMockRes();
            const error = new Error('jwt malformed');
            (error as any).constructor = { name: 'JsonWebTokenError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Authentication Error',
                    message: 'Token malformado',
                })
            );
        });

        it('should handle invalid signature error', () => {
            const res = createMockRes();
            const error = new Error('invalid signature');
            (error as any).constructor = { name: 'JsonWebTokenError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Authentication Error',
                    message: 'Token inválido',
                })
            );
        });

        it('should handle NotBeforeError', () => {
            const res = createMockRes();
            const error = new Error('jwt not active yet');
            (error as any).constructor = { name: 'NotBeforeError' };

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Authentication Error',
                })
            );
        });

        it('should handle generic jwt error message', () => {
            const res = createMockRes();
            const error = new Error('jwt general authentication issue');

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Authentication Error',
                    message: 'Error de autenticación',
                })
            );
        });
    });

    describe('handle - Generic Errors', () => {
        it('should handle generic Error in development mode', () => {
            const res = createMockRes();
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new Error('Some unexpected error');

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Internal Server Error',
                    message: 'Some unexpected error',
                })
            );

            process.env.NODE_ENV = originalEnv;
        });

        it('should hide error message in production mode', () => {
            const res = createMockRes();
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Sensitive error details');

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Internal Server Error',
                    message: 'Error interno del servidor',
                })
            );

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('notFound middleware', () => {
        it('should call next with 404 error', () => {
            const res = createMockRes();
            const next = jest.fn();

            ErrorMiddleware.notFound(mockReq, res, next);

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: 404,
                    code: 'ROUTE_NOT_FOUND',
                    message: expect.stringContaining('Ruta no encontrada'),
                })
            );
        });
    });

    describe('asyncHandler', () => {
        it('should call next on promise rejection', async () => {
            const next = jest.fn();
            const res = createMockRes();
            const errorFn = async () => {
                throw new Error('Async error');
            };

            const handler = ErrorMiddleware.asyncHandler(errorFn);
            await handler(mockReq, res, next);

            // Wait for promise to settle
            await new Promise(resolve => setImmediate(resolve));

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should work for successful async functions', async () => {
            const next = jest.fn();
            const res = createMockRes();
            const successFn = async (req: any, res: any) => {
                res.json({ success: true });
            };

            const handler = ErrorMiddleware.asyncHandler(successFn);
            await handler(mockReq, res, next);

            expect(res.json).toHaveBeenCalledWith({ success: true });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Error helper functions', () => {
        it('createError should create a CustomError with all properties', () => {
            const error = createError('Test error', 422, 'VALIDATION_FAILED', { field: 'email' });

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(422);
            expect(error.code).toBe('VALIDATION_FAILED');
            expect(error.details).toEqual({ field: 'email' });
        });

        it('createError should use default statusCode 500', () => {
            const error = createError('Default error');

            expect(error.statusCode).toBe(500);
        });

        it('NotFoundError should create 404 error', () => {
            const error = NotFoundError('Usuario');

            expect(error.message).toBe('Usuario no encontrado');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
        });

        it('NotFoundError should use default resource name', () => {
            const error = NotFoundError();

            expect(error.message).toBe('Recurso no encontrado');
        });

        it('UnauthorizedError should create 401 error', () => {
            const error = UnauthorizedError('Token invalido');

            expect(error.message).toBe('Token invalido');
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('UNAUTHORIZED');
        });

        it('UnauthorizedError should use default message', () => {
            const error = UnauthorizedError();

            expect(error.message).toBe('No autorizado');
        });

        it('ForbiddenError should create 403 error', () => {
            const error = ForbiddenError('Sin permisos');

            expect(error.message).toBe('Sin permisos');
            expect(error.statusCode).toBe(403);
            expect(error.code).toBe('FORBIDDEN');
        });

        it('ForbiddenError should use default message', () => {
            const error = ForbiddenError();

            expect(error.message).toBe('Acceso denegado');
        });

        it('ConflictError should create 409 error', () => {
            const error = ConflictError('El registro ya existe');

            expect(error.message).toBe('El registro ya existe');
            expect(error.statusCode).toBe(409);
            expect(error.code).toBe('CONFLICT');
        });

        it('BadRequestError should create 400 error', () => {
            const error = BadRequestError('Datos incorrectos');

            expect(error.message).toBe('Datos incorrectos');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('BAD_REQUEST');
        });
    });

    describe('Logging behavior', () => {
        const { AppLogger } = require('../../config/logger');

        it('should log client error (4xx) as warning', () => {
            const res = createMockRes();
            const error: CustomError = new Error('Client error');
            error.statusCode = 400;
            error.code = 'BAD_REQUEST';

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(AppLogger.warn).toHaveBeenCalledWith(
                'Error del cliente',
                expect.objectContaining({
                    errorMessage: 'Client error',
                })
            );
        });

        it('should log server error (5xx) as error', () => {
            const res = createMockRes();
            const error = new Error('Server error');

            ErrorMiddleware.handle(error, mockReq, res, mockNext);

            expect(AppLogger.error).toHaveBeenCalledWith(
                'Error del servidor',
                expect.objectContaining({
                    errorMessage: 'Server error',
                })
            );
        });
    });
});
