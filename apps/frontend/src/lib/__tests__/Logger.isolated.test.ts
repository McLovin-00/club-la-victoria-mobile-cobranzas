/**
 * Tests aislados del Logger con mocks de ambiente
 * Usa jest.isolateModulesAsync para mockear isDevelopment/isProduction
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Logger con isDevelopment = true', () => {
  let consoleSpy: {
    log: jest.SpiedFunction<typeof console.log>;
    warn: jest.SpiedFunction<typeof console.warn>;
    error: jest.SpiedFunction<typeof console.error>;
    debug: jest.SpiedFunction<typeof console.debug>;
    group: jest.SpiedFunction<typeof console.group>;
    groupEnd: jest.SpiedFunction<typeof console.groupEnd>;
    table: jest.SpiedFunction<typeof console.table>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      group: jest.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: jest.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      table: jest.spyOn(console, 'table').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  it('Logger.log formatea objetos y loguea en desarrollo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'DEV',
      }));
      
      const { Logger } = await import('../utils');
      const obj = { key: 'value', nested: { deep: true } };
      Logger.log(obj);
      expect(consoleSpy.log).toHaveBeenCalled();
      const logCall = consoleSpy.log.mock.calls[0][0];
      expect(logCall).toContain('key');
    });
  });

  it('Logger.warn loguea en desarrollo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'DEV',
      }));
      
      const { Logger } = await import('../utils');
      Logger.warn('warning message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('warning message');
    });
  });

  it('Logger.error loguea con detalles completos en desarrollo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'DEV',
      }));
      
      const { Logger } = await import('../utils');
      Logger.error('error', { detail: 'info' });
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  it('Logger.debug formatea y loguea en desarrollo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'DEV',
      }));
      
      const { Logger } = await import('../utils');
      Logger.debug('debug', { obj: true });
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  it('Logger.api loguea con datos en desarrollo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'DEV',
      }));
      
      const { Logger } = await import('../utils');
      Logger.api('GET /users', { status: 200 });
      expect(consoleSpy.log).toHaveBeenCalledWith('[API] GET /users', { status: 200 });
    });
  });

  it('Logger.performance usa group/table en desarrollo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'DEV',
      }));
      
      const { Logger } = await import('../utils');
      Logger.performance('Load time', { ms: 100 });
      expect(consoleSpy.group).toHaveBeenCalled();
      expect(consoleSpy.table).toHaveBeenCalledWith({ ms: 100 });
      expect(consoleSpy.groupEnd).toHaveBeenCalled();
    });
  });

  it('Logger.audit usa group en desarrollo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'DEV',
      }));
      
      const { Logger } = await import('../utils');
      Logger.audit('user_login', { userId: 1 });
      expect(consoleSpy.group).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.groupEnd).toHaveBeenCalled();
    });
  });
});

describe('Logger funciones adicionales', () => {
  let consoleSpy: {
    log: jest.SpiedFunction<typeof console.log>;
    warn: jest.SpiedFunction<typeof console.warn>;
    error: jest.SpiedFunction<typeof console.error>;
    debug: jest.SpiedFunction<typeof console.debug>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  it('Logger.error siempre loguea algo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: () => false,
      }));
      
      const { Logger } = await import('../utils');
      Logger.error('test error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  it('Logger.error maneja objetos', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: () => false,
      }));
      
      const { Logger } = await import('../utils');
      Logger.error({ sensitiveData: 'secret' });
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  it('Logger.error maneja strings con keywords sensibles', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: () => false,
      }));
      
      const { Logger } = await import('../utils');
      Logger.error('Error with token: abc123');
      Logger.error('password: secret123');
      Logger.error('JWT verification failed');
      Logger.error('Bearer eyJhbG...');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  it('Logger.api loguea mensajes', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: () => false,
      }));
      
      const { Logger } = await import('../utils');
      Logger.api('GET /users');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  it('Logger.api con datos loguea algo', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: () => false,
      }));
      
      const { Logger } = await import('../utils');
      Logger.api('request', { headers: { authorization: 'Bearer secret' } });
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  it('Logger.audit loguea en cualquier ambiente', async () => {
    await jest.isolateModulesAsync(async () => {
      await jest.unstable_mockModule('../runtimeEnv', () => ({
        getRuntimeFlag: (key: string) => key === 'PROD',
      }));
      
      const { Logger } = await import('../utils');
      Logger.audit('critical_action');
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});

