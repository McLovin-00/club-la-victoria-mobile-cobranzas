type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const levelOrder: Record<Exclude<LogLevel, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getEnvLevel(): LogLevel {
  const env = import.meta.env.MODE;
  // Silenciar en test y production por defecto, dejar info+ en dev
  if (env === 'production') return 'info';
  if (env === 'test') return 'silent';
  return 'debug';
}

let currentLevel: LogLevel = getEnvLevel();

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  if (currentLevel === 'silent') return false;
  const min = levelOrder[currentLevel as Exclude<LogLevel, 'silent'>] ?? 10;
  return levelOrder[level] >= min;
}

function formatMessage(level: string, message?: unknown, ...args: unknown[]) {
  const ts = new Date().toISOString();
  return [`[${ts}] [${level.toUpperCase()}]`, message, ...args];
}

export const logger = {
  debug(message?: unknown, ...args: unknown[]) {
    if (!shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.debug(...formatMessage('debug', message, ...args));
  },
  info(message?: unknown, ...args: unknown[]) {
    if (!shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.info(...formatMessage('info', message, ...args));
  },
  warn(message?: unknown, ...args: unknown[]) {
    if (!shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(...formatMessage('warn', message, ...args));
  },
  error(message?: unknown, ...args: unknown[]) {
    if (!shouldLog('error')) return;
    // eslint-disable-next-line no-console
    console.error(...formatMessage('error', message, ...args));
  },
};

export default logger;


