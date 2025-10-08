import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
// @ts-ignore
import DailyRotateFile from 'winston-daily-rotate-file';

// Asegurar que el directorio de logs existe
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuración de niveles de logging
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colores para cada nivel
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Formato para logs en consola
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

// PII masking (emails, phones)
const maskSensitive = (text: string): string => {
  // email simple
  const maskedEmail = text.replace(/\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '$1***$2');
  // phone numbers (7-15 digits)
  const maskedPhone = maskedEmail.replace(/\b(\+?\d{2,3}[\s-]?)?(\d{3})(\d{2,6})(\d{2})\b/g, (_m, p1, g1, g2, g3) => `${p1 || ''}${g1}***${g3}`);
  return maskedPhone;
};

const piiMaskFormat = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = maskSensitive(info.message);
  } else if (info.message) {
    try { info.message = maskSensitive(JSON.stringify(info.message)); } catch {}
  }
  if (info.meta) {
    try { info.meta = JSON.parse(maskSensitive(JSON.stringify(info.meta))); } catch {}
  }
  return info;
});

// Formato para archivos con mejor codificación
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  piiMaskFormat(),
  winston.format.printf(info => {
    const message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);
    const meta = info.meta ? ` | ${JSON.stringify(info.meta)}` : '';
    return `${info.timestamp} [${info.level.toUpperCase()}]: ${message}${meta}`;
  })
);

// Configuración de transports con mejor codificación
const transports = [
  // Consola (solo para desarrollo)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  }),

  // Rotate combined
  new DailyRotateFile({
    filename: path.join(logsDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '14d',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: fileLogFormat,
  }) as any,

  // Rotate errors
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '14d',
    level: 'error',
    format: fileLogFormat,
  }) as any,
];

// Crear el logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: logLevels,
  format: fileLogFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      options: {
        flags: 'a',
        encoding: 'utf8',
      },
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      options: {
        flags: 'a',
        encoding: 'utf8',
      },
    }),
  ],
});

// Clase Logger para uso en la aplicación
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = logger;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Métodos específicos para la aplicación
  public logRequest(method: string, url: string, statusCode: number, responseTime: number): void {
    this.http(`${method} ${url} ${statusCode} - ${responseTime}ms`);
  }

  public logDatabaseOperation(operation: string, table: string, duration?: number): void {
    const message = duration
      ? `DB ${operation} on ${table} - ${duration}ms`
      : `DB ${operation} on ${table}`;
    this.debug(message);
  }

  public logAuthAttempt(email: string, success: boolean, ip?: string): void {
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `Auth attempt: ${email} - ${status}${ip ? ` from ${ip}` : ''}`;
    this.info(message);
  }

  public logError(error: Error, context?: string): void {
    const message = context ? `${context}: ${error.message}` : error.message;
    this.error(message, {
      stack: error.stack,
      name: error.name,
      context,
    });
  }
}

// Instancia singleton del logger
export const AppLogger = Logger.getInstance();

// Export por defecto
export default AppLogger;
