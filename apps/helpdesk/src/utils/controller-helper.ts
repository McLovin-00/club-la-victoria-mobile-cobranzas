/**
 * Controller Error Handler Helper
 * Centralizes error handling patterns in controllers
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppLogger } from '../config/logger';

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface SuccessResponse<T> {
  success: true;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Common HTTP status codes
 */
export const HttpStatus = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;

/**
 * Sends an unauthorized response
 */
export function sendUnauthorized(res: Response, message = 'Usuario no autenticado'): void {
  res.status(HttpStatus.UNAUTHORIZED).json({
    success: false,
    message,
  } as ErrorResponse);
}

/**
 * Sends a bad request response (validation errors)
 */
export function sendBadRequest(
  res: Response,
  message: string,
  errors?: Record<string, string[]>
): void {
  res.status(HttpStatus.BAD_REQUEST).json({
    success: false,
    message,
    errors,
  } as ErrorResponse);
}

/**
 * Sends a not found response
 */
export function sendNotFound(res: Response, message: string = 'Recurso no encontrado'): void {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message,
  } as ErrorResponse);
}

/**
 * Sends a forbidden response
 */
export function sendForbidden(res: Response, message: string): void {
  res.status(HttpStatus.FORBIDDEN).json({
    success: false,
    message,
  } as ErrorResponse);
}

/**
 * Sends an internal error response
 */
export function sendInternalError(res: Response, message: string, error?: unknown): void {
  AppLogger.error(message, error);
  res.status(HttpStatus.INTERNAL_ERROR).json({
    success: false,
    message,
  } as ErrorResponse);
}

/**
 * Sends a success response with data
 */
export function sendSuccess<T>(res: Response, data: T, message?: string): void {
  res.json({
    success: true,
    message,
    data,
  } as SuccessResponse<T>);
}

/**
 * Sends a success response with pagination
 */
export function sendSuccessWithPagination<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number; totalPages: number }
): void {
  res.json({
    success: true,
    data,
    pagination,
  } as SuccessResponse<T>);
}

/**
 * Checks if user is authenticated, */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: () => void): void {
  if (!req.user) {
    sendUnauthorized(res);
    return;
  }
  next();
}

/**
 * Wrapper for controller actions with consistent error handling
 */
export function withErrorHandling(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<void>
) {
  return async (req: AuthenticatedRequest, res: Response) => {
    try {
    await handler(req, res);
  } catch (error) {
    sendInternalError(res, 'Error interno del servidor', error);
  }
};
}

export const controllerHelper = {
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
};

export default controllerHelper;
