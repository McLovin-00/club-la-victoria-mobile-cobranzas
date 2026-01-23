/**
 * Tests for UserTable.lazy.tsx - Lazy loading, Skeleton, and Performance hooks
 *
 * Coverage targets:
 * - UserTableLazy component
 * - UserTableSkeleton component
 * - useUserTablePerformance hook
 * - usePreloadUserTable hook
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock PerformanceObserver globally before any tests
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

// Create a mock PerformanceObserver
class MockPerformanceObserver {
  private callback: (list: { getEntries: () => PerformanceEntry[] }) => void;

  constructor(callback: (list: { getEntries: () => PerformanceEntry[] }) => void) {
    this.callback = callback;
  }

  observe(options: PerformanceObserverInit) {
    mockObserve(options);
  }

  disconnect() {
    mockDisconnect();
  }

  takeRecords() {
    return [];
  }
}

// Assign mock globally
globalThis.PerformanceObserver = MockPerformanceObserver as unknown as typeof PerformanceObserver;

// Mock implementations
let mockLoggerDebug: jest.Mock;
let mockLoggerError: jest.Mock;
let mockLoggerWarn: jest.Mock;
let mockLoggerPerformance: jest.Mock;

describe('UserTable.lazy - Lazy Loading & Skeleton', () => {
  let UserTableLazy: React.FC<{
    enablePerformanceMonitoring?: boolean;
    enablePreloading?: boolean;
  }>;
  let useUserTablePerformance: (enabled?: boolean) => void;
  let usePreloadUserTable: (enabled?: boolean) => void;

  beforeAll(async () => {
    // Initialize mocks
    mockLoggerDebug = jest.fn();
    mockLoggerError = jest.fn();
    mockLoggerWarn = jest.fn();
    mockLoggerPerformance = jest.fn();

    // Mock Logger
    jest.unstable_mockModule('../../../../lib/utils', () => ({
      Logger: {
        debug: (...args: unknown[]) => mockLoggerDebug(...args),
        error: (...args: unknown[]) => mockLoggerError(...args),
        warn: (...args: unknown[]) => mockLoggerWarn(...args),
        info: jest.fn(),
        performance: (...args: unknown[]) => mockLoggerPerformance(...args),
      },
    }));

    // Mock Card and Spinner UI components
    jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="card" className={className}>
          {children}
        </div>
      ),
    }));

    jest.unstable_mockModule('../../../../components/ui/spinner', () => ({
      Spinner: ({ className }: { className?: string }) => (
        <div data-testid="spinner" className={className}>
          Loading...
        </div>
      ),
    }));

    // Mock the UserTable component that gets lazy-loaded
    jest.unstable_mockModule('../UserTable', () => ({
      UserTable: () => <div data-testid="user-table-loaded">UserTable Loaded</div>,
    }));

    // Import the lazy component AFTER mocking
    const module = await import('../UserTable.lazy');
    UserTableLazy = module.UserTableLazy;
    useUserTablePerformance = module.useUserTablePerformance;
    usePreloadUserTable = module.usePreloadUserTable;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('UserTableLazy Component', () => {
    it('renders with default props', async () => {
      render(<UserTableLazy />);

      await waitFor(() => {
        expect(screen.getByTestId('user-table-loaded')).toBeTruthy();
      });
    });

    it('renders with performance monitoring enabled', async () => {
      render(<UserTableLazy enablePerformanceMonitoring={true} enablePreloading={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-table-loaded')).toBeTruthy();
      });
    });

    it('renders with preloading enabled', async () => {
      render(<UserTableLazy enablePerformanceMonitoring={false} enablePreloading={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-table-loaded')).toBeTruthy();
      });
    });

    it('renders with all features disabled', async () => {
      render(<UserTableLazy enablePerformanceMonitoring={false} enablePreloading={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('user-table-loaded')).toBeTruthy();
      });
    });

    it('eventually loads the UserTable component', async () => {
      render(<UserTableLazy enablePerformanceMonitoring={false} enablePreloading={false} />);

      await waitFor(() => {
        const loadedComponent = screen.getByTestId('user-table-loaded');
        expect(loadedComponent.textContent).toBe('UserTable Loaded');
      });
    });
  });

  describe('useUserTablePerformance hook', () => {
    const TestComponent: React.FC<{ enabled: boolean }> = ({ enabled }) => {
      useUserTablePerformance(enabled);
      return <div data-testid="test-component">Test</div>;
    };

    it('sets up performance observer when enabled', () => {
      render(<TestComponent enabled={true} />);

      expect(mockObserve).toHaveBeenCalledWith({ entryTypes: ['measure', 'navigation'] });
    });

    it('does not set up observer when disabled', () => {
      mockObserve.mockClear();
      render(<TestComponent enabled={false} />);

      expect(mockObserve).not.toHaveBeenCalled();
    });

    it('disconnects observer on cleanup', () => {
      const { unmount } = render(<TestComponent enabled={true} />);

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('renders component correctly with hook', () => {
      render(<TestComponent enabled={true} />);

      expect(screen.getByTestId('test-component').textContent).toBe('Test');
    });
  });

  describe('usePreloadUserTable hook', () => {
    const TestPreloadComponent: React.FC<{ enabled: boolean }> = ({ enabled }) => {
      usePreloadUserTable(enabled);
      return <div data-testid="preload-test">Test</div>;
    };

    it('triggers preload after timeout when enabled', async () => {
      render(<TestPreloadComponent enabled={true} />);

      // Advance timer to trigger preload (3000ms)
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      // Check that debug was called for preload initiation
      expect(mockLoggerDebug).toHaveBeenCalledWith('Iniciando preload de UserTable');
    });

    it('does not trigger preload when disabled', async () => {
      render(<TestPreloadComponent enabled={false} />);

      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      // Should not have been called with preload message
      const preloadCalls = mockLoggerDebug.mock.calls.filter(
        (call: unknown[]) => call[0] === 'Iniciando preload de UserTable'
      );
      expect(preloadCalls.length).toBe(0);
    });

    it('clears timeout on unmount', () => {
      const { unmount } = render(<TestPreloadComponent enabled={true} />);

      // Unmount before timeout
      unmount();

      // Advance timer - should not trigger preload since component unmounted
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // The debug call for "Iniciando preload" should have been called 0 times
      // because clearTimeout was called
      const preloadInitCalls = mockLoggerDebug.mock.calls.filter(
        (call: unknown[]) => call[0] === 'Iniciando preload de UserTable'
      );
      expect(preloadInitCalls.length).toBe(0);
    });

    it('adds mouseenter event listeners to navigation elements', () => {
      // Create a mock navigation element
      const mockNav = document.createElement('a');
      mockNav.href = '/usuarios';
      document.body.appendChild(mockNav);

      const addEventListenerSpy = jest.spyOn(mockNav, 'addEventListener');

      render(<TestPreloadComponent enabled={true} />);

      // Should add mouseenter listener
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function),
        { once: true }
      );

      // Cleanup
      document.body.removeChild(mockNav);
      addEventListenerSpy.mockRestore();
    });

    it('removes event listeners on cleanup', () => {
      const mockNav = document.createElement('a');
      mockNav.href = '/usuarios';
      document.body.appendChild(mockNav);

      const removeEventListenerSpy = jest.spyOn(mockNav, 'removeEventListener');

      const { unmount } = render(<TestPreloadComponent enabled={true} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mouseenter',
        expect.any(Function)
      );

      document.body.removeChild(mockNav);
      removeEventListenerSpy.mockRestore();
    });

    it('renders component correctly with hook', () => {
      render(<TestPreloadComponent enabled={true} />);

      expect(screen.getByTestId('preload-test').textContent).toBe('Test');
    });
  });
});

describe('UserTableLazy Exports', () => {
  it('exports all required components and hooks', async () => {
    // Mock dependencies first
    jest.unstable_mockModule('../../../../lib/utils', () => ({
      Logger: {
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        performance: jest.fn(),
      },
    }));

    jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    jest.unstable_mockModule('../../../../components/ui/spinner', () => ({
      Spinner: () => <div>Loading</div>,
    }));

    const module = await import('../UserTable.lazy');

    // Check that all exports exist
    expect(module.default).toBeDefined();
    expect(module.UserTableLazy).toBeDefined();
    expect(module.useUserTablePerformance).toBeDefined();
    expect(module.usePreloadUserTable).toBeDefined();
  });

  it('default export is the UserTableLazy component', async () => {
    jest.unstable_mockModule('../../../../lib/utils', () => ({
      Logger: {
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        performance: jest.fn(),
      },
    }));

    const module = await import('../UserTable.lazy');

    expect(module.default).toBe(module.UserTableLazy);
  });
});

describe('useUserTablePerformance - callback behavior', () => {
  it('hook is callable with boolean parameter', async () => {
    // Verify the hook can be called with true/false
    const module = await import('../UserTable.lazy');
    expect(typeof module.useUserTablePerformance).toBe('function');
  });
});
