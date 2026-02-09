/**
 * Tests unitarios para src/middlewares/error.middleware.ts
 * Cobertura de errorHandler, notFoundHandler y createError()
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';

describe('src/middlewares/error.middleware.ts', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
    } as any; // Usamos 'as any' para evitar error de propiedad readonly de path
    (mockRequest as any).path = '/test/path';
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('U31: createError_customStatus', () => {
    const { createError } = require('../../src/middlewares/error.middleware');
    const error = createError('Test error', 400, 'BAD_REQUEST');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('createError_defaultValues', () => {
    const { createError } = require('../../src/middlewares/error.middleware');
    const error = createError('Default error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('U30: notFoundHandler_returns404', () => {
    const { notFoundHandler } = require('../../src/middlewares/error.middleware');
    notFoundHandler(mockRequest as Request, mockResponse as Response);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'NOT_FOUND',
        message: expect.stringContaining('/test/path'),
      })
    );
  });

  it('notFoundHandler_includesMethodAndPath', () => {
    mockRequest.method = 'POST';
    mockRequest.path = '/api/remitos';
    const { notFoundHandler } = require('../../src/middlewares/error.middleware');
    notFoundHandler(mockRequest as Request, mockResponse as Response);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Ruta no encontrada: POST /api/remitos',
      })
    );
  });

  it('U29: errorHandler_4xx_noLogStack', () => {
    const mockError = {
      message: 'Bad request',
      statusCode: 400,
      code: 'BAD_REQUEST',
      stack: 'Error stack trace',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError as any, mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Bad request',
      })
    );
  });

  it('U28: errorHandler_5xx_logsError', () => {
    const mockError = {
      message: 'Internal server error',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      stack: 'Error stack trace\n    at line 1',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError as any, mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('errorHandler_missingStatusCode_uses500', () => {
    const mockError = {
      message: 'Unknown error',
      stack: 'stack',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError as any, mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'INTERNAL_ERROR',
      })
    );
  });

  it('errorHandler_missingCode_usesDefault', () => {
    const mockError = {
      message: 'Error without code',
      statusCode: 404,
      stack: 'stack',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError as any, mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'INTERNAL_ERROR',
      })
    );
  });

  it('errorHandler_includesTimestamp', () => {
    const mockError = {
      message: 'Test',
      statusCode: 400,
      code: 'TEST',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError as any, mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
  });
});
