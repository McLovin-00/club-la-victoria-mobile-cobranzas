/**
 * Coverage tests for error utilities
 * These tests import real code to generate coverage
 */

import {
  createError,
  formatError,
} from '../index';

describe('Error Utilities Coverage', () => {
  describe('createError', () => {
    it('should create error with message', () => {
      const error = createError('Test error');
      expect(error.message).toBe('Test error');
    });

    it('should create error with code', () => {
      const error = createError('Test error', 'TEST_ERROR');
      expect((error as any).code).toBe('TEST_ERROR');
    });

    it('should create error with details', () => {
      const error = createError('Test error', 'TEST_ERROR', { field: 'email' });
      expect((error as any).details).toEqual({ field: 'email' });
    });

    it('should create error without optional params', () => {
      const error = createError('Simple error');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('formatError', () => {
    it('should format Error object', () => {
      const error = new Error('Test error');
      const formatted = formatError(error);
      expect(formatted.message).toBe('Test error');
    });

    it('should format string error', () => {
      const formatted = formatError('String error');
      expect(formatted.message).toBe('String error');
    });

    it('should format object error', () => {
      const formatted = formatError({ message: 'Object error', code: 'TEST' });
      expect(formatted.message).toBe('Object error');
    });

    it('should handle null', () => {
      const formatted = formatError(null);
      expect(formatted.message).toBeDefined();
    });

    it('should handle undefined', () => {
      const formatted = formatError(undefined);
      expect(formatted.message).toBeDefined();
    });

    it('should preserve error code', () => {
      const error = createError('Test', 'MY_CODE');
      const formatted = formatError(error);
      expect(formatted.code).toBe('MY_CODE');
    });

    it('should preserve error details', () => {
      const error = createError('Test', 'CODE', { field: 'test' });
      const formatted = formatError(error);
      expect(formatted.details).toBeDefined();
    });
  });
});



