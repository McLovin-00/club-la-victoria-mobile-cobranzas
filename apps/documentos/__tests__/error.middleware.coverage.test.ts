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

// Import the actual middleware after mocking
import { createError } from '../src/middlewares/error.middleware';

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
});
