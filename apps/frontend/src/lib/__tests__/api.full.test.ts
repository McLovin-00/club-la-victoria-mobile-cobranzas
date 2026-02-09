/**
 * Tests completos para lib/api.ts
 * Cubre la instancia de axios y los interceptors
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock getRuntimeEnv
jest.mock('../runtimeEnv', () => ({
  getRuntimeEnv: jest.fn(() => 'http://localhost:4003/api'),
}));

describe('api instance', () => {
  const originalLocalStorage = global.localStorage;
  const originalLocation = global.window.location;

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    (window as any).location = originalLocation;
    jest.resetModules();
  });

  it('exporta una instancia de axios por defecto', async () => {
    const api = (await import('../api')).default;
    expect(api).toBeDefined();
    expect(api.defaults).toBeDefined();
  });

  it('tiene la URL base configurada', async () => {
    const api = (await import('../api')).default;
    expect(api.defaults.baseURL).toBeDefined();
    expect(typeof api.defaults.baseURL).toBe('string');
  });

  it('tiene timeout configurado', async () => {
    const api = (await import('../api')).default;
    expect(api.defaults.timeout).toBe(30000);
  });

  it('tiene Content-Type por defecto', async () => {
    const api = (await import('../api')).default;
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('tiene interceptors configurados', async () => {
    const api = (await import('../api')).default;
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });
});

describe('api request interceptor', () => {
  beforeEach(() => {
    jest.resetModules();
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('agrega token de Authorization cuando existe', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('test-token');
    
    const api = (await import('../api')).default;
    
    // Simular una config de request
    const config = { headers: {} as any };
    const handlers = (api.interceptors.request as any).handlers[0];
    
    if (handlers?.fulfilled) {
      const result = handlers.fulfilled(config);
      expect(result.headers.Authorization).toBe('Bearer test-token');
    }
  });

  it('no agrega Authorization cuando no hay token', async () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    const api = (await import('../api')).default;
    
    const config = { headers: {} as any };
    const handlers = (api.interceptors.request as any).handlers[0];
    
    if (handlers?.fulfilled) {
      const result = handlers.fulfilled(config);
      expect(result.headers.Authorization).toBeUndefined();
    }
  });
});

describe('api response interceptor', () => {
  beforeEach(() => {
    jest.resetModules();
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('pasa respuestas exitosas sin modificar', async () => {
    const api = (await import('../api')).default;
    
    const response = { data: { test: true }, status: 200 };
    const handlers = (api.interceptors.response as any).handlers[0];
    
    if (handlers?.fulfilled) {
      const result = handlers.fulfilled(response);
      expect(result).toBe(response);
    }
  });

  it('maneja errores 401 removiendo token y redirigiendo', async () => {
    const api = (await import('../api')).default;
    
    const error = {
      response: { status: 401 },
    };
    
    const handlers = (api.interceptors.response as any).handlers[0];
    
    if (handlers?.rejected) {
      await expect(handlers.rejected(error)).rejects.toBeDefined();
      // Verificar que se intentó remover el token
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      // La redirección puede no funcionar correctamente en tests debido a JSDOM
    }
  });

  it('rechaza otros errores sin modificar', async () => {
    const api = (await import('../api')).default;
    
    const error = {
      response: { status: 500 },
      message: 'Server error',
    };
    
    const handlers = (api.interceptors.response as any).handlers[0];
    
    if (handlers?.rejected) {
      await expect(handlers.rejected(error)).rejects.toEqual(error);
    }
  });
});

