import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
  }
}

/**
 * Middleware de contexto por request:
 * - Genera/propaga X-Request-ID
 * - Expone `req.requestId`
 * - Añade cabecera de respuesta para correlación
 */
export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.header('x-request-id') || req.header('X-Request-ID');
  const requestId = incomingId && String(incomingId).trim().length > 0 ? String(incomingId) : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};


