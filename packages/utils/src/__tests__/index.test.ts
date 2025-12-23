/**
 * Tests for packages/utils
 * @jest-environment node
 */

import {
  validateEmail,
  validatePassword,
  validateRequired,
  capitalizeFirst,
  capitalize,
  slugify,
  truncate,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isToday,
  formatNumber,
  formatCurrency,
  formatPercentage,
  groupBy,
  sortBy,
  uniqueBy,
  omit,
  pick,
  deepClone,
  getUserDisplayName,
  getUserRoleLabel,
  canUserAccessResource,
  isUserInEmpresa,
  createError,
  formatError,
  sleep,
  retry,
  generateId,
  generateUUID,
  isDevelopment,
  isProduction,
  isTest,
  buildUrl,
  parseQueryString,
} from '../index';
import { UserRole, User } from '@workspace/types';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================
describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('admin@test.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('spaces in@email.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return empty array for valid password', () => {
      const errors = validatePassword('ValidPass1');
      expect(errors).toHaveLength(0);
    });

    it('should return error for short password', () => {
      const errors = validatePassword('Short1');
      expect(errors.some(e => e.message.includes('8 characters'))).toBe(true);
    });

    it('should return error for missing uppercase', () => {
      const errors = validatePassword('lowercase1');
      expect(errors.some(e => e.message.includes('uppercase'))).toBe(true);
    });

    it('should return error for missing lowercase', () => {
      const errors = validatePassword('UPPERCASE1');
      expect(errors.some(e => e.message.includes('lowercase'))).toBe(true);
    });

    it('should return error for missing number', () => {
      const errors = validatePassword('NoNumberHere');
      expect(errors.some(e => e.message.includes('number'))).toBe(true);
    });

    it('should return multiple errors for very weak password', () => {
      const errors = validatePassword('weak');
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateRequired', () => {
    it('should return null for valid values', () => {
      expect(validateRequired('value', 'field')).toBeNull();
      expect(validateRequired(123, 'field')).toBeNull();
      expect(validateRequired(true, 'field')).toBeNull();
      expect(validateRequired({}, 'field')).toBeNull();
      expect(validateRequired([], 'field')).toBeNull();
    });

    it('should return error for null/undefined', () => {
      expect(validateRequired(null, 'name')).toEqual({
        field: 'name',
        message: 'name is required',
      });
      expect(validateRequired(undefined, 'email')).toEqual({
        field: 'email',
        message: 'email is required',
      });
    });

    it('should return error for empty string', () => {
      expect(validateRequired('', 'title')).not.toBeNull();
      expect(validateRequired('   ', 'title')).not.toBeNull();
    });

    it('should return error for false and 0', () => {
      expect(validateRequired(false, 'active')).not.toBeNull();
      expect(validateRequired(0, 'count')).not.toBeNull();
    });
  });
});

// ============================================================================
// STRING UTILITIES
// ============================================================================
describe('String Utilities', () => {
  describe('capitalizeFirst', () => {
    it('should capitalize first letter and lowercase rest', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('HELLO')).toBe('Hello');
      expect(capitalizeFirst('hELLO')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalizeFirst('a')).toBe('A');
    });
  });

  describe('capitalize', () => {
    it('should capitalize each word', () => {
      expect(capitalize('hello world')).toBe('Hello World');
      expect(capitalize('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Some Title Here')).toBe('some-title-here');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
      expect(slugify('Test@#$%String')).toBe('teststring');
    });

    it('should handle multiple spaces/underscores', () => {
      expect(slugify('hello   world')).toBe('hello-world');
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('should trim leading/trailing hyphens', () => {
      expect(slugify('  hello world  ')).toBe('hello-world');
      expect(slugify('---hello---')).toBe('hello');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncate('Hello World', 5, '…')).toBe('Hello…');
    });
  });
});

// ============================================================================
// DATE UTILITIES
// ============================================================================
describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDate(date, 'es-ES');
      expect(result).toContain('2024');
      // Day may vary by timezone, just check format is valid
      expect(result).toMatch(/\d+.*enero.*2024/i);
    });

    it('should format date string', () => {
      const result = formatDate('2024-06-20T12:00:00Z', 'es-ES');
      expect(result).toContain('2024');
      expect(result).toMatch(/\d+.*junio.*2024/i);
    });
  });

  describe('formatDateTime', () => {
    it('should include time in format', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatDateTime(date, 'es-ES');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "hace un momento" for recent times', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('hace un momento');
    });

    it('should return minutes for times < 1 hour ago', () => {
      const date = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      expect(formatRelativeTime(date)).toContain('minutos');
    });

    it('should return hours for times < 1 day ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      expect(formatRelativeTime(date)).toContain('horas');
    });

    it('should return days for times < 30 days ago', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      expect(formatRelativeTime(date)).toContain('días');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should handle string dates', () => {
      const todayStr = new Date().toISOString();
      expect(isToday(todayStr)).toBe(true);
    });
  });
});

// ============================================================================
// NUMBER UTILITIES
// ============================================================================
describe('Number Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with locale', () => {
      const result = formatNumber(1234567, 'es-ES');
      expect(result).toMatch(/1.*234.*567/);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency', () => {
      const result = formatCurrency(1234.56, 'EUR', 'es-ES');
      expect(result).toContain('€');
    });

    it('should format USD', () => {
      const result = formatCurrency(1234.56, 'USD', 'en-US');
      expect(result).toContain('$');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage', () => {
      const result = formatPercentage(0.75, 'es-ES');
      expect(result).toContain('75');
      expect(result).toContain('%');
    });
  });
});

// ============================================================================
// ARRAY UTILITIES
// ============================================================================
describe('Array Utilities', () => {
  describe('groupBy', () => {
    it('should group array by key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];
      const result = groupBy(items, 'category');
      expect(result['A']).toHaveLength(2);
      expect(result['B']).toHaveLength(1);
    });
  });

  describe('sortBy', () => {
    it('should sort ascending by default', () => {
      const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
      const sorted = sortBy(items, 'value');
      expect(sorted[0].value).toBe(1);
      expect(sorted[2].value).toBe(3);
    });

    it('should sort descending when specified', () => {
      const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
      const sorted = sortBy(items, 'value', 'desc');
      expect(sorted[0].value).toBe(3);
      expect(sorted[2].value).toBe(1);
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by key', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' },
      ];
      const result = uniqueBy(items, 'id');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
    });
  });
});

// ============================================================================
// OBJECT UTILITIES
// ============================================================================
describe('Object Utilities', () => {
  describe('omit', () => {
    it('should remove specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle multiple keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ['a', 'c']);
      expect(result).toEqual({ b: 2, d: 4 });
    });
  });

  describe('pick', () => {
    it('should keep only specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should ignore missing keys', () => {
      const obj = { a: 1, b: 2 } as { a: number; b: number; c?: number };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('deepClone', () => {
    it('should clone nested objects', () => {
      const original = { a: { b: { c: 1 } } };
      const cloned = deepClone(original);
      cloned.a.b.c = 2;
      expect(original.a.b.c).toBe(1);
    });

    it('should clone arrays', () => {
      const original = { arr: [1, 2, 3] };
      const cloned = deepClone(original);
      cloned.arr.push(4);
      expect(original.arr).toHaveLength(3);
    });

    it('should clone dates', () => {
      const original = { date: new Date('2024-01-01') };
      const cloned = deepClone(original);
      expect(cloned.date).toBeInstanceOf(Date);
      expect(cloned.date.getTime()).toBe(original.date.getTime());
    });

    it('should handle primitives', () => {
      expect(deepClone(null)).toBeNull();
      expect(deepClone(123)).toBe(123);
      expect(deepClone('string')).toBe('string');
    });
  });
});

// ============================================================================
// USER UTILITIES
// ============================================================================
describe('User Utilities', () => {
  const mockUser: User = {
    id: 1,
    email: 'john.doe@example.com',
    role: UserRole.admin,
    empresaId: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getUserDisplayName', () => {
    it('should extract username from email', () => {
      expect(getUserDisplayName(mockUser)).toBe('john.doe');
    });
  });

  describe('getUserRoleLabel', () => {
    it('should return Spanish label for role', () => {
      expect(getUserRoleLabel(UserRole.admin)).toBe('Administrador');
      expect(getUserRoleLabel(UserRole.user)).toBe('Usuario');
      expect(getUserRoleLabel(UserRole.superadmin)).toBe('Super Administrador');
    });
  });

  describe('canUserAccessResource', () => {
    it('should return true if user has required role', () => {
      expect(canUserAccessResource(mockUser, [UserRole.admin])).toBe(true);
    });

    it('should return false if user lacks required role', () => {
      expect(canUserAccessResource(mockUser, [UserRole.superadmin])).toBe(false);
    });
  });

  describe('isUserInEmpresa', () => {
    it('should return true for matching empresa', () => {
      expect(isUserInEmpresa(mockUser, 100)).toBe(true);
    });

    it('should return false for different empresa', () => {
      expect(isUserInEmpresa(mockUser, 999)).toBe(false);
    });
  });
});

// ============================================================================
// ERROR UTILITIES
// ============================================================================
describe('Error Utilities', () => {
  describe('createError', () => {
    it('should create error with message and status', () => {
      const error = createError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect((error as any).statusCode).toBe(404);
    });

    it('should default to status 500', () => {
      const error = createError('Server error');
      expect((error as any).statusCode).toBe(500);
    });
  });

  describe('formatError', () => {
    it('should format Error instance', () => {
      expect(formatError(new Error('Test error'))).toBe('Test error');
    });

    it('should format string error', () => {
      expect(formatError('String error')).toBe('String error');
    });

    it('should handle unknown error types', () => {
      expect(formatError({ unexpected: true })).toBe('An unknown error occurred');
    });
  });
});

// ============================================================================
// ASYNC UTILITIES
// ============================================================================
describe('Async Utilities', () => {
  describe('sleep', () => {
    it('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe('retry', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');
      const result = await retry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));
      await expect(retry(fn, 2, 10)).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// ID GENERATION
// ============================================================================
describe('ID Generation', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate string IDs', () => {
      expect(typeof generateId()).toBe('string');
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});

// ============================================================================
// ENVIRONMENT UTILITIES
// ============================================================================
describe('Environment Utilities', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('isDevelopment', () => {
    it('should return true in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
    });

    it('should return false in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('should return true in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('should return false in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });
  });

  describe('isTest', () => {
    it('should return true in test', () => {
      process.env.NODE_ENV = 'test';
      expect(isTest()).toBe(true);
    });
  });
});

// ============================================================================
// URL UTILITIES
// ============================================================================
describe('URL Utilities', () => {
  describe('buildUrl', () => {
    it('should build URL from base and path', () => {
      const url = buildUrl('https://api.example.com', '/users');
      expect(url).toBe('https://api.example.com/users');
    });

    it('should add query parameters', () => {
      const url = buildUrl('https://api.example.com', '/search', {
        q: 'test',
        page: '1',
      });
      expect(url).toContain('q=test');
      expect(url).toContain('page=1');
    });
  });

  describe('parseQueryString', () => {
    it('should parse query string to object', () => {
      const result = parseQueryString('?foo=bar&baz=qux');
      expect(result).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should handle empty query string', () => {
      const result = parseQueryString('');
      expect(result).toEqual({});
    });
  });
});

