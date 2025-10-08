/**
 * @jest-environment node
 */

import { formatDate, validateEmail, generateId, capitalizeFirst, truncate, validatePassword, getUserDisplayName } from './index';

describe('Utils Package Tests', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2023-01-15T10:30:00.000Z');
      const formatted = formatDate(date);
      expect(formatted).toContain('2023');
      expect(formatted).toContain('15');
    });

    it('should handle date string', () => {
      const formatted = formatDate('2023-01-15');
      expect(formatted).toContain('2023');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@company.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const errors = validatePassword('StrongPass123');
      expect(errors).toEqual([]);
    });

    it('should reject weak password', () => {
      const errors = validatePassword('weak');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('WORLD')).toBe('World');
      expect(capitalizeFirst('test string')).toBe('Test string');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const longString = 'This is a very long string that needs to be truncated';
      expect(truncate(longString, 20)).toBe('This is a very long ...');
    });

    it('should not truncate short strings', () => {
      const shortString = 'Short';
      expect(truncate(shortString, 20)).toBe('Short');
    });

    it('should handle custom suffix', () => {
      const longString = 'This is a very long string';
      expect(truncate(longString, 15, ' [more]')).toBe('This is a very  [more]');
    });
  });

  describe('getUserDisplayName', () => {
    it('should extract display name from email', () => {
      const user = {
        id: 1,
        email: 'john.doe@example.com',
        nombre: 'John',
        apellido: 'Doe',
        role: 'user' as any,
        activo: true,
        empresaId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(getUserDisplayName(user)).toBe('john.doe');
    });
  });
}); 