/**
 * Tests extendidos para error.middleware.ts - cubrir todas las ramas
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('error.middleware extended', () => {
  let createError: any;
  let errorHandler: any;
  let notFoundHandler: any;
  let mockRes: any;
  let jsonMock: jest.Mock<any>;
  let statusMock: jest.Mock<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../src/middlewares/error.middleware');
    createError = module.createError;
    errorHandler = module.errorHandler;
    notFoundHandler = module.notFoundHandler;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    const sendMock = jest.fn().mockReturnThis();
    const setHeaderMock = jest.fn().mockReturnThis();
    mockRes = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
      setHeader: setHeaderMock,
    };
  });

  describe('createError', () => {
    it('crea error con mensaje', () => {
      const err = createError('Test error');
      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
    });

    it('crea error con statusCode personalizado', () => {
      const err = createError('Not found', 404);
      expect(err.statusCode).toBe(404);
    });

    it('crea error con code personalizado', () => {
      const err = createError('Validation error', 400, 'VALIDATION_ERROR');
      expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('crea error 401 unauthorized', () => {
      const err = createError('No autorizado', 401, 'UNAUTHORIZED');
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('crea error 403 forbidden', () => {
      const err = createError('Acceso denegado', 403, 'FORBIDDEN');
      expect(err.statusCode).toBe(403);
    });
  });

  describe('errorHandler', () => {
    it('maneja error 500 y loggea', async () => {
      const { AppLogger } = await import('../../src/config/logger');
      const err = createError('Server error', 500);
      const mockReq = {} as Request;
      const mockNext = jest.fn() as unknown as NextFunction;

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(false);
      expect(sent.error).toBe('INTERNAL_ERROR');
      expect(sent.message).toBe('Error interno del servidor');
      expect(AppLogger.error).toHaveBeenCalled();
    });

    it('maneja error 400 sin loggear como error crítico', async () => {
      const { AppLogger } = await import('../../src/config/logger');
      const err = createError('Bad request', 400, 'BAD_REQUEST');
      const mockReq = {} as Request;
      const mockNext = jest.fn() as unknown as NextFunction;

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.message).toBe('Bad request');
      expect(AppLogger.error).not.toHaveBeenCalled();
    });

    it('usa valores por defecto si no hay statusCode ni code', () => {
      const err = new Error('Simple error') as any;
      const mockReq = {} as Request;
      const mockNext = jest.fn() as unknown as NextFunction;

      errorHandler(err, mockReq, mockRes, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.error).toBe('INTERNAL_ERROR');
    });

    it('incluye timestamp en la respuesta', () => {
      const err = createError('Error');
      const mockReq = {} as Request;
      const mockNext = jest.fn() as unknown as NextFunction;

      errorHandler(err, mockReq, mockRes, mockNext);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.timestamp).toBeDefined();
      expect(typeof sent.timestamp).toBe('string');
    });
  });

  describe('notFoundHandler', () => {
    it('retorna 404 con mensaje de ruta no encontrada', () => {
      const mockReq = {
        method: 'GET',
        path: '/api/unknown',
      } as Request;

      notFoundHandler(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(404);
      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.success).toBe(false);
      expect(sent.error).toBe('NOT_FOUND');
      expect(sent.message).toBe('Ruta no encontrada');
    });

    it('retorna mensaje estático sin importar el método HTTP', () => {
      const mockReq = {
        method: 'POST',
        path: '/api/test',
      } as Request;

      notFoundHandler(mockReq, mockRes);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.message).toBe('Ruta no encontrada');
    });

    it('incluye timestamp', () => {
      const mockReq = { method: 'GET', path: '/' } as Request;

      notFoundHandler(mockReq, mockRes);

      const sent = JSON.parse(mockRes.send.mock.calls[0][0]);
      expect(sent.timestamp).toBeDefined();
      expect(typeof sent.timestamp).toBe('string');
    });
  });
});

