/**
 * Tests completos para lib/runtimeEnv.ts
 * Cubre getRuntimeEnv y getRuntimeFlag en diferentes entornos
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getRuntimeEnv, getRuntimeFlag } from '../runtimeEnv';

describe('getRuntimeEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('retorna valor de process.env cuando está disponible', () => {
    process.env.TEST_VAR = 'test_value';
    expect(getRuntimeEnv('TEST_VAR')).toBe('test_value');
  });

  it('retorna undefined para variable no existente', () => {
    expect(getRuntimeEnv('NON_EXISTENT_VAR_12345')).toBeUndefined();
  });

  it('retorna string vacío si la variable está vacía', () => {
    process.env.EMPTY_VAR = '';
    expect(getRuntimeEnv('EMPTY_VAR')).toBe('');
  });

  it('maneja variables de Vite (VITE_*)', () => {
    process.env.VITE_API_URL = 'http://localhost:3000';
    expect(getRuntimeEnv('VITE_API_URL')).toBe('http://localhost:3000');
  });
});

describe('getRuntimeFlag', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('retorna true cuando process.env tiene "true"', () => {
    process.env.MY_FLAG = 'true';
    expect(getRuntimeFlag('MY_FLAG')).toBe(true);
  });

  it('retorna false cuando process.env tiene otro valor', () => {
    process.env.MY_FLAG = 'false';
    expect(getRuntimeFlag('MY_FLAG')).toBe(false);
  });

  it('retorna false para variable no existente', () => {
    expect(getRuntimeFlag('NON_EXISTENT_FLAG_12345')).toBe(false);
  });

  it('retorna false para string vacío', () => {
    process.env.EMPTY_FLAG = '';
    expect(getRuntimeFlag('EMPTY_FLAG')).toBe(false);
  });

  it('retorna false para "TRUE" (case sensitive)', () => {
    process.env.UPPER_FLAG = 'TRUE';
    expect(getRuntimeFlag('UPPER_FLAG')).toBe(false);
  });
});

describe('runtimeEnv exports', () => {
  it('exporta getRuntimeEnv como función', () => {
    expect(typeof getRuntimeEnv).toBe('function');
  });

  it('exporta getRuntimeFlag como función', () => {
    expect(typeof getRuntimeFlag).toBe('function');
  });
});

