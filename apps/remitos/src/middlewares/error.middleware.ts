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
  
  // Set Content-Type explicitly to avoid Express 5 charset bug
  const isClientError = statusCode >= 400 && statusCode < 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(statusCode).send(JSON.stringify({
    success: false,
    error: code,
    message: isClientError ? err.message : 'Error interno del servidor',
    timestamp: new Date().toISOString(),
  }));
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(404).send(JSON.stringify({
    success: false,
    error: 'NOT_FOUND',
    message: 'Ruta no encontrada',
    timestamp: new Date().toISOString(),
  }));
}

