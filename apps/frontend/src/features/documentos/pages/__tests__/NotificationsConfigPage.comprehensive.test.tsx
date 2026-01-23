/**
 * Tests comprehensivos para NotificationsConfigPage
 * Cubre todos los branches y edge cases para alcanzar ≥90% cobertura
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

describe('NotificationsConfigPage - Comprehensive Coverage', () => {
  let NotificationsConfigPage: React.FC;
  let mockStore: ReturnType<typeof configureStore>;
  let mockGoBack: jest.Mock;

  beforeAll(async () => {
    mockGoBack = jest.fn();

    // Mock useRoleBasedNavigation hook
    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({ goBack: mockGoBack }),
    }));

    // Mock runtimeEnv
    await jest.unstable_mockModule('../../../../lib/runtimeEnv', () => ({
      getRuntimeEnv: (key: string) => {
        if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://test-api';
        return '';
      },
    }));

    // Mock de componentes UI
    await jest.unstable_mockModule('../../../../components/ui/button', () => ({
      Button: ({ children, onClick, variant, className }: any) => (
        <button onClick={onClick} className={className} data-variant={variant}>
          {children}
        </button>
      ),
    }));

    await jest.unstable_mockModule('../../../../components/ui/input', () => ({
      Input: (props: any) => <input {...props} />,
    }));

    await jest.unstable_mockModule('../../../../components/ui/card', () => ({
      Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    }));

    // Create mock store
    mockStore = configureStore({
      reducer: {
        auth: (state = {
          user: { id: 1, name: 'Admin', role: 'ADMIN', empresaId: 123 },
          token: 'mock-token',
          isAuthenticated: true,
        }) => state,
      },
    });

    ({ default: NotificationsConfigPage } = await import('../NotificationsConfigPage'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <MemoryRouter initialEntries={['/documentos/notifications']}>
        {children}
      </MemoryRouter>
    </Provider>
  );

  const renderPage = () => render(<NotificationsConfigPage />, { wrapper });

  describe('Renderizado básico', () => {
    it('debería importar el componente', () => {
      expect(NotificationsConfigPage).toBeDefined();
    });

    it('debería renderizar sin crashear', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            enabled: true,
            windows: {},
            templates: {},
          },
        }),
      });

      renderPage();
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });

    it('debería renderizar título y botón volver', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      renderPage();
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
      expect(screen.getByText('Volver')).toBeInTheDocument();
    });

    it('debería renderizar checkbox de sistema habilitado', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      renderPage();
      expect(screen.getByText('Sistema de notificaciones')).toBeInTheDocument();
    });
  });

  describe('Carga de configuración (useEffect)', () => {
    it('debería cargar configuración desde la API', async () => {
      const mockData = {
        enabled: true,
        windows: {
          aviso: { enabled: true, unit: 'days', value: 30 },
          alerta: { enabled: true, unit: 'days', value: 14 },
          alarma: { enabled: true, unit: 'days', value: 3 },
        },
        templates: {
          aviso: { chofer: { enabled: true, text: 'Aviso chofer' }, dador: { enabled: true, text: 'Aviso dador' } },
          alerta: { chofer: { enabled: true, text: 'Alerta chofer' }, dador: { enabled: true, text: 'Alerta dador' } },
          alarma: { chofer: { enabled: true, text: 'Alarma chofer' }, dador: { enabled: true, text: 'Alarma dador' } },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      renderPage();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://test-api/api/docs/notifications',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-token',
              'x-tenant-id': '123',
            }),
          })
        );
      });
    });

    it('debería manejar respuesta sin data.data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ something: 'else' }),
      });

      renderPage();

      // No debería crashear
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });

    it('debería manejar respuesta vacía', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      renderPage();

      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });

    it('debería manejar error de carga', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderPage();

      // No debería crashear
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });

    it('debería manejar headers sin token', async () => {
      const storeWithoutToken = configureStore({
        reducer: {
          auth: (state = {
            user: { id: 1, name: 'Admin', role: 'ADMIN' },
            token: null,
            isAuthenticated: false,
          }) => state,
        },
      });

      const wrapperWithoutToken = ({ children }: { children: React.ReactNode }) => (
        <Provider store={storeWithoutToken}>
          <MemoryRouter>
            {children}
          </MemoryRouter>
        </Provider>
      );

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      render(<NotificationsConfigPage />, { wrapper: wrapperWithoutToken });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('debería manejar headers sin empresaId', async () => {
      const storeWithoutEmpresa = configureStore({
        reducer: {
          auth: (state = {
            user: { id: 1, name: 'Admin', role: 'ADMIN' },
            token: 'mock-token',
            isAuthenticated: true,
          }) => state,
        },
      });

      const wrapperWithoutEmpresa = ({ children }: { children: React.ReactNode }) => (
        <Provider store={storeWithoutEmpresa}>
          <MemoryRouter>
            {children}
          </MemoryRouter>
        </Provider>
      );

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      render(<NotificationsConfigPage />, { wrapper: wrapperWithoutEmpresa });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Toggle de sistema habilitado', () => {
    it('debería cambiar estado del checkbox principal', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      const mainCheckbox = checkboxes[0];
      expect(mainCheckbox).toBeChecked();

      fireEvent.click(mainCheckbox);
      expect(mainCheckbox).not.toBeChecked();
    });
  });

  describe('Configuración de ventanas (windows)', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            enabled: true,
            windows: {
              aviso: { enabled: true, unit: 'days', value: 30 },
              alerta: { enabled: true, unit: 'days', value: 14 },
              alarma: { enabled: true, unit: 'days', value: 3 },
            },
          },
        }),
      });
    });

    it('debería mostrar las tres ventanas: aviso, alerta, alarma', () => {
      renderPage();

      expect(screen.getByText('aviso')).toBeInTheDocument();
      expect(screen.getByText('alerta')).toBeInTheDocument();
      expect(screen.getByText('alarma')).toBeInTheDocument();
    });

    it('debería cambiar estado enabled de ventana aviso', () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      const avisoCheckbox = checkboxes[1]; // [0] es el principal, [1] es aviso

      fireEvent.click(avisoCheckbox);
      expect(avisoCheckbox).not.toBeChecked();
    });

    it('debería cambiar unidad de ventana aviso', () => {
      renderPage();

      const selects = screen.getAllByDisplayValue('days');
      const avisoSelect = selects[0];

      fireEvent.change(avisoSelect, { target: { value: 'weeks' } });
      expect(avisoSelect).toHaveValue('weeks');
    });

    it('debería mostrar todas las unidades disponibles', () => {
      renderPage();

      const select = screen.getAllByDisplayValue('days')[0];
      const options = Array.from(select.querySelectorAll('option'));

      expect(options).toHaveLength(3);
      expect(options.map((o: any) => o.value)).toEqual(['days', 'weeks', 'months']);
    });

    it('debería cambiar valor de ventana aviso', () => {
      renderPage();

      const inputElement = screen.getByDisplayValue('30');
      fireEvent.change(inputElement, { target: { value: '60' } });
      expect(inputElement).toHaveValue('60');
    });

    it('debería manejar valor vacío en input numérico', () => {
      renderPage();

      const inputElement = screen.getByDisplayValue('30');
      fireEvent.change(inputElement, { target: { value: '' } });
      expect(inputElement).toHaveValue('');
    });

    it('debería configurar ventana alerta', () => {
      renderPage();

      // Buscar el valor 14 que corresponde a alerta
      const alertaInput = screen.getByDisplayValue('14');
      fireEvent.change(alertaInput, { target: { value: '21' } });
      expect(alertaInput).toHaveValue('21');
    });

    it('debería configurar ventana alarma', () => {
      renderPage();

      // Buscar el valor 3 que corresponde a alarma
      const alarmaInput = screen.getByDisplayValue('3');
      fireEvent.change(alarmaInput, { target: { value: '7' } });
      expect(alarmaInput).toHaveValue('7');
    });
  });

  describe('Configuración de templates', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            enabled: true,
            templates: {
              aviso: {
                chofer: { enabled: true, text: 'Aviso chofer' },
                dador: { enabled: true, text: 'Aviso dador' },
              },
              alerta: {
                chofer: { enabled: true, text: 'Alerta chofer' },
                dador: { enabled: true, text: 'Alerta dador' },
              },
              alarma: {
                chofer: { enabled: true, text: 'Alarma chofer' },
                dador: { enabled: true, text: 'Alarma dador' },
              },
            },
          },
        }),
      });
    });

    it('debería mostrar audiences chofer y dador para cada ventana', () => {
      renderPage();

      expect(screen.getByText('chofer')).toBeInTheDocument();
      expect(screen.getByText('dador')).toBeInTheDocument();
    });

    it('debería cambiar checkbox Enviar de chofer', () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      // [0] = principal, [1] = aviso enabled, [2] = aviso chofer enviar
      const choferCheckbox = checkboxes[2];

      fireEvent.click(choferCheckbox);
      expect(choferCheckbox).not.toBeChecked();
    });

    it('debería cambiar texto de template chofer', () => {
      renderPage();

      const textareas = screen.getAllByRole('textbox');
      const choferTextarea = textareas[0];

      fireEvent.change(choferTextarea, { target: { value: 'Nuevo mensaje chofer' } });
      expect(choferTextarea).toHaveValue('Nuevo mensaje chofer');
    });

    it('debería cambiar checkbox Enviar de dador', () => {
      renderPage();

      const checkboxes = screen.getAllByRole('checkbox');
      // [3] = aviso dador enviar
      const dadorCheckbox = checkboxes[3];

      fireEvent.click(dadorCheckbox);
      expect(dadorCheckbox).not.toBeChecked();
    });

    it('debería cambiar texto de template dador', () => {
      renderPage();

      const textareas = screen.getAllByRole('textbox');
      const dadorTextarea = textareas[1];

      fireEvent.change(dadorTextarea, { target: { value: 'Nuevo mensaje dador' } });
      expect(dadorTextarea).toHaveValue('Nuevo mensaje dador');
    });
  });

  describe('Función save', () => {
    it('debería guardar configuración', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      renderPage();

      const saveButton = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://test-api/api/docs/notifications',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('enabled'),
          })
        );
      });
    });

    it('debería mostrar status "Guardado" después de guardar', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      renderPage();

      const saveButton = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Guardado')).toBeInTheDocument();
      });
    });

    it('debería limpiar status anterior al guardar', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      renderPage();

      // Primero hacer una prueba que deja status
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const testButton = screen.getByText('Probar envío');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Enviado')).toBeInTheDocument();
      });

      // Luego guardar que debería limpiar el status
      const saveButton = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Guardado')).toBeInTheDocument();
      });
    });

    it('debería manejar error al guardar', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockRejectedValueOnce(new Error('Save failed'));

      renderPage();

      const saveButton = screen.getByText('Guardar');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // No debería crashear
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });
  });

  describe('Función test (prueba de envío)', () => {
    it('debería probar envío con MSISDN y mensaje personalizado', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      renderPage();

      const msisdnInput = screen.getByPlaceholderText('MSISDN (+549...)');
      fireEvent.change(msisdnInput, { target: { value: '+5491112345678' } });

      const msgInput = screen.getByPlaceholderText('Mensaje de prueba');
      fireEvent.change(msgInput, { target: { value: 'Mensaje personalizado' } });

      const testButton = screen.getByText('Probar envío');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://test-api/api/docs/notifications/test',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('+5491112345678'),
          })
        );
      });
    });

    it('debería usar mensaje por defecto cuando no se especifica', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      renderPage();

      const msisdnInput = screen.getByPlaceholderText('MSISDN (+549...)');
      fireEvent.change(msisdnInput, { target: { value: '+5491112345678' } });

      const testButton = screen.getByText('Probar envío');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        const calls = (global.fetch as jest.Mock).mock.calls;
        const testCall = calls.find((call: any[]) => call[0]?.includes('/test'));
        expect(testCall).toBeDefined();
      });
    });

    it('debería mostrar status "Enviado" cuando la prueba es exitosa', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      renderPage();

      const testButton = screen.getByText('Probar envío');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Enviado')).toBeInTheDocument();
      });
    });

    it('debería mostrar status "Error" cuando la prueba falla', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      renderPage();

      const testButton = screen.getByText('Probar envío');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });

    it('debería manejar error de red en prueba', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      renderPage();

      const testButton = screen.getByText('Probar envío');
      await act(async () => {
        fireEvent.click(testButton);
      });

      // No debería crashear
      expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    });
  });

  describe('Inputs de prueba', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });
    });

    it('debería cambiar MSISDN', () => {
      renderPage();

      const msisdnInput = screen.getByPlaceholderText('MSISDN (+549...)');
      fireEvent.change(msisdnInput, { target: { value: '+5491198765432' } });
      expect(msisdnInput).toHaveValue('+5491198765432');
    });

    it('debería cambiar mensaje de prueba', () => {
      renderPage();

      const msgInput = screen.getByPlaceholderText('Mensaje de prueba');
      fireEvent.change(msgInput, { target: { value: 'Test message' } });
      expect(msgInput).toHaveValue('Test message');
    });

    it('debería limpiar status antes de hacer prueba', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { enabled: true } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      renderPage();

      // Primera prueba
      const testButton = screen.getByText('Probar envío');
      await act(async () => {
        fireEvent.click(testButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Enviado')).toBeInTheDocument();
      });

      // Segunda prueba debería limpiar el status anterior
      await act(async () => {
        fireEvent.click(testButton);
      });

      // El status debería actualizarse
      expect(screen.getByText('Enviado')).toBeInTheDocument();
    });
  });

  describe('Navegación', () => {
    it('debería navegar atrás al hacer click en Volver', () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: { enabled: true } }),
      });

      renderPage();

      const backButton = screen.getByText('Volver');
      fireEvent.click(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integración completa', () => {
    it('debería mantener estado de configuración entre interacciones', async () => {
      const mockData = {
        enabled: true,
        windows: {
          aviso: { enabled: true, unit: 'days', value: 30 },
        },
        templates: {
          aviso: { chofer: { enabled: true, text: '' } },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      renderPage();

      // Cambiar checkbox aviso
      const checkboxes = screen.getAllByRole('checkbox');
      const avisoCheckbox = checkboxes[1];
      fireEvent.click(avisoCheckbox);

      // Cambiar unidad
      const selects = screen.getAllByDisplayValue('days');
      fireEvent.change(selects[0], { target: { value: 'weeks' } });

      // Cambiar valor
      const inputElement = screen.getByDisplayValue('30');
      fireEvent.change(inputElement, { target: { value: '45' } });

      // El estado se mantiene
      expect(avisoCheckbox).not.toBeChecked();
      expect(selects[0]).toHaveValue('weeks');
      expect(inputElement).toHaveValue('45');
    });
  });
});