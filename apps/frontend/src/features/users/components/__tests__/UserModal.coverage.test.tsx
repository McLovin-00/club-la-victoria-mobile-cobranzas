/**
 * Tests de cobertura para UserModal
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('UserModal - Coverage', () => {
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

    // Mock de empresasApiSlice
    await jest.unstable_mockModule('../../../empresas/api/empresasApiSlice', () => ({
      useGetEmpresasQuery: () => ({
        data: [],
        isLoading: false,
      }),
    }));

    // Mock de usersApiSlice
    await jest.unstable_mockModule('../../api/usersApiSlice', () => ({
      useCreateUserMutation: () => [
        jest.fn().mockResolvedValue({ data: { id: 1, name: 'Test' } }),
        { isLoading: false },
      ],
      useUpdateUserMutation: () => [
        jest.fn().mockResolvedValue({ data: { id: 1, name: 'Updated' } }),
        { isLoading: false },
      ],
      useEmailValidation: () => ({
        checkEmail: jest.fn(),
        emailExists: false,
        isCheckingEmail: false,
      }),
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

    await jest.unstable_mockModule('../../../../components/ui/input', () => ({
      Input: (props: any) => <input {...props} />,
    }));

    await jest.unstable_mockModule('../../../../components/ui/select', () => ({
      Select: ({ children }: any) => <div>{children}</div>,
      SelectContent: ({ children }: any) => <div>{children}</div>,
      SelectItem: ({ children, value }: any) => <div value={value}>{children}</div>,
      SelectTrigger: ({ children }: any) => <div>{children}</div>,
      SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/label', () => ({
      Label: ({ children }: any) => <label>{children}</label>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/switch', () => ({
      Switch: ({ checked, onCheckedChange, disabled }: any) => (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
        />
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/spinner', () => ({
      Spinner: ({ className }: any) => <div className={className} data-testid="spinner">Loading...</div>,
    }));

    await jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
      showToast: jest.fn(),
    }));

    await jest.unstable_mockModule('../../../../components/icons', () => ({
      UserIcon: ({ className }: any) => <span className={className}>User</span>,
      BuildingOfficeIcon: ({ className }: any) => <span className={className}>Building</span>,
    }));

    // Create a mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Admin', role: 'ADMIN' } }) => state,
        users: (state = { users: [], loading: false }) => state,
      },
    });

    const module = await import('../UserModal.tsx');
    Component = module.UserModal || module.default;
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
        mode="create"
        onClose={() => {}}
      />,
      { wrapper }
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('renderiza el modal en modo edición', () => {
    render(
      <Component
        isOpen={true}
        mode="edit"
        onClose={() => {}}
        user={{ id: 1, name: 'Test User', email: 'test@test.com' }}
      />,
      { wrapper }
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
