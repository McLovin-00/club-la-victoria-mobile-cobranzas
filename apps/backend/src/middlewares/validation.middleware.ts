import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { validationResult } from 'express-validator';
import { AppLogger } from '../config/logger';

/**
 * Interfaz para errores de validación estructurados
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
  received?: any;
}

/** Helper para validar un schema y recolectar errores */
function validatePart<T>(schema: ZodSchema<T> | undefined, value: any, prefix: string): { validated: T | null; errors: ValidationError[] } {
  if (!schema) return { validated: null, errors: [] };
  try {
    const validated = schema.parse(value);
    return { validated, errors: [] };
  } catch (error) {
    if (error instanceof ZodError) {
      const formatted = error.errors.map(err => ({
        field: `${prefix}.${err.path.join('.')}`,
        message: err.message,
        code: err.code,
        received: 'received' in err ? (err as any).received : undefined,
      }));
      return { validated: null, errors: formatted };
    }
    return { validated: null, errors: [] };
  }
}

/**
 * Clase para manejo profesional de errores de validación
 */
export class ValidationErrorHandler {
  /**
   * Formatea errores de Zod a formato estructurado
   */
  static formatZodErrors(error: ZodError): ValidationError[] {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: 'received' in err ? (err as any).received : undefined,
    }));
  }

  /**
   * Crea respuesta de error de validación
   */
  static createErrorResponse(errors: ValidationError[]) {
    return {
      success: false,
      error: 'Validation Error',
      message: 'Los datos proporcionados no son válidos',
      details: errors,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Middleware factory para validación de diferentes partes de la request
 */
export class ValidationMiddleware {
  /**
   * Valida el body de la request
   */
  static validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.body);
        req.body = validatedData;
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, req, res, 'body');
      }
    };
  }

  /**
   * Valida los parámetros de la URL
   */
  static validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.params);
        // Asignamos los datos validados sin forzar tipos
        Object.assign(req.params, validatedData);
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, req, res, 'params');
      }
    };
  }

  /**
   * Valida los query parameters
   */
  static validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.query);
        // Asignamos los datos validados sin forzar tipos
        Object.assign(req.query, validatedData);
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, req, res, 'query');
      }
    };
  }

  /**
   * Valida múltiples partes de la request
   */
  static validateRequest<TBody, TParams, TQuery>(options: {
    body?: ZodSchema<TBody>;
    params?: ZodSchema<TParams>;
    query?: ZodSchema<TQuery>;
  }) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const errors: ValidationError[] = [];

        // Validar body, params, query
        const bodyResult = validatePart(options.body, req.body, 'body');
        if (bodyResult.validated !== null) req.body = bodyResult.validated;
        errors.push(...bodyResult.errors);

        const paramsResult = validatePart(options.params, req.params, 'params');
        if (paramsResult.validated !== null) Object.assign(req.params, paramsResult.validated);
        errors.push(...paramsResult.errors);

        const queryResult = validatePart(options.query, req.query, 'query');
        if (queryResult.validated !== null) Object.assign(req.query, queryResult.validated);
        errors.push(...queryResult.errors);

        if (errors.length > 0) {
          AppLogger.warn(`Validation failed for ${req.method} ${req.originalUrl}`, {
            ip: req.ip || req.socket?.remoteAddress || 'unknown',
            errors, body: req.body, params: req.params, query: req.query,
          });
          res.status(400).json(ValidationErrorHandler.createErrorResponse(errors));
          return;
        }
        next();
      } catch (error) {
        ValidationMiddleware.handleUnexpectedError(error, req, res);
      }
    };
  }

  /**
   * Maneja errores de validación individuales
   */
  public static handleValidationError(
    error: unknown,
    req: Request,
    res: Response,
    source: 'body' | 'params' | 'query'
  ): void {
    if (error instanceof ZodError) {
      const validationErrors = ValidationErrorHandler.formatZodErrors(error);
      const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

      // Obtener datos del source para logging
      const sourceData: Record<string, any> = { body: req.body, params: req.params, query: req.query };

      AppLogger.warn(`Validation failed in ${source} for ${req.method} ${req.originalUrl}`, {
        ip: clientIp,
        errors: validationErrors,
        [source]: sourceData[source],
      });

      res.status(400).json(ValidationErrorHandler.createErrorResponse(validationErrors));
    } else {
      ValidationMiddleware.handleUnexpectedError(error, req, res);
    }
  }

  /**
   * Maneja errores inesperados durante la validación
   */
  private static handleUnexpectedError(error: unknown, req: Request, res: Response): void {
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    AppLogger.error(`Unexpected validation error for ${req.method} ${req.originalUrl}`, {
      ip: clientIp,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Error interno del servidor durante la validación',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Middlewares específicos pre-configurados para casos comunes
 */
export class CommonValidationMiddlewares {
  /**
   * Middleware para validar IDs numéricos en parámetros
   * @param paramName - El nombre del parámetro en req.params (por defecto 'id')
   */
  static validateNumericId(paramName: string = 'id') {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const id = req.params[paramName];
        if (!id || !/^\d+$/.test(id)) {
          throw new Error(`El parámetro '${paramName}' debe ser un número válido`);
        }

        const numericId = parseInt(id, 10);
        if (numericId <= 0) {
          throw new Error(`El parámetro '${paramName}' debe ser un número positivo`);
        }

        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, req, res, 'params');
      }
    };
  }

  /**
   * Middleware para validar paginación en query parameters
   */
  static validatePagination() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Validar page
        const pageStr = req.query.page as string;
        const page = pageStr ? parseInt(pageStr, 10) : 1;
        if (isNaN(page) || page < 1) {
          throw new Error('La página debe ser un número positivo');
        }

        // Validar limit
        const limitStr = req.query.limit as string;
        const limit = limitStr ? parseInt(limitStr, 10) : 10;
        if (isNaN(limit) || limit < 1 || limit > 100) {
          throw new Error('El límite debe estar entre 1 y 100');
        }

        // Validar search (opcional)
        const search = req.query.search as string;
        if (search && search.trim().length === 0) {
          throw new Error('El término de búsqueda no puede estar vacío');
        }

        // Asignar valores procesados
        req.query.page = page.toString();
        req.query.limit = limit.toString();
        if (search) req.query.search = search.trim();

        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, req, res, 'query');
      }
    };
  }

  /**
   * Middleware para sanitizar strings en general
   */
  static sanitizeStrings() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Sanitizar body
      if (req.body && typeof req.body === 'object') {
        req.body = CommonValidationMiddlewares.sanitizeObject(req.body);
      }

      // Sanitizar query
      if (req.query && typeof req.query === 'object') {
        req.query = CommonValidationMiddlewares.sanitizeObject(req.query);
      }

      next();
    };
  }

  /**
   * Función auxiliar para sanitizar objetos recursivamente
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj.trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => CommonValidationMiddlewares.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = CommonValidationMiddlewares.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

/**
 * Middleware para manejar errores de express-validator
 * Extrae errores de validación y responde con formato estándar
 */
export function handleExpressValidatorErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array(),
    });
    return;
  }
  next();
}

// Exports por defecto y named
export default ValidationMiddleware;
