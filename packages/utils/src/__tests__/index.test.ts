/**
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
  debounce,
  throttle,
  generateId,
  generateUUID,
  isDevelopment,
  isProduction,
  isTest,
  buildUrl,
  parseQueryString,
} from '../index';
import { UserRole, User } from '@workspace/types';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('returns true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('admin@test.org')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('returns false when email exceeds 254 characters', () => {
      const longLocal = 'a'.repeat(246);
      expect(validateEmail(`${longLocal}@test.com`)).toBe(false);
    });

    it('returns false for emails without @', () => {
      expect(validateEmail('invalid')).toBe(false);
    });

    it('returns false for emails without domain extension', () => {
      expect(validateEmail('missing@domain')).toBe(false);
    });

    it('returns false for emails starting with @', () => {
      expect(validateEmail('@nodomain.com')).toBe(false);
    });

    it('returns false for emails with spaces', () => {
      expect(validateEmail('spaces in@email.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('returns empty array for a valid password', () => {
      expect(validatePassword('ValidPass1')).toHaveLength(0);
    });

    it('returns error for password shorter than 8 characters', () => {
      const errors = validatePassword('Sh1');
      expect(errors.some(e => e.message.includes('8 characters'))).toBe(true);
    });

    it('returns error for missing uppercase letter', () => {
      const errors = validatePassword('lowercase1');
      expect(errors.some(e => e.message.includes('uppercase'))).toBe(true);
    });

    it('returns error for missing lowercase letter', () => {
      const errors = validatePassword('UPPERCASE1');
      expect(errors.some(e => e.message.includes('lowercase'))).toBe(true);
    });

    it('returns error for missing number', () => {
      const errors = validatePassword('NoNumberHere');
      expect(errors.some(e => e.message.includes('number'))).toBe(true);
    });

    it('returns all four errors for the worst-case password', () => {
      const errors = validatePassword('!!!');
      expect(errors).toHaveLength(4);
    });

    it('all errors reference the password field', () => {
      const errors = validatePassword('weak');
      for (const e of errors) {
        expect(e.field).toBe('password');
      }
    });
  });

  describe('validateRequired', () => {
    it('returns null for non-empty string', () => {
      expect(validateRequired('value', 'field')).toBeNull();
    });

    it('returns null for truthy number', () => {
      expect(validateRequired(123, 'field')).toBeNull();
    });

    it('returns null for true', () => {
      expect(validateRequired(true, 'field')).toBeNull();
    });

    it('returns null for empty object and array (truthy references)', () => {
      expect(validateRequired({}, 'field')).toBeNull();
      expect(validateRequired([], 'field')).toBeNull();
    });

    it('returns error for null', () => {
      expect(validateRequired(null, 'name')).toEqual({
        field: 'name',
        message: 'name is required',
      });
    });

    it('returns error for undefined', () => {
      expect(validateRequired(undefined, 'email')).toEqual({
        field: 'email',
        message: 'email is required',
      });
    });

    it('returns error for false', () => {
      expect(validateRequired(false, 'active')).toEqual({
        field: 'active',
        message: 'active is required',
      });
    });

    it('returns error for 0', () => {
      expect(validateRequired(0, 'count')).toEqual({
        field: 'count',
        message: 'count is required',
      });
    });

    it('returns error for empty string', () => {
      expect(validateRequired('', 'title')).toEqual({
        field: 'title',
        message: 'title is required',
      });
    });

    it('returns error for whitespace-only string', () => {
      expect(validateRequired('   ', 'title')).toEqual({
        field: 'title',
        message: 'title is required',
      });
    });
  });
});

describe('String Utilities', () => {
  describe('capitalizeFirst', () => {
    it('capitalizes the first letter and lowercases the rest', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('HELLO')).toBe('Hello');
      expect(capitalizeFirst('hELLO')).toBe('Hello');
    });

    it('returns empty string unchanged', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('handles a single character', () => {
      expect(capitalizeFirst('a')).toBe('A');
      expect(capitalizeFirst('Z')).toBe('Z');
    });
  });

  describe('capitalize', () => {
    it('capitalizes each word in a sentence', () => {
      expect(capitalize('hello world')).toBe('Hello World');
      expect(capitalize('HELLO WORLD')).toBe('Hello World');
    });

    it('returns empty string unchanged', () => {
      expect(capitalize('')).toBe('');
    });

    it('handles single word', () => {
      expect(capitalize('word')).toBe('Word');
    });
  });

  describe('slugify', () => {
    it('converts to lowercase hyphenated slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Some Title Here')).toBe('some-title-here');
    });

    it('removes special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
      expect(slugify('Test@#$%String')).toBe('teststring');
    });

    it('collapses multiple spaces, underscores, and hyphens', () => {
      expect(slugify('hello   world')).toBe('hello-world');
      expect(slugify('hello_world')).toBe('hello-world');
      expect(slugify('a---b___c   d')).toBe('a-b-c-d');
    });

    it('trims leading/trailing hyphens', () => {
      expect(slugify('  hello world  ')).toBe('hello-world');
      expect(slugify('---hello---')).toBe('hello');
    });

    it('bounds input to 256 characters', () => {
      const long = 'a'.repeat(300);
      const result = slugify(long);
      expect(result.length).toBeLessThanOrEqual(256);
    });
  });

  describe('truncate', () => {
    it('truncates strings longer than limit', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('returns string unchanged if within limit', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('uses custom suffix', () => {
      expect(truncate('Hello World', 5, '…')).toBe('Hello…');
    });
  });
});

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('formats a Date object with default locale', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDate(date);
      expect(result).toContain('2024');
    });

    it('formats a date string', () => {
      const result = formatDate('2024-06-20T12:00:00Z', 'es-ES');
      expect(result).toContain('2024');
    });
  });

  describe('formatDateTime', () => {
    it('formats a Date object with time', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toContain('2024');
    });

    it('formats a date string with time', () => {
      const result = formatDateTime('2024-03-01T08:00:00Z', 'es-ES');
      expect(result).toContain('2024');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns "hace un momento" for < 60 seconds ago', () => {
      const date = new Date('2025-06-15T11:59:30Z');
      expect(formatRelativeTime(date)).toBe('hace un momento');
    });

    it('returns minutes for 60s..3599s ago', () => {
      const date = new Date('2025-06-15T11:30:00Z');
      expect(formatRelativeTime(date)).toBe('hace 30 minutos');
    });

    it('returns hours for 3600s..86399s ago', () => {
      const date = new Date('2025-06-15T07:00:00Z');
      expect(formatRelativeTime(date)).toBe('hace 5 horas');
    });

    it('returns days for 86400s..2591999s ago', () => {
      const tenDaysAgo = new Date('2025-06-05T12:00:00Z');
      expect(formatRelativeTime(tenDaysAgo)).toBe('hace 10 días');
    });

    it('falls back to formatted date for >= 30 days ago', () => {
      const oldDate = new Date('2025-01-01T12:00:00Z');
      const result = formatRelativeTime(oldDate);
      expect(result).toContain('2025');
      expect(result).not.toContain('hace');
    });

    it('accepts a string date', () => {
      expect(formatRelativeTime('2025-06-15T11:59:30Z')).toBe('hace un momento');
    });
  });

  describe('isToday', () => {
    it('returns true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('handles string dates', () => {
      expect(isToday(new Date().toISOString())).toBe(true);
    });

    it('returns false for a far-future date', () => {
      expect(isToday('2099-01-01T00:00:00Z')).toBe(false);
    });
  });
});

describe('Number Utilities', () => {
  describe('formatNumber', () => {
    it('formats with default locale', () => {
      const result = formatNumber(1234567);
      expect(result).toMatch(/1.*234.*567/);
    });

    it('accepts a custom locale', () => {
      const result = formatNumber(1234567, 'en-US');
      expect(result).toContain('1,234,567');
    });
  });

  describe('formatCurrency', () => {
    it('formats EUR by default', () => {
      const result = formatCurrency(1234.56);
      expect(result).toMatch(/€|EUR/);
    });

    it('formats USD with en-US locale', () => {
      const result = formatCurrency(1234.56, 'USD', 'en-US');
      expect(result).toContain('$');
    });
  });

  describe('formatPercentage', () => {
    it('formats a fraction as percentage', () => {
      const result = formatPercentage(0.75);
      expect(result).toContain('75');
      expect(result).toContain('%');
    });

    it('handles zero', () => {
      const result = formatPercentage(0);
      expect(result).toContain('0');
      expect(result).toContain('%');
    });
  });
});

describe('Array Utilities', () => {
  describe('groupBy', () => {
    it('groups items by the given key', () => {
      const items = [
        { category: 'A', value: 1 },
        { category: 'B', value: 2 },
        { category: 'A', value: 3 },
      ];
      const result = groupBy(items, 'category');
      expect(result['A']).toHaveLength(2);
      expect(result['B']).toHaveLength(1);
    });

    it('handles empty array', () => {
      expect(groupBy([], 'key' as never)).toEqual({});
    });

    it('creates single-element groups when all keys are unique', () => {
      const items = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      const result = groupBy(items, 'id');
      expect(result['1']).toHaveLength(1);
      expect(result['2']).toHaveLength(1);
    });
  });

  describe('sortBy', () => {
    const items = [{ value: 3 }, { value: 1 }, { value: 2 }];

    it('sorts ascending by default', () => {
      const sorted = sortBy(items, 'value');
      expect(sorted.map(i => i.value)).toEqual([1, 2, 3]);
    });

    it('sorts descending', () => {
      const sorted = sortBy(items, 'value', 'desc');
      expect(sorted.map(i => i.value)).toEqual([3, 2, 1]);
    });

    it('does not mutate the original array', () => {
      const copy = [...items];
      sortBy(items, 'value');
      expect(items).toEqual(copy);
    });
  });

  describe('uniqueBy', () => {
    it('removes duplicates by key, keeping the first occurrence', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 1, name: 'C' },
      ];
      const result = uniqueBy(items, 'id');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('A');
      expect(result[1].name).toBe('B');
    });

    it('returns empty array for empty input', () => {
      expect(uniqueBy([], 'id' as never)).toEqual([]);
    });
  });
});

describe('Object Utilities', () => {
  describe('omit', () => {
    it('removes the specified keys', () => {
      expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
    });

    it('removes multiple keys', () => {
      expect(omit({ a: 1, b: 2, c: 3, d: 4 }, ['a', 'c'])).toEqual({ b: 2, d: 4 });
    });

    it('does not mutate the original object', () => {
      const obj = { a: 1, b: 2 };
      omit(obj, ['a']);
      expect(obj).toEqual({ a: 1, b: 2 });
    });
  });

  describe('pick', () => {
    it('keeps only the specified keys', () => {
      expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });

    it('ignores keys not present in the object', () => {
      const obj = { a: 1, b: 2 } as { a: number; b: number; c?: number };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1 });
    });
  });

  describe('deepClone', () => {
    it('returns null for null input', () => {
      expect(deepClone(null)).toBeNull();
    });

    it('returns primitives unchanged', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('text')).toBe('text');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(undefined)).toBeUndefined();
    });

    it('clones Date instances', () => {
      const original = new Date('2024-01-01');
      const cloned = deepClone(original);
      expect(cloned).toBeInstanceOf(Date);
      expect(cloned.getTime()).toBe(original.getTime());
      expect(cloned).not.toBe(original);
    });

    it('clones arrays deeply', () => {
      const original = [1, [2, 3], [4, [5]]];
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[1]).not.toBe(original[1]);
    });

    it('clones nested objects deeply', () => {
      const original = { a: { b: { c: 1 } } };
      const cloned = deepClone(original);
      cloned.a.b.c = 999;
      expect(original.a.b.c).toBe(1);
    });

    it('clones objects containing Date and Array values', () => {
      const original = { date: new Date('2024-06-01'), items: [1, 2, 3] };
      const cloned = deepClone(original);
      cloned.items.push(4);
      expect(original.items).toHaveLength(3);
      expect(cloned.date).toBeInstanceOf(Date);
      expect(cloned.date).not.toBe(original.date);
    });
  });
});

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
    it('extracts the local part of the email', () => {
      expect(getUserDisplayName(mockUser)).toBe('john.doe');
    });

    it('works with simple emails', () => {
      const user = { ...mockUser, email: 'admin@test.com' };
      expect(getUserDisplayName(user)).toBe('admin');
    });
  });

  describe('getUserRoleLabel', () => {
    it('returns "Usuario" for user role', () => {
      expect(getUserRoleLabel(UserRole.user)).toBe('Usuario');
    });

    it('returns "Administrador" for admin role', () => {
      expect(getUserRoleLabel(UserRole.admin)).toBe('Administrador');
    });

    it('returns "Super Administrador" for superadmin role', () => {
      expect(getUserRoleLabel(UserRole.superadmin)).toBe('Super Administrador');
    });

    it('returns "Desconocido" for an unknown role', () => {
      expect(getUserRoleLabel('unknown' as UserRole)).toBe('Desconocido');
    });
  });

  describe('canUserAccessResource', () => {
    it('returns true when user role is in the required list', () => {
      expect(canUserAccessResource(mockUser, [UserRole.admin, UserRole.superadmin])).toBe(true);
    });

    it('returns false when user role is not in the required list', () => {
      expect(canUserAccessResource(mockUser, [UserRole.superadmin])).toBe(false);
    });

    it('returns false for empty required roles', () => {
      expect(canUserAccessResource(mockUser, [])).toBe(false);
    });
  });

  describe('isUserInEmpresa', () => {
    it('returns true when empresaId matches', () => {
      expect(isUserInEmpresa(mockUser, 100)).toBe(true);
    });

    it('returns false when empresaId does not match', () => {
      expect(isUserInEmpresa(mockUser, 999)).toBe(false);
    });

    it('returns false when user has null empresaId', () => {
      const userNoEmpresa = { ...mockUser, empresaId: null };
      expect(isUserInEmpresa(userNoEmpresa, 100)).toBe(false);
    });
  });
});

describe('Error Utilities', () => {
  describe('createError', () => {
    it('creates an error with custom message and statusCode', () => {
      const error = createError('Not found', 404);
      expect(error.message).toBe('Not found');
      expect((error as any).statusCode).toBe(404); // NOSONAR: testing dynamic property
    });

    it('defaults statusCode to 500', () => {
      const error = createError('Server error');
      expect((error as any).statusCode).toBe(500); // NOSONAR: testing dynamic property
    });
  });

  describe('formatError', () => {
    it('extracts message from Error instances', () => {
      expect(formatError(new Error('Test error'))).toBe('Test error');
    });

    it('returns string errors as-is', () => {
      expect(formatError('String error')).toBe('String error');
    });

    it('returns generic message for unknown types', () => {
      expect(formatError(42)).toBe('An unknown error occurred');
      expect(formatError({ code: 500 })).toBe('An unknown error occurred');
      expect(formatError(null)).toBe('An unknown error occurred');
    });
  });
});

describe('Async Utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('sleep', () => {
    it('resolves after the specified duration', async () => {
      const promise = sleep(1000);
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('does not resolve before the duration elapses', () => {
      let resolved = false;
      sleep(500).then(() => {
        resolved = true;
      });
      jest.advanceTimersByTime(499);
      expect(resolved).toBe(false);
    });
  });

  describe('retry', () => {
    it('returns the result on first successful attempt', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const promise = retry(fn, 3, 100);
      await jest.advanceTimersByTimeAsync(0);
      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries and succeeds on the second attempt', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('ok');

      const promise = retry(fn, 3, 100);

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('throws the last error after exhausting maxAttempts', async () => {
      jest.useRealTimers();

      const fn = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(retry(fn, 2, 10)).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useFakeTimers();
    });

    it('wraps non-Error throws in an Error', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce('string error')
        .mockResolvedValueOnce('ok');

      const promise = retry(fn, 3, 100);

      await jest.advanceTimersByTimeAsync(200);

      await expect(promise).resolves.toBe('ok');
    });

    it('uses default maxAttempts=3 and delayMs=1000', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockResolvedValueOnce('ok');

      const promise = retry(fn);

      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);

      await expect(promise).resolves.toBe('ok');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});

describe('Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls the function after the delay', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    jest.advanceTimersByTime(100);
    debounced();
    jest.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the debounced function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('a', 'b');
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('a', 'b');
  });

  it('only executes the last call when invoked multiple times', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced(1);
    debounced(2);
    debounced(3);
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });
});

describe('Throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('executes immediately on first call', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 200);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('suppresses calls within the throttle window', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 200);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows a new call after the throttle window', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 200);

    throttled();
    jest.advanceTimersByTime(200);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments to the throttled function', () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled('x', 'y');
    expect(fn).toHaveBeenCalledWith('x', 'y');
  });
});

describe('ID Generation', () => {
  describe('generateId', () => {
    it('returns a string', () => {
      expect(typeof generateId()).toBe('string');
    });

    it('generates unique IDs across multiple calls', () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateId()));
      expect(ids.size).toBe(50);
    });
  });

  describe('generateUUID', () => {
    it('matches the UUID v4 format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(generateUUID()).toMatch(uuidRegex);
    });

    it('generates unique UUIDs', () => {
      const a = generateUUID();
      const b = generateUUID();
      expect(a).not.toBe(b);
    });
  });
});

describe('Environment Utilities', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('isDevelopment', () => {
    it('returns true when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);
    });

    it('returns false when NODE_ENV is not development', () => {
      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });
  });

  describe('isProduction', () => {
    it('returns true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('returns false when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });
  });

  describe('isTest', () => {
    it('returns true when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      expect(isTest()).toBe(true);
    });

    it('returns false when NODE_ENV is not test', () => {
      process.env.NODE_ENV = 'production';
      expect(isTest()).toBe(false);
    });
  });
});

describe('URL Utilities', () => {
  describe('buildUrl', () => {
    it('builds a URL from base and path', () => {
      expect(buildUrl('https://api.example.com', '/users')).toBe(
        'https://api.example.com/users'
      );
    });

    it('appends query parameters', () => {
      const url = buildUrl('https://api.example.com', '/search', {
        q: 'test',
        page: '1',
      });
      expect(url).toContain('q=test');
      expect(url).toContain('page=1');
    });

    it('builds URL without params', () => {
      const url = buildUrl('https://example.com', '/path');
      expect(url).toBe('https://example.com/path');
    });

    it('handles empty params object', () => {
      const url = buildUrl('https://example.com', '/path', {});
      expect(url).toBe('https://example.com/path');
    });
  });

  describe('parseQueryString', () => {
    it('parses key-value pairs from a query string', () => {
      expect(parseQueryString('?foo=bar&baz=qux')).toEqual({
        foo: 'bar',
        baz: 'qux',
      });
    });

    it('returns empty object for empty string', () => {
      expect(parseQueryString('')).toEqual({});
    });

    it('parses without leading question mark', () => {
      expect(parseQueryString('key=value')).toEqual({ key: 'value' });
    });

    it('handles encoded values', () => {
      const result = parseQueryString('name=hello%20world');
      expect(result.name).toBe('hello world');
    });
  });
});
