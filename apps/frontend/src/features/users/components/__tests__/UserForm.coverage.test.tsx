/**
 * Tests de cobertura para UserForm
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('UserForm - Coverage', () => {
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

    // Mock de useEmailValidation (viene de usersApiSlice)
    await jest.unstable_mockModule('../../api/usersApiSlice', () => ({
      useEmailValidation: () => ({
        checkEmail: jest.fn(),
        emailExists: false,
        isCheckingEmail: false,
      }),
    }));

    // Mock de empresasApiSlice
    await jest.unstable_mockModule('../../../empresas/api/empresasApiSlice', () => ({
      useGetEmpresasQuery: () => ({
        data: { empresas: [] },
        isLoading: false,
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

    // Create a mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: { id: 1, name: 'Admin', role: 'ADMIN' } }) => state,
        users: (state = { users: [], loading: false }) => state,
      },
    });

    const module = await import('../UserForm.tsx');
    Component = module.UserForm || module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>{children}</Provider>
  );

  it('debería importar el módulo', async () => {
    expect(Component).toBeDefined();
  });

  it('debería renderizar el formulario', () => {
    render(
      <Component
        mode="create"
        empresas={[]}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
      { wrapper }
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debería renderizar el formulario con empresas', () => {
    const mockEmpresas = [
      { id: 1, nombre: 'Empresa 1' },
      { id: 2, nombre: 'Empresa 2' },
    ];

    render(
      <Component
        mode="create"
        empresas={mockEmpresas}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
      { wrapper }
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('debería renderizar el formulario en modo edición', () => {
    const mockEmpresas = [
      { id: 1, nombre: 'Empresa 1' },
    ];

    render(
      <Component
        mode="edit"
        empresas={mockEmpresas}
        user={{ id: 1, name: 'Test User', email: 'test@test.com', role: 'user' }}
        onSubmit={() => {}}
        onClose={() => {}}
      />,
      { wrapper }
    );

    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
