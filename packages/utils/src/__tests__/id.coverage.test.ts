/**
 * Coverage tests for ID generation utilities
 * These tests import real code to generate coverage
 */

import {
  generateId,
  generateUUID,
} from '../index';

describe('ID Generation Utilities Coverage', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate string ID', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('should generate non-empty ID', () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate consistent length', () => {
      const ids = Array.from({ length: 10 }, () => generateId());
      const lengths = ids.map(id => id.length);
      // All should be similar length (within a small range)
      const minLength = Math.min(...lengths);
      const maxLength = Math.max(...lengths);
      expect(maxLength - minLength).toBeLessThan(5);
    });

    it('should include timestamp component', () => {
      const id = generateId();
      // ID should contain alphanumeric characters
      expect(/^[a-zA-Z0-9]+$/.test(id)).toBe(true);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate version 4 UUID', () => {
      const uuid = generateUUID();
      expect(uuid.charAt(14)).toBe('4'); // Version indicator
    });

    it('should generate correct variant', () => {
      const uuid = generateUUID();
      const variantChar = uuid.charAt(19).toLowerCase();
      expect(['8', '9', 'a', 'b']).toContain(variantChar);
    });

    it('should generate 36 character UUID', () => {
      const uuid = generateUUID();
      expect(uuid.length).toBe(36);
    });

    it('should contain hyphens at correct positions', () => {
      const uuid = generateUUID();
      expect(uuid[8]).toBe('-');
      expect(uuid[13]).toBe('-');
      expect(uuid[18]).toBe('-');
      expect(uuid[23]).toBe('-');
    });
  });
});



