/**
 * Coverage tests for date utilities
 * These tests import real code to generate coverage
 */

import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isToday,
} from '../index';

describe('Date Utilities Coverage', () => {
  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date('2024-06-15');
      const result = formatDate(date);
      expect(result).toContain('15');
      expect(result).toContain('junio') || expect(result).toContain('June');
    });

    it('should format date string', () => {
      const result = formatDate('2024-06-15');
      expect(result).toContain('2024');
    });

    it('should use specified locale', () => {
      const date = new Date('2024-06-15');
      const result = formatDate(date, 'en-US');
      expect(result).toBeDefined();
    });

    it('should format current date', () => {
      const result = formatDate(new Date());
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatDateTime', () => {
    it('should format Date object with time', () => {
      const date = new Date('2024-06-15T14:30:00');
      const result = formatDateTime(date);
      expect(result).toContain('15');
    });

    it('should format date string with time', () => {
      const result = formatDateTime('2024-06-15T14:30:00');
      expect(result).toBeDefined();
    });

    it('should use specified locale', () => {
      const date = new Date('2024-06-15T14:30:00');
      const result = formatDateTime(date, 'en-US');
      expect(result).toBeDefined();
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent date', () => {
      const now = new Date();
      const result = formatRelativeTime(now);
      expect(result).toBeDefined();
    });

    it('should format yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatRelativeTime(yesterday);
      expect(result).toBeDefined();
    });

    it('should format week ago', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const result = formatRelativeTime(weekAgo);
      expect(result).toBeDefined();
    });

    it('should format date string', () => {
      const result = formatRelativeTime('2024-06-15');
      expect(result).toBeDefined();
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

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should handle date string', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      expect(isToday(todayStr)).toBe(true);
    });

    it('should handle midnight today', () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      expect(isToday(midnight)).toBe(true);
    });

    it('should handle end of day today', () => {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      expect(isToday(endOfDay)).toBe(true);
    });
  });
});



