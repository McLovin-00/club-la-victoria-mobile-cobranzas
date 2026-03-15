/**
 * Tests unitarios para src/middlewares/error.middleware.ts
 * Cobertura de errorHandler, notFoundHandler y createError()
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';

describe('src/middlewares/error.middleware.ts', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      path: '/test/path',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
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
    notFoundHandler(mockRequest, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const sent = JSON.parse(mockResponse.send.mock.calls[0][0]);
    expect(sent.success).toBe(false);
    expect(sent.error).toBe('NOT_FOUND');
    expect(sent.message).toBe('Ruta no encontrada');
  });

  it('notFoundHandler_returnsStaticMessage', () => {
    mockRequest.method = 'POST';
    mockRequest.path = '/api/remitos';
    const { notFoundHandler } = require('../../src/middlewares/error.middleware');
    notFoundHandler(mockRequest, mockResponse);
    const sent = JSON.parse(mockResponse.send.mock.calls[0][0]);
    expect(sent.message).toBe('Ruta no encontrada');
  });

  it('U29: errorHandler_4xx_noLogStack', () => {
    const mockError = {
      message: 'Bad request',
      statusCode: 400,
      code: 'BAD_REQUEST',
      stack: 'Error stack trace',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError, mockRequest, mockResponse, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const sent = JSON.parse(mockResponse.send.mock.calls[0][0]);
    expect(sent.success).toBe(false);
    expect(sent.error).toBe('BAD_REQUEST');
    expect(sent.message).toBe('Bad request');
  });

  it('U28: errorHandler_5xx_logsError', () => {
    const mockError = {
      message: 'Internal server error',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      stack: 'Error stack trace\n    at line 1',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError, mockRequest, mockResponse, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const sent = JSON.parse(mockResponse.send.mock.calls[0][0]);
    expect(sent.message).toBe('Error interno del servidor');
  });

  it('errorHandler_missingStatusCode_uses500', () => {
    const mockError = {
      message: 'Unknown error',
      stack: 'stack',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError, mockRequest, mockResponse, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const sent = JSON.parse(mockResponse.send.mock.calls[0][0]);
    expect(sent.error).toBe('INTERNAL_ERROR');
  });

  it('errorHandler_missingCode_usesDefault', () => {
    const mockError = {
      message: 'Error without code',
      statusCode: 404,
      stack: 'stack',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError, mockRequest, mockResponse, mockNext);
    const sent = JSON.parse(mockResponse.send.mock.calls[0][0]);
    expect(sent.error).toBe('INTERNAL_ERROR');
  });

  it('errorHandler_includesTimestamp', () => {
    const mockError = {
      message: 'Test',
      statusCode: 400,
      code: 'TEST',
    };
    const { errorHandler } = require('../../src/middlewares/error.middleware');
    errorHandler(mockError, mockRequest, mockResponse, mockNext);
    const sent = JSON.parse(mockResponse.send.mock.calls[0][0]);
    expect(sent.timestamp).toBeDefined();
    expect(typeof sent.timestamp).toBe('string');
  });
});
