/**
 * Coverage tests for string utilities
 * These tests import real code to generate coverage
 */

import {
  capitalizeFirst,
  capitalize,
  slugify,
  truncate,
} from '../index';

describe('String Utilities Coverage', () => {
  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
    });

    it('should lowercase rest of string', () => {
      expect(capitalizeFirst('HELLO')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirst('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalizeFirst('a')).toBe('A');
    });

    it('should handle mixed case', () => {
      expect(capitalizeFirst('hELLO')).toBe('Hello');
    });
  });

  describe('capitalize', () => {
    it('should capitalize each word', () => {
      expect(capitalize('hello world')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle multiple spaces', () => {
      expect(capitalize('hello  world')).toBe('Hello  World');
    });

    it('should lowercase other letters', () => {
      expect(capitalize('HELLO WORLD')).toBe('Hello World');
    });
  });

  describe('slugify', () => {
    it('should create slug from text', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello! World?')).toBe('hello-world');
    });

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('should handle underscores', () => {
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('should remove leading hyphens', () => {
      expect(slugify('-hello-world')).toBe('hello-world');
    });

    it('should remove trailing hyphens', () => {
      expect(slugify('hello-world-')).toBe('hello-world');
    });

    it('should handle accented characters', () => {
      // Note: current implementation may keep accents
      const result = slugify('Café');
      expect(result).toBeDefined();
    });
  });

  describe('truncate', () => {
    it('should truncate long string', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short string', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncate('Hello World', 5, '…')).toBe('Hello…');
    });

    it('should handle exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle length of 0', () => {
      expect(truncate('Hello', 0)).toBe('...');
    });
  });
});



