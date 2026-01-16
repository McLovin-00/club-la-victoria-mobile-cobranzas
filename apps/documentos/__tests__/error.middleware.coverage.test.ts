/**
 * Coverage tests for Error Middleware
 * These tests import real code to generate coverage
 * @jest-environment node
 */

jest.mock('../src/config/logger', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({ NODE_ENV: 'development' }),
}));

// Import the actual middleware after mocking
import { createError, errorHandler, notFoundHandler, DocumentosError } from '../src/middlewares/error.middleware';
import { Request, Response, NextFunction } from 'express';

describe('Error Middleware Coverage Tests', () => {
  describe('createError', () => {
    it('should create error with message and code', () => {
      const error = createError('Test error', 400, 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should create error with default status code', () => {
      const error = createError('Internal error');
      expect(error.statusCode).toBe(500);
    });

    it('should create error with default code', () => {
      const error = createError('Test', 400);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should include details if provided', () => {
      const error = createError('Test', 400, 'TEST', { field: 'email' });
      expect((error as any).details).toEqual({ field: 'email' });
    });

    it('should create 404 error', () => {
      const error = createError('Not found', 404, 'NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('should create 403 forbidden error', () => {
      const error = createError('Access denied', 403, 'FORBIDDEN');
      expect(error.statusCode).toBe(403);
    });

    it('should create 401 unauthorized error', () => {
      const error = createError('Unauthorized', 401, 'UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('errorHandler', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
      jsonSpy = jest.fn();
      statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
      mockRes = {
        status: statusSpy,
      } as any;
      mockReq = {
        method: 'GET',
        path: '/test',
        ip: '127.0.0.1',
        get: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('should handle INVALID_FILE_TYPE error', () => {
      const error: DocumentosError = {
        name: 'Error',
        message: 'Original message',
        code: 'INVALID_FILE_TYPE',
        statusCode: 400
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Tipo de archivo no permitido. Solo PDF, JPG, PNG.',
        code: 'INVALID_FILE_TYPE'
      }));
    });

    it('should handle FILE_TOO_LARGE error', () => {
      const error: DocumentosError = {
        name: 'Error',
        message: 'Original',
        code: 'FILE_TOO_LARGE',
        statusCode: 413
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'El archivo es demasiado grande. Máximo 10MB permitido.'
      }));
    });

    it('should handle EMPRESA_NOT_ENABLED error', () => {
      const error: DocumentosError = {
        name: 'Error',
        message: 'Original',
        code: 'EMPRESA_NOT_ENABLED',
        statusCode: 403
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Servicio de documentos no habilitado para este dador.'
      }));
    });

    it('should handle DOCUMENT_NOT_FOUND error', () => {
      const error: DocumentosError = {
        name: 'Error',
        message: 'Original',
        code: 'DOCUMENT_NOT_FOUND',
        statusCode: 404
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Documento no encontrado.'
      }));
    });

    it('should handle VALIDATION_FAILED error', () => {
      const error: DocumentosError = {
        name: 'Error',
        message: 'Original',
        code: 'VALIDATION_FAILED',
        statusCode: 422
      };

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Error en la validación del documento.'
      }));
    });

    it('should handle minimal error input', () => {
      const error: DocumentosError = {
        name: 'Error',
        message: 'Fatal error'
      };
      // Should default to 500 and INTERNAL_ERROR
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INTERNAL_ERROR'
      }));
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 and log warning', () => {
      const jsonSpy = jest.fn();
      const statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
      const mockRes = { status: statusSpy } as any;
      const mockReq = { method: 'GET', path: '/unknown', ip: '1.2.3.4' } as any;

      notFoundHandler(mockReq, mockRes);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        code: 'ROUTE_NOT_FOUND'
      }));
    });
  });
});
