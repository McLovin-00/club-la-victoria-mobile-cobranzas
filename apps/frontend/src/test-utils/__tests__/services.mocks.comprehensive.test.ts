/**
 * Tests comprehensivos para services.mocks.ts
 * 
 * Verifica todas las funciones factory para crear mocks de servicios.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createWebSocketServiceMock,
  mockWebSocketService,
  createRuntimeEnvMock,
  mockRuntimeEnv,
  createToastUtilsMock,
  mockToastUtils,
  createLoggerMock,
  mockLogger,
} from '../mocks/services.mocks';

describe('services.mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebSocketServiceMock', () => {
    it('crea webSocketService con connect', () => {
      const mock = createWebSocketServiceMock();
      
      expect(typeof mock.webSocketService.connect).toBe('function');
    });

    it('crea webSocketService con disconnect', () => {
      const mock = createWebSocketServiceMock();
      
      expect(typeof mock.webSocketService.disconnect).toBe('function');
    });

    it('crea webSocketService con on', () => {
      const mock = createWebSocketServiceMock();
      
      expect(typeof mock.webSocketService.on).toBe('function');
    });

    it('crea webSocketService con off', () => {
      const mock = createWebSocketServiceMock();
      
      expect(typeof mock.webSocketService.off).toBe('function');
    });

    it('crea webSocketService con emit', () => {
      const mock = createWebSocketServiceMock();
      
      expect(typeof mock.webSocketService.emit).toBe('function');
    });

    it('exporta funciones mock para assertions', () => {
      const mock = createWebSocketServiceMock();
      
      expect(mock.__connectFn).toBeDefined();
      expect(mock.__disconnectFn).toBeDefined();
      expect(mock.__onFn).toBeDefined();
      expect(mock.__offFn).toBeDefined();
      expect(mock.__emitFn).toBeDefined();
    });

    it('connect es rastreable', () => {
      const mock = createWebSocketServiceMock();
      
      mock.webSocketService.connect('ws://localhost:3000');
      
      expect(mock.__connectFn).toHaveBeenCalledWith('ws://localhost:3000');
    });

    it('disconnect es rastreable', () => {
      const mock = createWebSocketServiceMock();
      
      mock.webSocketService.disconnect();
      
      expect(mock.__disconnectFn).toHaveBeenCalled();
    });

    it('on es rastreable', () => {
      const callback = jest.fn();
      const mock = createWebSocketServiceMock();
      
      mock.webSocketService.on('message', callback);
      
      expect(mock.__onFn).toHaveBeenCalledWith('message', callback);
    });

    it('off es rastreable', () => {
      const callback = jest.fn();
      const mock = createWebSocketServiceMock();
      
      mock.webSocketService.off('message', callback);
      
      expect(mock.__offFn).toHaveBeenCalledWith('message', callback);
    });

    it('emit es rastreable', () => {
      const mock = createWebSocketServiceMock();
      
      mock.webSocketService.emit('event', { data: 'test' });
      
      expect(mock.__emitFn).toHaveBeenCalledWith('event', { data: 'test' });
    });
  });

  describe('mockWebSocketService', () => {
    it('es una instancia pre-creada', () => {
      expect(mockWebSocketService.webSocketService).toBeDefined();
      expect(mockWebSocketService.__connectFn).toBeDefined();
    });
  });

  describe('createRuntimeEnvMock', () => {
    it('crea getRuntimeEnv que retorna valores por defecto', () => {
      const mock = createRuntimeEnvMock();
      
      expect(mock.getRuntimeEnv('VITE_API_URL')).toBe('http://localhost:3000');
      expect(mock.getRuntimeEnv('VITE_DOCUMENTOS_API_URL')).toBe('http://localhost:4802');
      expect(mock.getRuntimeEnv('VITE_DOCUMENTOS_WS_URL')).toBe('ws://localhost:4802');
      expect(mock.getRuntimeEnv('VITE_REMITOS_API_URL')).toBe('http://localhost:4803');
    });

    it('getRuntimeEnv retorna string vacío para claves no definidas', () => {
      const mock = createRuntimeEnvMock();
      
      expect(mock.getRuntimeEnv('UNKNOWN_KEY')).toBe('');
    });

    it('crea getRuntimeFlag que retorna valores por defecto', () => {
      const mock = createRuntimeEnvMock();
      
      expect(mock.getRuntimeFlag('DEV')).toBe(true);
      expect(mock.getRuntimeFlag('PROD')).toBe(false);
    });

    it('getRuntimeFlag retorna false para claves no definidas', () => {
      const mock = createRuntimeEnvMock();
      
      expect(mock.getRuntimeFlag('UNKNOWN_FLAG')).toBe(false);
    });

    it('permite override de valores', () => {
      const mock = createRuntimeEnvMock({
        VITE_API_URL: 'http://custom:5000',
        CUSTOM_VAR: 'custom-value',
      });
      
      expect(mock.getRuntimeEnv('VITE_API_URL')).toBe('http://custom:5000');
      expect(mock.getRuntimeEnv('CUSTOM_VAR')).toBe('custom-value');
    });
  });

  describe('mockRuntimeEnv', () => {
    it('es una instancia pre-creada', () => {
      expect(mockRuntimeEnv.getRuntimeEnv).toBeDefined();
      expect(mockRuntimeEnv.getRuntimeFlag).toBeDefined();
    });

    it('getRuntimeEnv funciona correctamente', () => {
      expect(mockRuntimeEnv.getRuntimeEnv('VITE_API_URL')).toBe('http://localhost:3000');
    });
  });

  describe('createToastUtilsMock', () => {
    it('crea showToast como función mock', () => {
      const mock = createToastUtilsMock();
      
      expect(typeof mock.showToast).toBe('function');
    });

    it('exporta __showToastFn para assertions', () => {
      const mock = createToastUtilsMock();
      
      expect(mock.__showToastFn).toBeDefined();
      expect(jest.isMockFunction(mock.__showToastFn)).toBe(true);
    });

    it('showToast es rastreable', () => {
      const mock = createToastUtilsMock();
      
      mock.showToast({ type: 'error', message: 'Error!' });
      
      expect(mock.__showToastFn).toHaveBeenCalledWith({ type: 'error', message: 'Error!' });
    });

    it('múltiples llamadas son rastreables', () => {
      const mock = createToastUtilsMock();
      
      mock.showToast({ id: 1 });
      mock.showToast({ id: 2 });
      mock.showToast({ id: 3 });
      
      expect(mock.__showToastFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('mockToastUtils', () => {
    it('es una instancia pre-creada', () => {
      expect(mockToastUtils.showToast).toBeDefined();
      expect(mockToastUtils.__showToastFn).toBeDefined();
    });
  });

  describe('createLoggerMock', () => {
    it('crea Logger con debug', () => {
      const mock = createLoggerMock();
      
      expect(typeof mock.Logger.debug).toBe('function');
    });

    it('crea Logger con info', () => {
      const mock = createLoggerMock();
      
      expect(typeof mock.Logger.info).toBe('function');
    });

    it('crea Logger con warn', () => {
      const mock = createLoggerMock();
      
      expect(typeof mock.Logger.warn).toBe('function');
    });

    it('crea Logger con error', () => {
      const mock = createLoggerMock();
      
      expect(typeof mock.Logger.error).toBe('function');
    });

    it('debug es rastreable', () => {
      const mock = createLoggerMock();
      
      mock.Logger.debug('Debug message', { extra: 'data' });
      
      expect(mock.Logger.debug).toHaveBeenCalledWith('Debug message', { extra: 'data' });
    });

    it('info es rastreable', () => {
      const mock = createLoggerMock();
      
      mock.Logger.info('Info message');
      
      expect(mock.Logger.info).toHaveBeenCalledWith('Info message');
    });

    it('warn es rastreable', () => {
      const mock = createLoggerMock();
      
      mock.Logger.warn('Warning message');
      
      expect(mock.Logger.warn).toHaveBeenCalledWith('Warning message');
    });

    it('error es rastreable', () => {
      const mock = createLoggerMock();
      const error = new Error('Test error');
      
      mock.Logger.error('Error occurred', error);
      
      expect(mock.Logger.error).toHaveBeenCalledWith('Error occurred', error);
    });

    it('todas las funciones son mocks de Jest', () => {
      const mock = createLoggerMock();
      
      expect(jest.isMockFunction(mock.Logger.debug)).toBe(true);
      expect(jest.isMockFunction(mock.Logger.info)).toBe(true);
      expect(jest.isMockFunction(mock.Logger.warn)).toBe(true);
      expect(jest.isMockFunction(mock.Logger.error)).toBe(true);
    });
  });

  describe('mockLogger', () => {
    it('es una instancia pre-creada', () => {
      expect(mockLogger.Logger).toBeDefined();
      expect(mockLogger.Logger.debug).toBeDefined();
      expect(mockLogger.Logger.info).toBeDefined();
      expect(mockLogger.Logger.warn).toBeDefined();
      expect(mockLogger.Logger.error).toBeDefined();
    });
  });
});

