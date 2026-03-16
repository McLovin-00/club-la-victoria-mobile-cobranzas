import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../config/logger';
import { getEnvironment } from '../config/environment';

export interface DocumentosError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Middleware de manejo de errores - Elegancia en la Adversidad
 */
export const errorHandler = (
  error: DocumentosError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const env = getEnvironment();
  
  // Log del error con contexto
  AppLogger.error('💥 Error en microservicio documentos:', {
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    code: error.code,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Determinar código de estado
  const statusCode = error.statusCode || 500;

  const friendlyMessages: Record<string, string> = {
    FILE_TOO_LARGE: 'El archivo es demasiado grande. Máximo 10MB permitido.',
    INVALID_FILE_TYPE: 'Tipo de archivo no permitido. Solo PDF, JPG, PNG.',
    EMPRESA_NOT_ENABLED: 'Servicio de documentos no habilitado para este dador.',
    DOCUMENT_NOT_FOUND: 'Documento no encontrado.',
    VALIDATION_FAILED: 'Error en la validación del documento.',
  };

  const isClientError = statusCode >= 400 && statusCode < 500;
  const friendlyMatch = error.code ? friendlyMessages[error.code] : undefined;
  const fallbackMessage = isClientError ? (error.message || 'Error en la solicitud') : 'Error interno del servidor';
  const clientMessage = friendlyMatch || fallbackMessage;

  const errorResponse: any = {
    success: false,
    message: clientMessage,
    code: error.code || 'INTERNAL_ERROR',
  };

  if (env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error.details;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para capturar rutas no encontradas
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  AppLogger.warn('🔍 Ruta no encontrada:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.path} no encontrada`,
    code: 'ROUTE_NOT_FOUND',
  });
};

/**
 * Crear error personalizado
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR',
  details?: any
): DocumentosError => {
  const error = new Error(message) as DocumentosError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};