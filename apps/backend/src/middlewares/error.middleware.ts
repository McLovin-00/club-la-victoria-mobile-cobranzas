import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../config/logger';
import { ZodError } from 'zod';

/**
 * Interface para errores personalizados
 */
export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Respuesta estándar de error
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

/**
 * Middleware global de manejo de errores
 * Debe ser el último middleware en la aplicación
 */
export class ErrorMiddleware {
  /**
   * Middleware principal de manejo de errores
   */
  public static handle(
    error: Error | CustomError | ZodError,
    req: Request,
    res: Response,
    _next: NextFunction
  ): void {
    // Generar ID único para la request
    const requestId = ErrorMiddleware.generateRequestId();

    // Log del error con contexto completo
    ErrorMiddleware.logError(error, req, requestId);

    // Determinar el tipo de error y responder apropiadamente
    if (error instanceof ZodError) {
      ErrorMiddleware.handleValidationError(error, res, requestId);
      return;
    }

    if (ErrorMiddleware.isCustomError(error)) {
      ErrorMiddleware.handleCustomError(error, res, requestId);
      return;
    }

    if (ErrorMiddleware.isDatabaseError(error)) {
      ErrorMiddleware.handleDatabaseError(error, res, requestId);
      return;
    }

    if (ErrorMiddleware.isJWTError(error)) {
      ErrorMiddleware.handleJWTError(error, res, requestId);
      return;
    }

    // Error genérico del servidor
    ErrorMiddleware.handleGenericError(error, res, requestId);
  }

  /**
   * Middleware para capturar errores asíncronos no manejados
   */
  public static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Middleware para manejar rutas no encontradas
   */
  public static notFound(req: Request, res: Response, _next: NextFunction): void {
    const error: CustomError = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    error.code = 'ROUTE_NOT_FOUND';
    _next(error);
  }

  // Métodos privados de manejo específico de errores

  /**
   * Maneja errores de validación de Zod
   */
  private static handleValidationError(error: ZodError, res: Response, requestId: string): void {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: (err as any).received,
    }));

    const response: ErrorResponse = {
      success: false,
      error: 'Validation Error',
      message: 'Los datos proporcionados no son válidos',
      details: validationErrors,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(400).json(response);
  }

  /**
   * Maneja errores personalizados
   */
  private static handleCustomError(error: CustomError, res: Response, requestId: string): void {
    const statusCode = error.statusCode || 500;

    const response: ErrorResponse = {
      success: false,
      error: error.code || 'Custom Error',
      message: error.message || 'Error personalizado',
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(statusCode).json(response);
  }

  /**
   * Maneja errores de base de datos
   */
  private static handleDatabaseError(error: Error, res: Response, requestId: string): void {
    let message = 'Error de base de datos';
    let statusCode = 500;

    // Errores específicos de PostgreSQL/Prisma
    if (error.message.includes('Unique constraint')) {
      message = 'El registro ya existe';
      statusCode = 409;
    } else if (error.message.includes('Foreign key constraint')) {
      message = 'Referencia inválida';
      statusCode = 400;
    } else if (error.message.includes('Record to update not found')) {
      message = 'Registro no encontrado';
      statusCode = 404;
    }

    const response: ErrorResponse = {
      success: false,
      error: 'Database Error',
      message,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(statusCode).json(response);
  }

  /**
   * Maneja errores de JWT
   */
  private static handleJWTError(error: Error, res: Response, requestId: string): void {
    let message = 'Error de autenticación';

    if (error.message.includes('jwt expired')) {
      message = 'Token expirado';
    } else if (error.message.includes('jwt malformed')) {
      message = 'Token malformado';
    } else if (error.message.includes('invalid signature')) {
      message = 'Token inválido';
    }

    const response: ErrorResponse = {
      success: false,
      error: 'Authentication Error',
      message,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(401).json(response);
  }

  /**
   * Maneja errores genéricos
   */
  private static handleGenericError(error: Error, res: Response, requestId: string): void {
    const response: ErrorResponse = {
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : error.message,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(500).json(response);
  }

  // Métodos auxiliares

  /**
   * Determina si es un error personalizado
   */
  private static isCustomError(error: any): error is CustomError {
    return error.statusCode !== undefined || error.code !== undefined;
  }

  /**
   * Determina si es un error de base de datos
   */
  private static isDatabaseError(error: Error): boolean {
    const dbErrorPatterns = [
      'PrismaClientKnownRequestError',
      'PrismaClientUnknownRequestError',
      'PrismaClientValidationError',
    ];

    return dbErrorPatterns.some(
      pattern =>
        error.constructor.name.includes(pattern) || error.message.includes(pattern.toLowerCase())
    );
  }

  /**
   * Determina si es un error de JWT
   */
  private static isJWTError(error: Error): boolean {
    const jwtErrors = ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'];
    return jwtErrors.includes(error.constructor.name) || error.message.includes('jwt');
  }

  /**
   * Registra el error con contexto completo
   */
  private static logError(error: Error, req: Request, requestId: string): void {
    const errorContext = {
      requestId,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      userEmail: (req as any).user?.email,
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query,
      params: req.params,
      errorName: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };

    if (ErrorMiddleware.isCustomError(error) && error.statusCode && error.statusCode < 500) {
      AppLogger.warn('Error del cliente', errorContext);
    } else {
      AppLogger.error('Error del servidor', errorContext);
    }
  }

  /**
   * Genera un ID único para la request
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Función helper para crear errores personalizados
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): CustomError => {
  const error: CustomError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Funciones helper para errores comunes
 */
export const NotFoundError = (resource: string = 'Recurso'): CustomError =>
  createError(`${resource} no encontrado`, 404, 'NOT_FOUND');

export const UnauthorizedError = (message: string = 'No autorizado'): CustomError =>
  createError(message, 401, 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Acceso denegado'): CustomError =>
  createError(message, 403, 'FORBIDDEN');

export const ConflictError = (message: string): CustomError =>
  createError(message, 409, 'CONFLICT');

export const BadRequestError = (message: string): CustomError =>
  createError(message, 400, 'BAD_REQUEST');

// Exports
export default ErrorMiddleware;
