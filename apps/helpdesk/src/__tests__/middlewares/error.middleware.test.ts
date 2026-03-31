/**
 * Unit Tests for Error Middleware
 */

import { Request, Response } from 'express';
import { errorHandler, notFoundHandler, createError, createOwnershipError, ApiError } from '../../middlewares/error.middleware';

// Mock logger
jest.mock('../../config/logger', () => ({
  AppLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

import { AppLogger } from '../../config/logger';

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    jest.clearAllMocks();
    // Reset NODE_ENV
    delete process.env.NODE_ENV;
  });

  describe('errorHandler', () => {
    test('should handle 500 server errors', () => {
      const error: ApiError = new Error('Database connection failed');
      error.statusCode = 500;
      error.code = 'DB_ERROR';

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Database connection failed',
          code: 'DB_ERROR',
        })
      );
      expect(AppLogger.error).toHaveBeenCalled();
    });

    test('should handle 400 client errors', () => {
      const error: ApiError = new Error('Invalid input');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(AppLogger.warn).toHaveBeenCalled();
    });

    test('should use default values for missing error properties', () => {
      const error = new Error() as ApiError;

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Error interno del servidor',
          code: 'INTERNAL_ERROR',
        })
      );
    });

    test('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error: ApiError = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace',
        })
      );
    });

    test('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error: ApiError = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
      // Stack should not be in response in production
      const callArgs = mockJson.mock.calls[0][0];
      expect(callArgs.stack).toBeUndefined();
    });

    test('should include details when provided', () => {
      process.env.NODE_ENV = 'development';
      const error: ApiError = new Error('Test error');
      error.details = { field: 'email', reason: 'invalid' };

      errorHandler(error, mockReq as Request, mockRes as Response, jest.fn());

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { field: 'email', reason: 'invalid' },
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    test('should return 404 with route info', () => {
      mockReq = {
        method: 'GET',
        path: '/api/unknown',
      };

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Ruta no encontrada',
        code: 'NOT_FOUND',
        path: '/api/unknown',
        method: 'GET',
      });
    });

    test('should log the not found route', () => {
      mockReq = {
        method: 'POST',
        path: '/api/test',
      };

      notFoundHandler(mockReq as Request, mockRes as Response);

      expect(AppLogger.debug).toHaveBeenCalledWith('Ruta no encontrada: POST /api/test');
    });
  });

  describe('createError', () => {
    test('should create error with all properties', () => {
      const error = createError(400, 'Validation failed', 'VALIDATION_ERROR', { field: 'name' });

      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'name' });
    });

    test('should create error with minimal properties', () => {
      const error = createError(500, 'Server error');

      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });

  describe('createOwnershipError', () => {
    test('should create 403 ownership error', () => {
      const error = createOwnershipError('ticket');

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('No tienes permiso para acceder a este ticket');
      expect(error.code).toBe('FORBIDDEN');
    });

    test('should create ownership error for different resource types', () => {
      const error = createOwnershipError('mensaje');

      expect(error.message).toContain('mensaje');
    });
  });
});
