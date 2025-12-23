/**
 * Coverage tests for async utilities
 * These tests import real code to generate coverage
 */

import {
  sleep,
  retry,
  debounce,
  throttle,
} from '../index';

describe('Async Utilities Coverage', () => {
  describe('sleep', () => {
    it('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(10);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(5);
    }, 15000);

    it('should resolve without value', async () => {
      const result = await sleep(5);
      expect(result).toBeUndefined();
    }, 15000);

    it('should handle zero delay', async () => {
      await expect(sleep(0)).resolves.toBeUndefined();
    }, 15000);
  });

  describe('retry', () => {
    it('should succeed on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retry(fn, 3);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      const result = await retry(fn, 3, 5);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));
      await expect(retry(fn, 2, 5)).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should respect delay between retries', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      const start = Date.now();
      await retry(fn, 3, 20);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(15);
    }, 15000);
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('should debounce function calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to function', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');
      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should use last arguments', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');
      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('third');
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('should throttle function calls', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow call after delay', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled();
      jest.advanceTimersByTime(100);
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to function', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled('arg');
      expect(fn).toHaveBeenCalledWith('arg');
    });
  });
});

