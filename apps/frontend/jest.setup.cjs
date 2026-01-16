require('@testing-library/jest-dom');
const { configure } = require('@testing-library/react');
const { TextEncoder, TextDecoder } = require('util');

// Configure Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});

// Setup global TextEncoder/TextDecoder for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock import.meta.env for Vite
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        PROD: false,
        DEV: true,
        MODE: 'test',
        BASE_URL: '/',
        VITE_API_URL: 'http://localhost:3000',
      }
    }
  }
});

// Also add it to global for Node.js context
global.import = {
  meta: {
    env: {
      PROD: false,
      DEV: true,
      MODE: 'test',
      BASE_URL: '/',
      VITE_API_URL: 'http://localhost:3000',
    }
  }
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() { /* Mock: no-op for Jest testing environment */ }
  disconnect() { /* Mock: no-op for Jest testing environment */ }
  observe() { /* Mock: no-op for Jest testing environment */ }
  unobserve() { /* Mock: no-op for Jest testing environment */ }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() { /* Mock: no-op for Jest testing environment */ }
  disconnect() { /* Mock: no-op for Jest testing environment */ }
  observe() { /* Mock: no-op for Jest testing environment */ }
  unobserve() { /* Mock: no-op for Jest testing environment */ }
};

// Mock window.matchMedia
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

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
process.env.VITE_API_URL = 'http://localhost:3000';
process.env.VITE_APP_TITLE = 'Test App';

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Mock Redux store
jest.mock('./src/store/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(),
    subscribe: jest.fn(),
    replaceReducer: jest.fn(),
  },
}));

// Global test utilities
global.testUtils = {
  mockUser: {
    id: 1,
    email: 'test@example.com',
    nombre: 'Test',
    apellido: 'User',
    role: 'user',
    activo: true,
    empresa_id: 1,
  },
  mockAdmin: {
    id: 2,
    email: 'admin@example.com',
    nombre: 'Admin',
    apellido: 'User',
    role: 'admin',
    activo: true,
    empresa_id: 1,
  },
  mockEmpresa: {
    id: 1,
    nombre: 'Test Company',
    direccion: 'Test Address',
    telefono: '123456789',
    email: 'company@test.com',
    activo: true,
  },
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Global test timeout
jest.setTimeout(10000); 