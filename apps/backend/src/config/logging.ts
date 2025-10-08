import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Determinar si estamos en producción
const isProduction = process.env.NODE_ENV === 'production';

// Directorio para logs
const logDir = path.join(__dirname, '../../logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Rutas de archivos de log
const appLogPath = path.join(logDir, 'app.log');
const errorLogPath = path.join(logDir, 'error.log');
const accessLogPath = path.join(logDir, 'access.log');

/**
 * Sanitiza un objeto para eliminar información sensible
 */
const sanitizeObject = (obj: any): any => {
  if (!obj) return obj;

  // Si es un string, verificar si contiene información sensible
  if (typeof obj === 'string') {
    // Verificar si parece un token JWT (patrón simple)
    if (/^Bearer\s+[\w-]+\.[\w-]+\.[\w-]+$/i.test(obj)) {
      return 'Bearer [REDACTED]';
    }
    return obj;
  }

  // Si es un array, sanitizar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Si es un objeto, sanitizar recursivamente
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Lista de claves que pueden contener información sensible
      const sensitiveKeys = [
        'password',
        'token',
        'secret',
        'jwt',
        'authorization',
        'auth',
        'key',
        'credential',
        'apiKey',
      ];

      // Si la clave es sensible, redactar el valor
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }

    return sanitized;
  }

  return obj;
};

/**
 * Guarda un mensaje en el archivo de log
 */
const writeToLog = (filePath: string, message: string): void => {
  fs.appendFileSync(filePath, `${message}\n`);
};

/**
 * Formatea un mensaje de log con la fecha actual
 */
const formatLogMessage = (level: string, message: string, meta?: any): string => {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] ${level} - ${message}`;

  if (meta) {
    let metaString = '';
    try {
      // En producción, sanitizar la información sensible
      const sanitizedMeta = isProduction ? sanitizeObject(meta) : meta;
      metaString = JSON.stringify(sanitizedMeta);
    } catch (_err) {
      metaString = '[Error al serializar los metadatos]';
    }

    formattedMessage += `\n${metaString}`;
  }

  return formattedMessage;
};

/**
 * Módulo de logging
 */
export const Logger = {
  info: (message: string, meta?: any): void => {
    const formattedMessage = formatLogMessage('INFO', message, meta);
    console.log(formattedMessage);
    writeToLog(appLogPath, formattedMessage);
  },

  warn: (message: string, meta?: any): void => {
    const formattedMessage = formatLogMessage('WARN', message, meta);
    console.warn(formattedMessage);
    writeToLog(appLogPath, formattedMessage);
  },

  error: (message: string, error?: any): void => {
    let errorMeta = error;

    // Si es un objeto Error, extraer detalles
    if (error instanceof Error) {
      errorMeta = {
        message: error.message,
        stack: isProduction ? '[OMITIDO EN PRODUCCIÓN]' : error.stack,
        ...(error as any),
      };
    }

    const formattedMessage = formatLogMessage('ERROR', message, errorMeta);
    console.error(formattedMessage);
    writeToLog(errorLogPath, formattedMessage);
    writeToLog(appLogPath, formattedMessage);
  },

  debug: (message: string, meta?: any): void => {
    // En producción, no mostrar logs de depuración
    if (isProduction) return;

    const formattedMessage = formatLogMessage('DEBUG', message, meta);
    console.debug(formattedMessage);
    writeToLog(appLogPath, formattedMessage);
  },

  // Log de acceso específico para peticiones HTTP
  access: (req: any, res: any, responseTime?: number): void => {
    const { method, originalUrl, ip, headers = {} } = req;

    // Extraer solo la información relevante
    const logData: Record<string, any> = {
      method,
      url: originalUrl,
      ip,
      status: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      userAgent: headers['user-agent'],
      // En producción omitimos información sensible
      ...(isProduction
        ? {}
        : {
            query: req.query,
            params: req.params,
            // Nunca logear el body completo
            bodyKeys: req.body ? Object.keys(req.body) : [],
          }),
    };

    // Sanitizar el token de autorización
    if (headers.authorization) {
      logData.authorization = 'Bearer [REDACTED]';
    }

    const formattedMessage = formatLogMessage(
      'ACCESS',
      `${method} ${originalUrl} ${res.statusCode}`,
      logData
    );
    writeToLog(accessLogPath, formattedMessage);

    // En desarrollo, también mostrar en consola
    if (!isProduction) {
      console.log(formattedMessage);
    }
  },
};

// Middleware para registrar todas las peticiones HTTP
export const requestLogger = (req: any, res: any, next: any): void => {
  const start = Date.now();

  // Cuando la respuesta termina, registrar el acceso
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    Logger.access(req, res, responseTime);
  });

  next();
};

export default Logger;
