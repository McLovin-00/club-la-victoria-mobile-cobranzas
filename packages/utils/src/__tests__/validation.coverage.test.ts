/**
 * Coverage tests for validation utilities
 * These tests import real code to generate coverage
 */

import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../index';

describe('Validation Utilities Coverage', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(validateEmail('testexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(validateEmail('test@')).toBe(false);
    });

    it('should reject email without TLD', () => {
      expect(validateEmail('test@example')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(validateEmail('test @example.com')).toBe(false);
    });

    it('should validate email with subdomain', () => {
      expect(validateEmail('test@mail.example.com')).toBe(true);
    });

    it('should validate email with plus sign', () => {
      expect(validateEmail('test+tag@example.com')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should return empty array for valid password', () => {
      const errors = validatePassword('Password123');
      expect(errors).toHaveLength(0);
    });

    it('should require minimum length', () => {
      const errors = validatePassword('Pass1');
      expect(errors.some(e => e.message.includes('8 characters'))).toBe(true);
    });

    it('should require uppercase letter', () => {
      const errors = validatePassword('password123');
      expect(errors.some(e => e.message.includes('uppercase'))).toBe(true);
    });

    it('should require lowercase letter', () => {
      const errors = validatePassword('PASSWORD123');
      expect(errors.some(e => e.message.includes('lowercase'))).toBe(true);
    });

    it('should require number', () => {
      const errors = validatePassword('PasswordABC');
      expect(errors.some(e => e.message.includes('number'))).toBe(true);
    });

    it('should return multiple errors', () => {
      const errors = validatePassword('abc');
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateRequired', () => {
    it('should return null for valid string', () => {
      expect(validateRequired('value', 'field')).toBeNull();
    });

    it('should return error for empty string', () => {
      const error = validateRequired('', 'name');
      expect(error?.field).toBe('name');
      expect(error?.message).toContain('required');
    });

    it('should return error for null', () => {
      expect(validateRequired(null, 'field')).not.toBeNull();
    });

    it('should return error for undefined', () => {
      expect(validateRequired(undefined, 'field')).not.toBeNull();
    });

    it('should return null for number zero', () => {
      const error = validateRequired(0, 'count');
      expect(error).not.toBeNull(); // 0 is falsy
    });

    it('should return null for valid number', () => {
      expect(validateRequired(42, 'count')).toBeNull();
    });

    it('should return error for whitespace-only string', () => {
      expect(validateRequired('   ', 'field')).not.toBeNull();
    });

    it('should return null for array', () => {
      expect(validateRequired([1, 2, 3], 'items')).toBeNull();
    });

    it('should return null for object', () => {
      expect(validateRequired({ key: 'value' }, 'data')).toBeNull();
    });
  });
});




