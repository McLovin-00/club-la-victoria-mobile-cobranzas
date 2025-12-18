import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function createError(message: string, statusCode = 500, code = 'INTERNAL_ERROR'): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  
  if (statusCode >= 500) {
    AppLogger.error(`💥 ${err.message}`, { stack: err.stack });
  }
  
  res.status(statusCode).json({
    success: false,
    error: code,
    message: err.message,
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
}

