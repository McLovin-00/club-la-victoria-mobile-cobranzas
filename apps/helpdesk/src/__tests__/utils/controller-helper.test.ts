/**
 * Unit Tests for Controller Helper Utility
 */

import { Response } from 'express';
import {
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
  sendForbidden,
  sendInternalError,
  sendSuccess,
  sendSuccessWithPagination,
  requireAuth,
  withErrorHandling,
  HttpStatus,
} from '../../utils/controller-helper';
import { AppLogger } from '../../config/logger';

// Mock logger
jest.mock('../../config/logger', () => ({
  AppLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Controller Helper', () => {
  let mockRes: any;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
    jest.clearAllMocks();
  });

  describe('HttpStatus constants', () => {
    test('should have correct status codes', () => {
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.UNAUTHORIZED).toBe(401);
      expect(HttpStatus.FORBIDDEN).toBe(403);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.INTERNAL_ERROR).toBe(500);
    });
  });

  describe('sendUnauthorized', () => {
    test('should send 401 with default message', () => {
      sendUnauthorized(mockRes, 'Usuario no autenticado');
      
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no autenticado',
      });
    });

    test('should send 401 with custom message', () => {
      sendUnauthorized(mockRes, 'Token expirado');
      
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Token expirado',
      });
    });
  });

  describe('sendBadRequest', () => {
    test('should send 400 with message only', () => {
      sendBadRequest(mockRes, 'Datos inválidos');
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Datos inválidos',
      });
    });

    test('should send 400 with message and errors', () => {
      const errors = { email: ['Email inválido'], name: ['Requerido'] };
      sendBadRequest(mockRes, 'Errores de validación', errors);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Errores de validación',
        errors,
      });
    });
  });

  describe('sendNotFound', () => {
    test('should send 404 with default message', () => {
      sendNotFound(mockRes);
      
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Recurso no encontrado',
      });
    });

    test('should send 404 with custom message', () => {
      sendNotFound(mockRes, 'Ticket no encontrado');
      
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Ticket no encontrado',
      });
    });
  });

  describe('sendForbidden', () => {
    test('should send 403 with message', () => {
      sendForbidden(mockRes, 'No tienes permisos');
      
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'No tienes permisos',
      });
    });
  });

  describe('sendInternalError', () => {
    test('should send 500 with message and log error', () => {
      const error = new Error('Database connection failed');
      sendInternalError(mockRes, 'Error interno', error);
      
      expect(AppLogger.error).toHaveBeenCalledWith('Error interno', error);
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno',
      });
    });

    test('should send 500 without error object', () => {
      sendInternalError(mockRes, 'Error desconocido');
      
      expect(AppLogger.error).toHaveBeenCalledWith('Error desconocido', undefined);
      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('sendSuccess', () => {
    test('should send success with data only', () => {
      const data = { id: 1, name: 'Test' };
      sendSuccess(mockRes, data);
      
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: undefined,
        data,
      });
    });

    test('should send success with data and message', () => {
      const data = { id: 1, name: 'Test' };
      sendSuccess(mockRes, data, 'Creado exitosamente');
      
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Creado exitosamente',
        data,
      });
    });
  });

  describe('sendSuccessWithPagination', () => {
    test('should send success with data and pagination', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 25, totalPages: 3 };
      sendSuccessWithPagination(mockRes, data, pagination);
      
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data,
        pagination,
      });
    });
  });

  describe('requireAuth', () => {
    test('should call next if user is authenticated', () => {
      const mockNext = jest.fn();
      const mockReq = { user: { id: '1', email: 'test@test.com' } } as any;
      
      requireAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should send unauthorized if user is not authenticated', () => {
      const mockNext = jest.fn();
      const mockReq = { user: null } as any;
      
      requireAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('withErrorHandling', () => {
    test('should execute handler successfully', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      const wrapped = withErrorHandling(handler);
      const mockReq = {} as any;
      
      await wrapped(mockReq, mockRes);
      
      expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
    });

    test('should catch errors and send internal error response', async () => {
      const error = new Error('Handler failed');
      const handler = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(handler);
      const mockReq = {} as any;
      
      await wrapped(mockReq, mockRes);
      
      expect(AppLogger.error).toHaveBeenCalledWith(
        'Error interno del servidor',
        error
      );
      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });
});
