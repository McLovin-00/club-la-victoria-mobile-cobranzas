import winston, { transport } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, align } = winston.format;

const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  debug: 5,
  trace: 6,
};

const colors = {
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'cyan',
};

winston.addColors(colors);

// Enmascarado básico de PII (emails y teléfonos estilo internacional)
const mask = (msg: string): string => {
  if (!msg) return msg;
  // Emails: a***@d****.tld
  msg = msg.replace(/([a-zA-Z0-9_.-]+)@([a-zA-Z0-9_.-]+)\.(\w+)/g, (_m, u, d, t) => `${String(u).slice(0,1)}***@${String(d).slice(0,1)}****.${t}`);
  // Telefónos: +5411*******
  msg = msg.replace(/\+?[1-9]\d{7,14}/g, (m: string) => `${m.slice(0,4)}${'*'.repeat(Math.max(0, m.length-4))}`);
  return msg;
};

const maskFormat = winston.format((info) => {
  if (typeof info.message === 'string') info.message = mask(info.message);
  // Enmascarar también strings en meta
  for (const key of Object.keys(info)) {
    const val = (info as any)[key];
    if (typeof val === 'string') (info as any)[key] = mask(val);
  }
  return info;
});

const logFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  maskFormat(),
  align(),
  printf((info) => {
    const { timestamp, level, message, ...meta } = info as any;
    
    // Función para serializar meta de forma segura, evitando referencias circulares
    const safeStringify = (obj: any): string => {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    };
    
    const metaPayload = Object.keys(meta || {}).length ? ` ${safeStringify(meta)}` : '';
    return `[${timestamp}] 📄 DOCS ${level}: ${message}${metaPayload}`;
  })
);

const transports: transport[] = [
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
  }),
];

if (process.env.NODE_ENV === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/documentos-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: 'logs/documentos-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: process.env.LOG_LEVEL || 'info',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
    })
  );
}

const AppLogger = winston.createLogger({
  levels: logLevels,
  transports,
  exitOnError: false,
});

export { AppLogger };