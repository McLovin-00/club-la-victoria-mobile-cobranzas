import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = String(value);
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const sessionStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => sessionStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageMock.store[key] = String(value);
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    sessionStorageMock.store = {};
  }),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

afterEach(() => {
  cleanup();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
