import { UserRole, User, ValidationError } from '@workspace/types';
import { randomBytes, randomUUID } from 'crypto';

// Validation utilities
/**
 * Validates email format
 * @security Input bounded to 254 chars (RFC 5321 max email length)
 */
export const validateEmail = (email: string): boolean => {
  // Bound input to RFC max email length to prevent ReDoS
  if (!email || email.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
    });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
    });
  }

  if (!/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }

  return errors;
};

export const validateRequired = (value: unknown, fieldName: string): ValidationError | null => {
  const isEmptyString = typeof value === 'string' && value.trim() === '';
  const isFalsy = value === null || value === undefined || value === false || value === 0 || value === '';
  if (isFalsy || isEmptyString) {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
};

// String utilities
export const capitalizeFirst = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalize = (str: string): string => {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
};

/**
 * Converts string to URL-safe slug
 * @security Input bounded to 256 chars to prevent DoS
 */
export const slugify = (str: string): string => {
  // Bound input to prevent ReDoS
  const bounded = str.slice(0, 256);
  return bounded
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+/, '').replace(/-+$/, ''); // Remove leading/trailing hyphens
};

export const truncate = (str: string, length: number, suffix = '...'): string => {
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

// Date utilities
export const formatDate = (date: Date | string, locale = 'es-ES'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

export const formatDateTime = (date: Date | string, locale = 'es-ES'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatRelativeTime = (date: Date | string, locale = 'es-ES'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)} días`;

  return formatDate(d, locale);
};

export const isToday = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

// Number utilities
export const formatNumber = (num: number, locale = 'es-ES'): string => {
  return new Intl.NumberFormat(locale).format(num);
};

export const formatCurrency = (amount: number, currency = 'EUR', locale = 'es-ES'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatPercentage = (value: number, locale = 'es-ES'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

// Array utilities
export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce(
    (result, item) => {
      const group = String(item[key]);
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    if (direction === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
};

export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

// Object utilities
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const cloned = {} as any;
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  return obj;
};

// User utilities
export const getUserDisplayName = (user: User): string => {
  return user.email.split('@')[0];
};

export const getUserRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    [UserRole.user]: 'Usuario',
    [UserRole.admin]: 'Administrador',
    [UserRole.superadmin]: 'Super Administrador',
  };
  return labels[role] || 'Desconocido';
};

export const canUserAccessResource = (user: User, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(user.role);
};

export const isUserInEmpresa = (user: User, empresaId: number): boolean => {
  return user.empresaId === empresaId;
};

// Error utilities
export const createError = (message: string, statusCode = 500): Error => {
  const error = new Error(message);
  (error as any).statusCode = statusCode;
  return error;
};

export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

// Async utilities
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> => {
  let lastError: Error = new Error('Retry failed');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ID generation - Usando crypto para seguridad criptográfica
export const generateId = (): string => {
  // Usar crypto.randomBytes para IDs seguros
  return Date.now().toString(36) + randomBytes(8).toString('hex');
};

export const generateUUID = (): string => {
  // Usar crypto.randomUUID nativo (Node 16+) para UUIDs seguros
  return randomUUID();
};

// Environment utilities
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

// URL utilities
export const buildUrl = (base: string, path: string, params?: Record<string, string>): string => {
  const url = new URL(path, base);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
};

export const parseQueryString = (queryString: string): Record<string, string> => {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
};
