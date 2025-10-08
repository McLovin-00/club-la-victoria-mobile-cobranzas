import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../config/logger';

/**
 * Middleware para validar el tamaño del payload antes de procesarlo
 */
export const validatePayloadSize = (maxSizeMB: number = 45) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Obtener el tamaño del contenido desde el header Content-Length
      const contentLength = req.get('Content-Length');
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (contentLength) {
        const sizeBytes = parseInt(contentLength, 10);

        if (sizeBytes > maxSizeBytes) {
          AppLogger.warn('Payload demasiado grande detectado en middleware', {
            contentLength: sizeBytes,
            maxSize: maxSizeBytes,
            sizeMB: Math.round(sizeBytes / (1024 * 1024)),
            maxSizeMB,
            url: req.url,
            method: req.method,
          });

          return res.status(413).json({
            success: false,
            error: `El tamaño del contenido (${Math.round(sizeBytes / (1024 * 1024))}MB) excede el límite permitido (${maxSizeMB}MB)`,
            details: {
              currentSize: `${Math.round(sizeBytes / (1024 * 1024))}MB`,
              maxSize: `${maxSizeMB}MB`,
              suggestion: 'Divida los datos en lotes más pequeños',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      next();
    } catch (error) {
      AppLogger.error('Error en middleware de validación de payload', { error });
      next(); // Continuar en caso de error para no bloquear
    }
  };
};

/**
 * Middleware específico para importación de perfiles
 */
export const validateProfileBatchSize = validatePayloadSize(30); // 30MB específico para perfiles

/**
 * Middleware para validar el número de elementos en un array
 */
export const validateBatchCount = (maxItems: number = 100) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (Array.isArray(req.body) && req.body.length > maxItems) {
        AppLogger.warn('Batch demasiado grande detectado', {
          itemCount: req.body.length,
          maxItems,
          url: req.url,
          method: req.method,
        });

        return res.status(400).json({
          success: false,
          error: `El lote contiene ${req.body.length} elementos, pero el máximo permitido es ${maxItems}`,
          details: {
            currentCount: req.body.length,
            maxCount: maxItems,
            suggestion: 'Divida la importación en lotes más pequeños',
          },
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      AppLogger.error('Error en middleware de validación de batch count', { error });
      next(); // Continuar en caso de error para no bloquear
    }
  };
};

/**
 * Middleware específico para validar importación de perfiles
 */
export const validateProfileBatch = [
  validateProfileBatchSize,
  validateBatchCount(1000), // Máximo 1000 perfiles por lote
];
