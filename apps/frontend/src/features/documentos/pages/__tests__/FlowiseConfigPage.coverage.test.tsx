/**
 * Tests de cobertura para FlowiseConfigPage
 * Basado en AuditLogsPage.coverage.test.tsx
 */
import React from 'react';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('FlowiseConfigPage - Coverage', () => {
  let Component: React.FC<any>;
  let mockStore: ReturnType<typeof configureStore>;

  beforeAll(async () => {
    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, disabled, onClick, type, form }: any) => (
        <button type={type || 'button'} form={form} disabled={disabled} onClick={onClick}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ArrowLeftIcon: () => <span>◀</span>,
      SparklesIcon: () => <span>✨</span>,
      CheckCircleIcon: () => <span>✓</span>,
      XCircleIcon: () => <span>✗</span>,
      CogIcon: () => <span>⚙️</span>,
      ExclamationTriangleIcon: () => <span>⚠</span>,
      SignalIcon: () => <span>📶</span>,
    }));

    // Mock de Toast.utils
    await jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
      showToast: jest.fn(),
    }));

    // Mock de useRoleBasedNavigation
    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({
        goBack: jest.fn(),
      }),
    }));

    // Mock de logger
    await jest.unstable_mockModule('../../../../utils/logger', () => ({
      default: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      },
    }));

    // Mock de runtimeEnv
    await jest.unstable_mockModule('../../../../lib/runtimeEnv', () => ({
      getRuntimeEnv: jest.fn((key: string) => {
        if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://test-api';
        return '';
      }),
    }));

    // Create mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = {
          user: { id: 1, name: 'Admin', role: 'ADMIN' },
          token: 'mock-token',
          isAuthenticated: true,
        }) => state,
      },
    });

    const module = await import('../FlowiseConfigPage.tsx');
    Component = module.default || module.FlowiseConfigPage;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <MemoryRouter initialEntries={['/documentos/flowise']}>
        {children}
      </MemoryRouter>
    </Provider>
  );

  describe('Smoke', () => {
    it('debería importar el componente', () => {
      expect(Component).toBeDefined();
    });

    it('debería renderizar sin crashear', () => {
      render(<Component />, { wrapper });
    });
  });

  describe('Render', () => {
    it('debería renderizar título Configuración Flowise', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería renderizar botón Volver', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });

    it('debería renderizar toggle Habilitar Flowise', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Habilitar Flowise')).toBeInTheDocument();
    });

    it('debería renderizar botón Probar Conexión', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Probar Conexión')).toBeInTheDocument();
    });

    it('debería renderizar botón Guardar Configuración', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Guardar Configuración')).toBeInTheDocument();
    });

    it('debería renderizar estado Sin probar', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Sin probar')).toBeInTheDocument();
    });

    it('debería renderizar campos de configuración cuando enabled=true', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      // Find the toggle button (it's the button with the toggle class)
      const buttons = screen.getAllByRole('button');
      // The toggle is the 2nd button (after "Volver")
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('URL Base de Flowise')).toBeInTheDocument();
      expect(screen.getByText('API Key (Opcional)')).toBeInTheDocument();
      expect(screen.getByText('Flow ID')).toBeInTheDocument();
      expect(screen.getByText('Timeout (segundos)')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('debería permitir escribir en baseUrl', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      // Toggle enabled first to show the field
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(input, { target: { value: 'https://nueva-url.com' } });
      expect(input).toHaveValue('https://nueva-url.com');
    });

    it('debería permitir escribir en flowId', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      // Toggle enabled first to show the field
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);
      
      const input = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(input, { target: { value: 'nuevo-flow' } });
      expect(input).toHaveValue('nuevo-flow');
    });
  });

  describe('Status', () => {
    it('debería mostrar icono de estado sin probar en el card de estado', async () => {
      render(<Component />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      // Find the status icon inside the connection status card
      const card = screen.getByText('Sin probar').closest('.mb-8');
      expect(card).toBeInTheDocument();
    });
  });
});
