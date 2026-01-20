/**
 * Coverage tests for array utilities
 * These tests import real code to generate coverage
 */

import {
  groupBy,
  sortBy,
  uniqueBy,
  omit,
  pick,
  deepClone,
} from '../index';

describe('Array Utilities Coverage', () => {
  describe('groupBy', () => {
    it('should group by property', () => {
      const items = [
        { type: 'A', value: 1 },
        { type: 'B', value: 2 },
        { type: 'A', value: 3 },
      ];
      const result = groupBy(items, 'type');
      expect(result['A']).toHaveLength(2);
      expect(result['B']).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const result = groupBy([], 'key');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should group by single item', () => {
      const items = [{ type: 'A', value: 1 }];
      const result = groupBy(items, 'type');
      expect(result['A']).toHaveLength(1);
    });
  });

  describe('sortBy', () => {
    it('should sort by property ascending', () => {
      const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
      const result = sortBy(items, 'value');
      expect(result[0].value).toBe(1);
      expect(result[2].value).toBe(3);
    });

    it('should sort descending', () => {
      const items = [{ value: 1 }, { value: 3 }, { value: 2 }];
      const result = sortBy(items, 'value', 'desc');
      expect(result[0].value).toBe(3);
      expect(result[2].value).toBe(1);
    });

    it('should handle empty array', () => {
      const result = sortBy([], 'key');
      expect(result).toHaveLength(0);
    });

    it('should sort strings', () => {
      const items = [{ name: 'C' }, { name: 'A' }, { name: 'B' }];
      const result = sortBy(items, 'name');
      expect(result[0].name).toBe('A');
    });
  });

  describe('uniqueBy', () => {
    it('should remove duplicates by property', () => {
      const items = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 1, value: 'c' },
      ];
      const result = uniqueBy(items, 'id');
      expect(result).toHaveLength(2);
    });

    it('should keep first occurrence', () => {
      const items = [
        { id: 1, value: 'first' },
        { id: 1, value: 'second' },
      ];
      const result = uniqueBy(items, 'id');
      expect(result[0].value).toBe('first');
    });

    it('should handle empty array', () => {
      const result = uniqueBy([], 'key');
      expect(result).toHaveLength(0);
    });

    it('should handle all unique items', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = uniqueBy(items, 'id');
      expect(result).toHaveLength(3);
    });
  });

  describe('omit', () => {
    it('should omit specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should omit multiple keys', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ['b', 'd']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, []);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ['c' as keyof typeof obj]);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('pick', () => {
    it('should pick specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('should handle empty keys array', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, []);
      expect(result).toEqual({});
    });

    it('should ignore non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ['a', 'c' as keyof typeof obj]);
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('deepClone', () => {
    it('should clone simple object', () => {
      const obj = { a: 1, b: 2 };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    it('should clone nested object', () => {
      const obj = { a: { b: { c: 1 } } };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone.a).not.toBe(obj.a);
      expect(clone.a.b).not.toBe(obj.a.b);
    });

    it('should clone array', () => {
      const arr = [1, 2, 3];
      const clone = deepClone(arr);
      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
    });

    it('should clone object with array', () => {
      const obj = { items: [1, 2, 3] };
      const clone = deepClone(obj);
      expect(clone.items).toEqual(obj.items);
      expect(clone.items).not.toBe(obj.items);
    });

    it('should handle null', () => {
      const clone = deepClone(null);
      expect(clone).toBeNull();
    });
  });
});




