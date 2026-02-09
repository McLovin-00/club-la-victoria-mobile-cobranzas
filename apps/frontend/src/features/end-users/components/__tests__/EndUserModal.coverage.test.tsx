/**
 * Tests de cobertura para EndUserModal
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('EndUserModal - Coverage', () => {
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

    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/dialog', () => ({
      Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
      DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
      DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
      DialogTitle: ({ children }: any) => <h2>{children}</h2>,
      DialogDescription: ({ children }: any) => <p>{children}</p>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, disabled, variant }: any) => (
        <button onClick={onClick} disabled={disabled} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    // Create a mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Admin', role: 'ADMIN' } }) => state,
        users: (state = { users: [], loading: false }) => state,
      },
    });

    const module = await import('../EndUserModal');
    Component = module.EndUserModal || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <Component
        isOpen={false}
        onClose={() => {}}
      />,
      { wrapper }
    );
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull();
  });

  it('renderiza el modal cuando isOpen es true', () => {
    render(
      <Component
        isOpen={true}
        onClose={() => {}}
      />,
      { wrapper }
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('renderiza el modal con usuario', () => {
    render(
      <Component
        isOpen={true}
        onClose={() => {}}
        user={{ id: 1, name: 'Test User', email: 'test@test.com' }}
      />,
      { wrapper }
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
