/**
 * Tests de cobertura con código real para NotificationsConfigPage
 * Enfoque: imports estándar con jest.mock para permitir recolección de cobertura
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import NotificationsConfigPage from '../NotificationsConfigPage';

// Mock de localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { localStorageMock.store[key] = String(value); }),
  removeItem: jest.fn((key: string) => { delete localStorageMock.store[key]; }),
  clear: jest.fn(() => { localStorageMock.store = {}; }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock de fetch
const mockFetch = jest.fn();
globalThis.fetch = mockFetch as any;

// Mock de componentes UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, type, form, className }: any) => (
    <button type={type || 'button'} form={form} disabled={disabled} onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

// Mock de Toast.utils
jest.mock('@/components/ui/Toast.utils', () => ({
  showToast: jest.fn(),
}));

// Mock de hooks
jest.mock('@/hooks/useRoleBasedNavigation', () => ({
  useRoleBasedNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

// Mock de runtimeEnv
jest.mock('@/lib/runtimeEnv', () => ({
  getRuntimeEnv: jest.fn((key: string) => {
    if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://test-api';
    return '';
  }),
}));

// Mock de logger
jest.mock('@/utils/logger', () => ({
  default: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('NotificationsConfigPage - Real Coverage', () => {
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.store = { token: 'mock-token' };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          enabled: true,
          windows: {
            aviso: { enabled: true, unit: 'days', value: 30 },
            alerta: { enabled: true, unit: 'days', value: 14 },
            alarma: { enabled: true, unit: 'days', value: 3 },
          },
          templates: {
            aviso: { chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
            alerta: { chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
            alarma: { chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
          },
        },
      }),
    });

    mockStore = configureStore({
      reducer: {
        auth: (state = {
          user: { id: 1, name: 'Admin', role: 'ADMIN', empresaId: 1 },
          token: 'mock-token',
          isAuthenticated: true,
        }) => state,
      },
    });
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <MemoryRouter initialEntries={['/documentos/notifications']}>
        {children}
      </MemoryRouter>
    </Provider>
  );

  describe('Importación y renderizado básico', () => {
    it('debería importar el componente', () => {
      expect(NotificationsConfigPage).toBeDefined();
    });

    it('debería renderizar sin crashear', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });

    it('debería renderizar título', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });

    it('debería renderizar botón Volver', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });

  describe('Configuración de ventanas', () => {
    it('debería mostrar checkboxes de aviso, alerta y alarma', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('aviso')).toBeInTheDocument();
      expect(screen.getByText('alerta')).toBeInTheDocument();
      expect(screen.getByText('alarma')).toBeInTheDocument();
    });

    it('debería mostrar selector de unidad', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  describe('Prueba de notificaciones', () => {
    it('debería tener input de MSISDN', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByPlaceholderText(/MSISDN/)).toBeInTheDocument();
    });

    it('debería tener input de mensaje', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByPlaceholderText(/Mensaje/)).toBeInTheDocument();
    });

    it('debería tener botón Probar', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Probar')).toBeInTheDocument();
    });

    it('debería enviar prueba de notificación', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { enabled: true, windows: {}, templates: {} } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const msisdnInput = screen.getByPlaceholderText(/MSISDN/);
      fireEvent.change(msisdnInput, { target: { value: '+54999999999' } });

      const testButton = screen.getByText('Probar');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Guardar configuración', () => {
    it('debería tener botón Guardar', async () => {
      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Guardar')).toBeInTheDocument();
    });

    it('debería guardar configuración', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { enabled: true, windows: {}, templates: {} } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      render(<NotificationsConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const saveButton = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
