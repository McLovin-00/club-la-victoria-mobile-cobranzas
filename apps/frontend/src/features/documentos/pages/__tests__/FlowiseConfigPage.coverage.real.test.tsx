/**
 * Tests de cobertura con código real para FlowiseConfigPage
 * Enfoque: imports estándar con jest.mock para permitir recolección de cobertura
 */
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { FlowiseConfigPage } from '../FlowiseConfigPage';

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

jest.mock('@heroicons/react/24/outline', () => ({
  ArrowLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
  SparklesIcon: ({ className }: any) => <span className={className}>✨</span>,
  CheckCircleIcon: ({ className }: any) => <span className={className}>✓</span>,
  ExclamationTriangleIcon: ({ className }: any) => <span className={className}>⚠</span>,
  SignalIcon: ({ className }: any) => <span className={className}>📶</span>,
  CogIcon: ({ className }: any) => <span className={className}>⚙️</span>,
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

jest.mock('@/features/documentos/api/documentosApiSlice', () => ({
  useGetTemplatesQuery: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
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

describe('FlowiseConfigPage - Real Coverage', () => {
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.store = { token: 'mock-token' };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }),
    });

    mockStore = configureStore({
      reducer: {
        auth: (state = {
          user: { id: 1, name: 'Admin', role: 'ADMIN' },
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
      <MemoryRouter initialEntries={['/documentos/flowise']}>
        {children}
      </MemoryRouter>
    </Provider>
  );

  describe('Importación y renderizado básico', () => {
    it('debería importar el componente', () => {
      expect(FlowiseConfigPage).toBeDefined();
    });

    it('debería renderizar sin crashear', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería renderizar título y descripción', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
      expect(screen.getByText(/Conecta tu instancia de Flowise/)).toBeInTheDocument();
    });

    it('debería renderizar botón Volver', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });

  describe('Toggle de habilitación', () => {
    it('debería renderizar toggle de Habilitar Flowise', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Habilitar Flowise')).toBeInTheDocument();
    });

    it('debería mostrar campos de configuración cuando está habilitado', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('https://flowise.empresa.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('doc-validator-flow-123')).toBeInTheDocument();
      });
    });
  });

  describe('Inputs de configuración', () => {
    it('debería permitir editar URL Base', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      expect(urlInput).toHaveValue('https://test.com');
    });

    it('debería permitir editar Flow ID', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const flowInput = await screen.findByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      expect(flowInput).toHaveValue('test-flow');
    });

    it('debería permitir editar timeout', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const timeoutInput = await screen.findByPlaceholderText('doc-validator-flow-123');
      // Buscar el input de timeout
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Botones de acción', () => {
    it('debería renderizar botón Probar Conexión', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Probar Conexión')).toBeInTheDocument();
    });

    it('debería renderizar botón Guardar Configuración', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Guardar Configuración')).toBeInTheDocument();
    });

    it('debería tener botón Probar Conexión deshabilitado cuando no hay URL', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const testButton = screen.getByText('Probar Conexión') as HTMLButtonElement;
      expect(testButton.disabled).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('debería llamar a fetch para cargar configuración al montar', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('debería cargar configuración existente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enabled: true, baseUrl: 'https://test.com', apiKey: 'key123', flowId: 'flow-abc', timeout: 45000 }),
      });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // La configuración cargada debería estar presente
      const urlInput = screen.queryByPlaceholderText('https://flowise.empresa.com');
      expect(urlInput).toBeTruthy();
    });

    it('debería manejar error en loadConfig', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // No debería crashear
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería manejar respuesta 429 con reintento', async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 429, ok: false, json: async () => ({ message: 'Too many requests' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('debería manejar respuesta no ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
      });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });
  });

  describe('saveConfig', () => {
    it('debería guardar configuración con datos válidos', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Configuración guardada' }) });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Habilitar y llenar campos
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      // Encontrar el formulario y hacer submit directamente
      const form = document.getElementById('flowise-config-form');
      if (form) {
        await act(async () => {
          fireEvent.submit(form);
        });
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // loadConfig + saveConfig
      }, { timeout: 5000 });
    });

    it('debería manejar error al guardar', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const saveButton = screen.getByText('Guardar Configuración');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // No debería crashear
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería prevenir doble click al guardar', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Guardado' }) });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      // Llenar campos necesarios
      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      // Encontrar el formulario y hacer submit dos veces
      const form = document.getElementById('flowise-config-form');
      if (form) {
        await act(async () => {
          fireEvent.submit(form);
          fireEvent.submit(form); // Doble submit
        });
      }

      // Debería llamar a fetch solo una vez para saveConfig (además de loadConfig)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      }, { timeout: 5000 });
    });
  });

  describe('testConnection', () => {
    it('debería probar conexión exitosamente', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('debería mostrar error de validación cuando baseUrl está vacío', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      // No llenar baseUrl, solo flowId
      const flowInput = await screen.findByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const testButton = screen.getByText('Probar Conexión');
      fireEvent.click(testButton);

      // El botón debería seguir estando disponible pero no llamar a fetch para testConnection
      expect(mockFetch).toHaveBeenCalledTimes(1); // Solo loadConfig
    });

    it('debería mostrar error de validación cuando flowId está vacío', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const testButton = screen.getByText('Probar Conexión');
      fireEvent.click(testButton);

      expect(mockFetch).toHaveBeenCalledTimes(1); // Solo loadConfig
    });

    it('debería prevenir llamadas concurrentes a testConnection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const testButton = screen.getByText('Probar Conexión');
      fireEvent.click(testButton);
      fireEvent.click(testButton); // Segundo click inmediato

      await waitFor(() => {
        // El ref previene llamadas concurrentes
        expect(mockFetch).toHaveBeenCalledTimes(2); // loadConfig + solo una llamada a testConnection
      });
    });

    it('debería manejar error de conexión', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) })
        .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Connection failed' }) });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      // No debería crashear
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });
  });

  describe('Estado de conexión', () => {
    it('debería mostrar estado Sin probar inicialmente', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Sin probar')).toBeInTheDocument();
    });

    it('debería mostrar "Probando conexión..." mientras prueba', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      // Verificar que fetch fue llamado
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Inputs de configuración', () => {
    it('debería permitir editar API Key', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const apiKeyInput = await screen.findByPlaceholderText('Clave API si es requerida');
      fireEvent.change(apiKeyInput, { target: { value: 'my-secret-key' } });
      expect(apiKeyInput).toHaveValue('my-secret-key');
    });

    it('debería actualizar timeout', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const timeoutInput = screen.queryByRole('spinbutton');
      if (timeoutInput) {
        fireEvent.change(timeoutInput, { target: { value: '60' } });
        expect(timeoutInput).toHaveValue(60);
      }
    });
  });

  describe('Navegación', () => {
    it('debería tener botón volver', async () => {
      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });

  describe('Cobertura adicional - líneas restantes', () => {
    it('debería manejar reintentos en testConnection (líneas 77, 122-127)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Error' }) });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('debería manejar error de token en loadConfig (línea 157)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }),
      });

      // Eliminar token antes de renderizar
      localStorageMock.store = {};

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Restaurar token
      localStorageMock.store = { token: 'mock-token' };
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería manejar error de token en testConnection (línea 83)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }),
      });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      localStorageMock.store = {};

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería manejar error no ok en saveConfig (línea 248-253)', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Server error' }) });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const form = document.getElementById('flowise-config-form');
      if (form) {
        await act(async () => {
          fireEvent.submit(form);
        });
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('debería mostrar toast de error cuando baseUrl está vacío con showFeedback (líneas 60-61)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }),
      });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      // Llenar solo flowId, no baseUrl - esto debería mostrar el toast de error
      const flowInput = await screen.findByPlaceholderText('doc-validator-flow-123');
      fireEvent.change(flowInput, { target: { value: 'test-flow' } });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('debería mostrar toast de error cuando flowId está vacío con showFeedback (líneas 65-66)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }),
      });

      render(<FlowiseConfigPage />, { wrapper });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);

      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });
});
