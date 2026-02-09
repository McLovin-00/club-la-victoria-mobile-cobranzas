/**
 * Mocks para Services
 * 
 * Provee mocks configurables para servicios externos.
 */

// =============================================================================
// MOCK DE WebSocket Service
// =============================================================================

export const createWebSocketServiceMock = () => {
  const connectFn = jest.fn();
  const disconnectFn = jest.fn();
  const onFn = jest.fn();
  const offFn = jest.fn();
  const emitFn = jest.fn();
  
  return {
    webSocketService: {
      connect: connectFn,
      disconnect: disconnectFn,
      on: onFn,
      off: offFn,
      emit: emitFn,
    },
    // Exportar para assertions
    __connectFn: connectFn,
    __disconnectFn: disconnectFn,
    __onFn: onFn,
    __offFn: offFn,
    __emitFn: emitFn,
  };
};

export const mockWebSocketService = createWebSocketServiceMock();

// =============================================================================
// MOCK DE RuntimeEnv
// =============================================================================

export const createRuntimeEnvMock = (overrides: Record<string, string> = {}) => {
  const defaultEnvs: Record<string, string> = {
    VITE_API_URL: 'http://localhost:3000',
    VITE_DOCUMENTOS_API_URL: 'http://localhost:4802',
    VITE_DOCUMENTOS_WS_URL: 'ws://localhost:4802',
    VITE_REMITOS_API_URL: 'http://localhost:4803',
    ...overrides,
  };

  const defaultFlags: Record<string, boolean> = {
    DEV: true,
    PROD: false,
  };

  return {
    getRuntimeEnv: (key: string) => defaultEnvs[key] || '',
    getRuntimeFlag: (key: string) => {
      if (Object.prototype.hasOwnProperty.call(defaultFlags, key)) {
        return defaultFlags[key];
      }
      return process.env[key] === 'true';
    },
  };
};

export const mockRuntimeEnv = createRuntimeEnvMock();

// =============================================================================
// MOCK DE Toast.utils
// =============================================================================

export const createToastUtilsMock = () => {
  const showToastFn = jest.fn();
  
  return {
    showToast: showToastFn,
    // Exportar para assertions
    __showToastFn: showToastFn,
  };
};

export const mockToastUtils = createToastUtilsMock();

// =============================================================================
// MOCK DE Logger (lib/utils)
// =============================================================================

export const createLoggerMock = () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
});

export const mockLogger = createLoggerMock();

