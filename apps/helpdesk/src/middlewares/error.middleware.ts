import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../config/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Error handler centralizado
 */
export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  const code = err.code || 'INTERNAL_ERROR';

  // Log del error
  if (statusCode >= 500) {
    AppLogger.error('Error del servidor:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details,
    });
  } else {
    AppLogger.warn('Error de cliente:', {
      message: err.message,
      code: err.code,
      statusCode,
    });
  }

  // Respuesta al cliente
  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details,
    }),
  });
};

/**
 * Handler para rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  AppLogger.debug(`Ruta no encontrada: ${req.method} ${req.path}`);
  
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
  });
};

/**
 * Helper para crear errores HTTP
 */
export const createError = (
  statusCode: number,
  message: string,
  code?: string,
  details?: unknown
): ApiError => {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Validación de ownership de recurso
 */
export const createOwnershipError = (resourceType: string): ApiError => {
  return createError(403, `No tienes permiso para acceder a este ${resourceType}`, 'FORBIDDEN');
};
