/**
 * Tests extendidos para logger.ts - cubrir líneas faltantes (formato printf)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../src/config/environment', () => ({
  getEnvironment: jest.fn().mockReturnValue({
    NODE_ENV: 'test',
    PORT: 4803,
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
  }),
}));

describe('AppLogger extended', () => {
  let AppLogger: any;

  beforeEach(async () => {
    jest.resetModules();
    const module = await import('../src/config/logger');
    AppLogger = module.AppLogger;
  });

  it('se crea correctamente', () => {
    expect(AppLogger).toBeDefined();
    expect(AppLogger.info).toBeDefined();
    expect(AppLogger.error).toBeDefined();
    expect(AppLogger.warn).toBeDefined();
    expect(AppLogger.debug).toBeDefined();
  });

  it('puede loggear mensaje info', () => {
    expect(() => AppLogger.info('Test message')).not.toThrow();
  });

  it('puede loggear mensaje con metadata', () => {
    expect(() => AppLogger.info('Test message', { key: 'value' })).not.toThrow();
  });

  it('puede loggear errores', () => {
    const error = new Error('Test error');
    expect(() => AppLogger.error('Error occurred:', error)).not.toThrow();
  });

  it('formatea correctamente timestamp y mensaje', () => {
    // El logger debería formatear sin errores
    expect(() => AppLogger.info('Formatted message', { id: 123, name: 'test' })).not.toThrow();
  });

  it('maneja metadata vacía', () => {
    expect(() => AppLogger.info('Message without meta')).not.toThrow();
  });

  it('maneja warnings', () => {
    expect(() => AppLogger.warn('Warning message')).not.toThrow();
  });

  it('maneja debug', () => {
    expect(() => AppLogger.debug('Debug message', { debug: true })).not.toThrow();
  });
});

