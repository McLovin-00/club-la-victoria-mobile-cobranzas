import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../config/logger';

// Interface para extender Request con timing
interface TimedRequest extends Request {
  startTime?: number;
}

// Middleware para logging de requests HTTP
export const httpLogger = (req: TimedRequest, res: Response, next: NextFunction): void => {
  // Marcar el tiempo de inicio
  req.startTime = Date.now();

  // Obtener IP del cliente
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

  // Log del inicio de la request
  AppLogger.debug(`Incoming ${req.method} ${req.originalUrl} from ${clientIp}`);

  // Hook para el final de la response
  const originalSend = res.send;
  res.send = function (data: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());

    // Log de la respuesta completa
    AppLogger.logRequest(req.method, req.originalUrl, res.statusCode, responseTime);

    // Log adicional para errores
    if (res.statusCode >= 400) {
      AppLogger.warn(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, {
        ip: clientIp,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
        params: req.params,
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

// Middleware para logging de errores
export const errorLogger = (error: any, req: Request, res: Response, next: NextFunction): void => {
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

  AppLogger.error(`HTTP Error - ${req.method} ${req.originalUrl}: ${error.message}`, {
    ip: clientIp,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params,
    stack: error.stack,
  });

  next(error);
};
