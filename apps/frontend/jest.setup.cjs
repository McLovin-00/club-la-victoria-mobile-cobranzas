/**
 * Jest Setup - Configuración global para tests del Frontend
 *
 * IMPORTANTE: Este archivo solo debe contener mocks de APIs del navegador
 * que JSDOM no provee. NO mockear lógica de negocio, stores, hooks o APIs aquí.
 *
 * Los mocks de lógica de negocio deben ser específicos por test usando:
 * - jest.mock() dentro de cada archivo de test
 * - Los helpers de ./src/test-utils/mocks/
 */

require('@testing-library/jest-dom');
const { configure } = require('@testing-library/react');
const { TextEncoder, TextDecoder } = require('util');

// Exponer `jest` global para modo ESM
global.jest = require('@jest/globals').jest;

// =============================================================================
// PATCHES PARA JSDOM (comportamientos parciales / no implementados)
// =============================================================================

// Silenciar específicamente el error de JSDOM:
// "Not implemented: window.getComputedStyle(elt, pseudoElt)"
const originalConsoleError = console.error;
console.error = (...args) => {
  const firstArg = args?.[0];
  const msg = typeof firstArg === 'string' ? firstArg : (firstArg?.message || '');
  if (msg && msg.includes('Not implemented: window.getComputedStyle')) {
    return;
  }
  return originalConsoleError(...args);
};

// getComputedStyle: JSDOM puede lanzar "Not implemented" cuando se usa con pseudo-elementos
// (dom-accessibility-api lo usa al resolver nombres accesibles).
const originalGetComputedStyle = window.getComputedStyle;
Object.defineProperty(window, 'getComputedStyle', {
  configurable: true,
  value: (elt, pseudoElt) => {
    try {
      return originalGetComputedStyle(elt, pseudoElt);
    } catch {
      return {
        getPropertyValue: () => '',
      };
    }
  },
});

// Configurar Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});

// =============================================================================
// POLYFILLS PARA JSDOM (APIs del navegador que no están disponibles)
// =============================================================================

// TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() { /* Mock: no-op for Jest testing environment */ }
  disconnect() { /* Mock: no-op for Jest testing environment */ }
  observe() { /* Mock: no-op for Jest testing environment */ }
  unobserve() { /* Mock: no-op for Jest testing environment */ }
};

// ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() { /* Mock: no-op for Jest testing environment */ }
  disconnect() { /* Mock: no-op for Jest testing environment */ }
  observe() { /* Mock: no-op for Jest testing environment */ }
  unobserve() { /* Mock: no-op for Jest testing environment */ }
};

// TransformStream (para MSW)
if (typeof global.TransformStream === 'undefined') {
  const { TransformStream: NodeTransformStream } = require('node:stream/web');
  global.TransformStream = NodeTransformStream;
}

// ReadableStream y WritableStream si no existen
if (typeof global.ReadableStream === 'undefined') {
  const { ReadableStream: NodeReadableStream } = require('node:stream/web');
  global.ReadableStream = NodeReadableStream;
}

if (typeof global.WritableStream === 'undefined') {
  const { WritableStream: NodeWritableStream } = require('node:stream/web');
  global.WritableStream = NodeWritableStream;
}

// BroadcastChannel (para MSW)
if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name) {
      this.name = name;
      this.listeners = [];
    }
    name = '';
    listeners = [];
    postMessage(data) {
      this.listeners.forEach(listener => listener({ data }));
    }
    addEventListener(listener) {
      this.listeners.push(listener);
    }
    removeEventListener(listener) {
      this.listeners = this.listeners.filter(l => l !== listener);
    }
    close() {
      this.listeners = [];
    }
  };
}

// matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] ?? null),
  setItem: jest.fn((key, value) => { localStorageMock.store[key] = String(value); }),
  removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
  clear: jest.fn(() => { localStorageMock.store = {}; }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// sessionStorage
const sessionStorageMock = {
  store: {},
  getItem: jest.fn((key) => sessionStorageMock.store[key] ?? null),
  setItem: jest.fn((key, value) => { sessionStorageMock.store[key] = String(value); }),
  removeItem: jest.fn((key) => { delete sessionStorageMock.store[key]; }),
  clear: jest.fn(() => { sessionStorageMock.store = {}; }),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// =============================================================================
// POLYFILLS PARA FETCH API (JSDOM no lo incluye por defecto)
// =============================================================================

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.map = new Map();
      if (init && typeof init === 'object') {
        for (const [k, v] of Object.entries(init)) {
          this.map.set(String(k).toLowerCase(), String(v));
        }
      }
    }
    append(k, v) { this.map.set(String(k).toLowerCase(), String(v)); }
    set(k, v) { this.map.set(String(k).toLowerCase(), String(v)); }
    get(k) { return this.map.get(String(k).toLowerCase()); }
    has(k) { return this.map.has(String(k).toLowerCase()); }
    delete(k) { this.map.delete(String(k).toLowerCase()); }
    forEach(cb) { this.map.forEach((v, k) => cb(v, k, this)); }
  };
}

if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : (input?.url || '');
      this.method = init.method || 'GET';
      this.headers = new global.Headers(init.headers);
      this.body = init.body;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new global.Headers(init.headers);
      this.statusText = init.statusText || '';
    }
    clone() {
      return new global.Response(this._body, {
        status: this.status,
        headers: this.headers,
        statusText: this.statusText,
      });
    }
    async json() {
      if (this._body == null) return {};
      if (typeof this._body === 'string') return JSON.parse(this._body);
      return this._body;
    }
    async text() {
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body ?? '');
    }
  };
}

// Mock global de fetch con respuesta por defecto
// NOTA: MSW sobrescribe esto en los tests que lo usan
global.fetch = jest.fn().mockImplementation(async () =>
  new global.Response('{}', { status: 200 })
);

// =============================================================================
// MOCK DE import.meta.env (Vite)
// =============================================================================

const mockEnv = {
  PROD: false,
  DEV: true,
  MODE: 'test',
  BASE_URL: '/',
  VITE_API_URL: 'http://localhost:3000',
  VITE_DOCUMENTOS_API_URL: 'http://localhost:4802',
  VITE_DOCUMENTOS_WS_URL: 'ws://localhost:4802',
  VITE_REMITOS_API_URL: 'http://localhost:4803',
};

Object.defineProperty(window, 'import', {
  value: { meta: { env: mockEnv } },
});

global.import = { meta: { env: mockEnv } };

// Variables de entorno de proceso
process.env.VITE_API_URL = 'http://localhost:3000';
process.env.VITE_APP_TITLE = 'Test App';
process.env.MODE = 'test';
process.env.VITE_DOCUMENTOS_API_URL = 'http://localhost:4802';
process.env.VITE_DOCUMENTOS_WS_URL = 'ws://localhost:4802';
process.env.VITE_REMITOS_API_URL = 'http://localhost:4803';

// =============================================================================
// LIMPIEZA DESPUÉS DE CADA TEST
// =============================================================================

afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// Timeout global para tests
jest.setTimeout(10000);
