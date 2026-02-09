import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { logger, setLogLevel } from '../logger';

describe('logger', () => {
  let consoleSpy: { debug: any; info: any; warn: any; error: any };

  beforeEach(() => {
    consoleSpy = {
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset to default
    setLogLevel('debug');
  });

  it('setLogLevel cambia el nivel de log', () => {
    setLogLevel('error');
    logger.debug('test');
    logger.info('test');
    logger.warn('test');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
    
    logger.error('error test');
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('nivel silent no loguea nada', () => {
    setLogLevel('silent');
    logger.debug('test');
    logger.info('test');
    logger.warn('test');
    logger.error('test');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
    expect(consoleSpy.error).not.toHaveBeenCalled();
  });

  it('nivel debug loguea todo', () => {
    setLogLevel('debug');
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');
    expect(consoleSpy.debug).toHaveBeenCalled();
    expect(consoleSpy.info).toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('nivel info no loguea debug', () => {
    setLogLevel('info');
    logger.debug('debug msg');
    logger.info('info msg');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).toHaveBeenCalled();
  });

  it('nivel warn no loguea debug ni info', () => {
    setLogLevel('warn');
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalled();
  });
});

