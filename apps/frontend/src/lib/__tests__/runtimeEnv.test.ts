import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getRuntimeEnv, getRuntimeFlag } from '../runtimeEnv';

describe('runtimeEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getRuntimeEnv', () => {
    it('retorna undefined para variables no definidas', () => {
      const result = getRuntimeEnv('NON_EXISTENT_VAR_XYZ');
      expect(result).toBeUndefined();
    });

    it('retorna valor de process.env cuando está definido', () => {
      process.env.TEST_VAR = 'test_value';
      const result = getRuntimeEnv('TEST_VAR');
      expect(result).toBe('test_value');
    });

    it('retorna undefined para variable vacía', () => {
      process.env.EMPTY_VAR = '';
      const result = getRuntimeEnv('EMPTY_VAR');
      expect(result).toBe('');
    });
  });

  describe('getRuntimeFlag', () => {
    it('retorna false para flags no definidos', () => {
      const result = getRuntimeFlag('NON_EXISTENT_FLAG_XYZ');
      expect(result).toBe(false);
    });

    it('retorna true cuando process.env tiene "true"', () => {
      process.env.TEST_FLAG = 'true';
      const result = getRuntimeFlag('TEST_FLAG');
      expect(result).toBe(true);
    });

    it('retorna false cuando process.env tiene "false"', () => {
      process.env.TEST_FLAG = 'false';
      const result = getRuntimeFlag('TEST_FLAG');
      expect(result).toBe(false);
    });

    it('retorna false para valores que no son "true"', () => {
      process.env.TEST_FLAG = 'yes';
      const result = getRuntimeFlag('TEST_FLAG');
      expect(result).toBe(false);
    });
  });
});

