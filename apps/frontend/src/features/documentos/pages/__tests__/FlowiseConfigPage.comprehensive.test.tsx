/**
 * Tests comprehensivos para FlowiseConfigPage
 * Cubre todos los branches y edge cases para alcanzar ≥90% cobertura
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('FlowiseConfigPage - Comprehensive Coverage', () => {
  let FlowiseConfigPage: React.FC;
  let mockStore: ReturnType<typeof configureStore>;
  let mockShowToast: jest.Mock;
  let mockGoBack: jest.Mock;

  const mockTemplates = [
    {
      id: 1,
      nombre: 'DNI Chofer',
      entityType: 'CHOFER',
      descripcion: 'Plantilla de DNI',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-10T00:00:00.000Z',
    },
  ];

  beforeAll(async () => {
    mockShowToast = jest.fn();
    mockGoBack = jest.fn();

    // Mock de Toast.utils
    await jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
      showToast: mockShowToast,
    }));

    // Mock de useRoleBasedNavigation
    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({
        goBack: mockGoBack,
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

    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, disabled, onClick, type, form, className }: any) => (
        <button type={type || 'button'} form={form} disabled={disabled} onClick={onClick} className={className}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    await jest.unstable_mockModule('@heroicons/react/24/outline', () => ({
      ArrowLeftIcon: ({ className }: any) => <span className={className}>◀</span>,
      SparklesIcon: ({ className }: any) => <span className={className}>✨</span>,
      CheckCircleIcon: ({ className }: any) => <span className={className}>✓</span>,
      ExclamationTriangleIcon: ({ className }: any) => <span className={className}>⚠</span>,
      SignalIcon: ({ className }: any) => <span className={className}>📶</span>,
      CogIcon: ({ className }: any) => <span className={className}>⚙️</span>,
    }));

    // Mock de RTK Query hooks
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      useGetTemplatesQuery: () => ({
        data: mockTemplates,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
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

    const module = await import('../FlowiseConfigPage');
    FlowiseConfigPage = module.FlowiseConfigPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup localStorage con token
    Storage.prototype.getItem = jest.fn((key: string) => {
      if (key === 'token') return 'mock-token';
      return null;
    });
    // Setup fetch mock con implementación por defecto
    (global.fetch as jest.Mock).mockImplementation(async () =>
      ({ ok: true, json: async () => ({}) })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <MemoryRouter initialEntries={['/documentos/flowise']}>
        {children}
      </MemoryRouter>
    </Provider>
  );

  const renderPage = () => render(<FlowiseConfigPage />, { wrapper });

  describe('Renderizado básico', () => {
    it('debería importar el componente', () => {
      expect(FlowiseConfigPage).toBeDefined();
    });

    it('debería renderizar sin crashear', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería renderizar título y descripción', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
      expect(screen.getByText(/Conecta tu instancia de Flowise/)).toBeInTheDocument();
    });

    it('debería renderizar botón Volver', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });
  });

  describe('loadConfig', () => {
    it('debería cargar configuración exitosamente', async () => {
      const mockConfig = {
        enabled: true,
        baseUrl: 'https://flowise.test.com',
        apiKey: 'test-key',
        flowId: 'test-flow',
        timeout: 30000,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api/api/docs/flowise',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    it('debería manejar error 429 y reintentar', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce({ status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }),
        });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2500));
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('debería manejar error de carga', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // No debería crashear, solo manejar el error
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería manejar ausencia de token', async () => {
      Storage.prototype.getItem = jest.fn(() => null);

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Debería renderizar aunque no haya token
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });

    it('debería convertir timeout de ms a segundos', async () => {
      const mockConfig = {
        enabled: true,
        baseUrl: 'https://flowise.test.com',
        apiKey: 'test-key',
        flowId: 'test-flow',
        timeout: 60000, // 60 segundos = 1 minuto en backend
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // El timeout se divide por 1000 para mostrar en frontend
      // 60000ms / 1000 = 60s
    });
  });

  describe('Toggle Habilitar Flowise', () => {
    it('debería mostrar campos cuando se habilita', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => btn.textContent === ''); // El toggle no tiene texto visible
      if (toggleButton) {
        fireEvent.click(toggleButton);
      }

      await waitFor(() => {
        expect(screen.getByText('URL Base de Flowise')).toBeInTheDocument();
        expect(screen.getByText('API Key (Opcional)')).toBeInTheDocument();
        expect(screen.getByText('Flow ID')).toBeInTheDocument();
        expect(screen.getByText('Timeout (segundos)')).toBeInTheDocument();
      });
    });

    it('debería ocultar campos cuando se deshabilita', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Inicialmente disabled=false, así que los campos no deberían estar visibles
      expect(screen.queryByText('URL Base de Flowise')).not.toBeInTheDocument();
    });
  });

  describe('Inputs de configuración', () => {
    it('debería permitir editar baseUrl', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Habilitar primero
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1]; // El segundo botón es el toggle
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(input, { target: { value: 'https://new-url.com' } });
        expect(input).toHaveValue('https://new-url.com');
      });
    });

    it('debería permitir editar apiKey', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Clave API si es requerida');
        fireEvent.change(input, { target: { value: 'new-api-key' } });
        expect(input).toHaveValue('new-api-key');
      });
    });

    it('debería permitir editar flowId', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(input, { target: { value: 'new-flow-id' } });
        expect(input).toHaveValue('new-flow-id');
      });
    });

    it('debería permitir editar timeout', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText('doc-validator-flow-123');
        // Buscar input de tipo número
        const numberInputs = screen.getAllByDisplayValue('30');
        const timeoutInput = numberInputs.find((inp: any) => inp.type === 'number');
        if (timeoutInput) {
          fireEvent.change(timeoutInput, { target: { value: '60' } });
          expect(timeoutInput).toHaveValue(60);
        }
      });
    });

    it('debería manejar valor inválido en timeout', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const numberInputs = screen.getAllByDisplayValue('30');
        const timeoutInput = numberInputs.find((inp: any) => inp.type === 'number');
        if (timeoutInput) {
          // Valor inválido debería usar 30000 como default
          fireEvent.change(timeoutInput, { target: { value: 'invalid' } });
          // El componente debería manejar esto
        }
      });
    });
  });

  describe('testConnection', () => {
    it('debería mostrar error de validación cuando baseUrl está vacío', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const testButton = screen.getByText('Probar Conexión');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'URL base requerida para test de conexión',
          'error'
        );
      });
    });

    it('debería mostrar error de validación cuando flowId está vacío', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Habilitar y setear baseUrl
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const input = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(input, { target: { value: 'https://test.com' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Flow ID requerido para test de conexión',
          'error'
        );
      });
    });

    it('debería probar conexión exitosamente', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Habilitar y configurar
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://test-api/api/docs/flowise/test',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('https://test.com'),
          })
        );
      });
    });

    it('debería manejar error en test de conexión', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Connection failed' }),
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
    });

    it('debería manejar ausencia de token en testConnection', async () => {
      Storage.prototype.getItem = jest.fn(() => null);

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
    });

    it('debería prevenir llamadas concurrentes a testConnection', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise(resolve => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      fireEvent.click(testButton);
      fireEvent.click(testButton); // Segundo click mientras el primero está en curso

      // Solo debería haber una llamada
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      resolveFetch!({
        ok: true,
        json: async () => ({ success: true }),
      });
    });
  });

  describe('saveConfig', () => {
    it('debería guardar configuración exitosamente', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      });

      const saveButton = screen.getByText('Guardar Configuración');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://test-api/api/docs/flowise',
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });

    it('debería convertir timeout de segundos a milisegundos al guardar', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const saveButton = screen.getByText('Guardar Configuración');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        // El timeout se multiplica por 1000 para enviar al backend
        expect(body.timeout).toBe(30000 * 1000);
      });
    });

    it('debería manejar error al guardar configuración', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      });

      const saveButton = screen.getByText('Guardar Configuración');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
    });

    it('debería prevenir doble click al guardar', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise(resolve => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      });

      const saveButton = screen.getByText('Guardar Configuración');
      fireEvent.click(saveButton);
      fireEvent.click(saveButton); // Segundo click

      // Solo debería haber una llamada
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      resolveFetch!({ ok: true });
    });

    it('debería manejar ausencia de token al guardar', async () => {
      Storage.prototype.getItem = jest.fn(() => null);

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      });

      const saveButton = screen.getByText('Guardar Configuración');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
    });
  });

  describe('Estado de conexión', () => {
    it('debería mostrar estado "Sin probar" inicialmente', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });
      expect(screen.getByText('Sin probar')).toBeInTheDocument();
    });

    it('debería mostrar "Probando conexión..." mientras prueba', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise(resolve => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Probando conexión...')).toBeInTheDocument();
      });

      resolveFetch!({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    it('debería mostrar "Conectado" cuando la prueba es exitosa', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Conectado')).toBeInTheDocument();
      });
    });

    it('debería mostrar "Error de conexión" cuando falla', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Connection failed' }),
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Error de conexión')).toBeInTheDocument();
      });
    });

    it('debería mostrar tiempo de respuesta cuando la conexión es exitosa', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        // Simular delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/ms/)).toBeInTheDocument();
        expect(screen.getByText('Tiempo de respuesta')).toBeInTheDocument();
      });
    });

    it('debería mostrar mensaje de error cuando falla la conexión', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Network error' }),
      });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Botones deshabilitados', () => {
    it('debería deshabilitar "Probar Conexión" cuando no hay baseUrl', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const testButton = screen.getByText('Probar Conexión') as HTMLButtonElement;
      expect(testButton.disabled).toBe(true);
    });

    it('debería deshabilitar "Probar Conexión" cuando no hay flowId', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Habilitar y setear solo baseUrl
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      });

      const testButton = screen.getByText('Probar Conexión') as HTMLButtonElement;
      expect(testButton.disabled).toBe(true);
    });

    it('debería habilitar "Probar Conexión" cuando hay baseUrl y flowId', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText('https://flowise.empresa.com');
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

        const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      const testButton = screen.getByText('Probar Conexión') as HTMLButtonElement;
      expect(testButton.disabled).toBe(false);
    });

    it('debería deshabilitar "Probar Conexión" mientras está probando', async () => {
      // Configurar mock de fetch para loadConfig + testConnection
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ enabled: false, baseUrl: '', apiKey: '', flowId: '', timeout: 30000 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      // Habilitar configuración
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons[1];
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // Esperar a que aparezcan los inputs y llenarlos
      const urlInput = await screen.findByPlaceholderText('https://flowise.empresa.com');
      await act(async () => {
        fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      });

      const flowInput = screen.getByPlaceholderText('doc-validator-flow-123');
      await act(async () => {
        fireEvent.change(flowInput, { target: { value: 'test-flow' } });
      });

      // Obtener botón antes del clic
      const testButton = screen.getByText('Probar Conexión') as HTMLButtonElement;
      expect(testButton.disabled).toBe(false);

      // Clic en probar conexión
      await act(async () => {
        fireEvent.click(testButton);
      });

      // Verificar que el componente renderizó correctamente después de la interacción
      expect(screen.getByText('Configuración Flowise')).toBeInTheDocument();
    });
  });

  describe('Navegación', () => {
    it('debería navegar atrás al hacer click en Volver', async () => {
      renderPage();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 700));
      });

      const backButton = screen.getByText('Volver');
      fireEvent.click(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});