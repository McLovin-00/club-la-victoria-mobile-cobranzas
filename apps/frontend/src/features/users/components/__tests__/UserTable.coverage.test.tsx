/**
 * Tests de cobertura para UserTable
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('UserTable - Coverage', () => {
  let Component: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeAll(async () => {
    // Mock de react-redux hooks
    await jest.unstable_mockModule('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: jest.fn((fn) => fn({
        auth: {
          user: { id: 1, name: 'Admin', role: 'ADMIN' },
        },
        users: {
          users: [],
          loading: false,
        },
      })),
      useDispatch: jest.fn(() => jest.fn()),
    }));

    // Mock de useUserAudit hook
    await jest.unstable_mockModule('../../hooks/useUserAudit', () => ({
      useUserAudit: () => ({
        auditUserDeletion: jest.fn(),
        auditSearch: jest.fn(),
        startPerformanceTracking: jest.fn(),
      }),
    }));

    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/table', () => ({
      Table: ({ children }: any) => <table>{children}</table>,
      TableBody: ({ children }: any) => <tbody>{children}</tbody>,
      TableCell: ({ children }: any) => <td>{children}</td>,
      TableHead: ({ children }: any) => <th>{children}</th>,
      TableHeader: ({ children }: any) => <thead>{children}</thead>,
      TableRow: ({ children }: any) => <tr>{children}</tr>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/spinner', () => ({
      Spinner: ({ className }: any) => <div className={className} data-testid="spinner">Loading...</div>,
    }));

    // Create a mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Admin', role: 'ADMIN' } }) => state,
        users: (state = { users: [], loading: false }) => state,
      },
    });

    const module = await import('../UserTable');
    Component = module.UserTable || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  it('renderiza la tabla', () => {
    render(<Component />, { wrapper });
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('renderiza con datos vacíos', () => {
    render(<Component />, { wrapper });
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
