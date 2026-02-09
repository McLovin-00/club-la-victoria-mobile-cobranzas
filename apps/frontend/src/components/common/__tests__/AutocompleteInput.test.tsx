/**
 * Tests Comprehensivos para AutocompleteInput (Frontend)
 * Objetivo: Alcanzar ≥ 90% de cobertura
 *
 * Estructura:
 * 1. Renderizado básico - Props y estados iniciales
 * 2. Manejo de input - handleChange, onFocus, disabled
 * 3. Fetch de sugerencias - useEffect con debounce
 * 4. Click outside - Cerrar dropdown
 * 5. Selección de sugerencias - handleSelect
 * 6. Estados de carga - Loading spinner
 * 7. Edge cases - Errores, casos límite
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AutocompleteInput } from '../AutocompleteInput';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

// ============================================================================
// MOCKS Y SETUP
// ============================================================================

// Mock de import.meta.env ANTES de importar el componente
(globalThis as any).import = { meta: { env: { VITE_REMITOS_API_URL: 'http://localhost:4803' } } };

// Mock de Redux
const mockToken = 'test-token-123';
const mockStore = createStore((state = { auth: { token: mockToken } }) => state);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((fn) => fn(mockStore.getState())),
}));

// Wrapper para Redux
const renderWithRedux = (component: JSX.Element) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

// ============================================================================
// TESTS
// ============================================================================

describe('AutocompleteInput', () => {
  let onChangeMock: jest.Mock;
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    onChangeMock = jest.fn();
    consoleErrorSpy.mockClear();

    // Asegurar que el mock de import.meta.env esté configurado
    (globalThis as any).import = { meta: { env: { VITE_REMITOS_API_URL: 'http://localhost:4803' } } };

    // Mock fetch global con respuesta por defecto
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    ) as any;
  });

  // ==========================================================================
  // 1. RENDERIZADO BÁSICO
  // ==========================================================================

  describe('Renderizado básico', () => {
    it('debe renderizar el input correctamente', () => {
      renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="cliente"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('debe renderizar con placeholder custom', () => {
      renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="transportista"
          placeholder="Buscar transportista..."
        />
      );

      expect(screen.getByPlaceholderText('Buscar transportista...')).toBeInTheDocument();
    });

    it('debe renderizar con className custom', () => {
      renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="patente"
          className="custom-class"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('debe renderizar con valor inicial', () => {
      renderWithRedux(
        <AutocompleteInput
          value="Cliente Test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Cliente Test');
    });

    it('debe estar disabled cuando disabled=true', () => {
      renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="cliente"
          disabled
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('debe envolver el input en un div con clase relative', () => {
      const { container } = renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="cliente"
        />
      );

      const wrapper = container.querySelector('.relative');
      expect(wrapper).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 2. MANEJO DE INPUT
  // ==========================================================================

  describe('Manejo de input', () => {
    it('debe llamar onChange cuando el usuario escribe', () => {
      renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="cliente"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Cli' } });

      expect(onChangeMock).toHaveBeenCalledWith('Cli');
    });

    it('NO debe mostrar sugerencias al hacer focus si value.length < 2', () => {
      renderWithRedux(
        <AutocompleteInput
          value="C"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      // No debería haber sugerencias
      expect(screen.queryAllByRole('list')).toHaveLength(0);
    });

    it('debe actualizar valor cuando el usuario cambia el input', () => {
      const { rerender } = renderWithRedux(
        <AutocompleteInput
          value="Inicial"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Inicial');

      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="Nuevo Valor"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );

      expect(input.value).toBe('Nuevo Valor');
    });
  });

  // ==========================================================================
  // 3. FETCH DE SUGERENCIAS - Timers reales
  // ==========================================================================

  describe('Fetch de sugerencias', () => {
    it('debe limpiar sugerencias cuando value.length < 2', async () => {
      renderWithRedux(
        <AutocompleteInput
          value="a"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar más del debounce para verificar que no se hace fetch
      await new Promise(resolve => setTimeout(resolve, 400));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('debe hacer fetch cuando value.length >= 2', async () => {
      renderWithRedux(
        <AutocompleteInput
          value="ab"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar el debounce + tiempo de respuesta + que se procesen las promesas
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/remitos/suggestions?field=cliente&q=ab',
        {
          headers: { Authorization: `Bearer ${mockToken}` },
        }
      );
    });

    it('debe mostrar sugerencias cuando response.ok es true', async () => {
      const suggestions = ['Cliente A', 'Cliente B', 'Cliente C'];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: suggestions }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="Cli"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar que se complete el fetch
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Simular focus para activar showSuggestions
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(
        () => {
          expect(screen.getByText('Cliente A')).toBeInTheDocument();
          expect(screen.getByText('Cliente B')).toBeInTheDocument();
          expect(screen.getByText('Cliente C')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('debe manejar response sin data.data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ result: [] }), // Sin 'data'
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // No debería mostrar sugerencias
      expect(screen.queryAllByRole('button').filter(btn => btn.tagName === 'BUTTON')).toHaveLength(0);
    });

    it('debe manejar error de fetch', async () => {
      const testError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(testError);

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar a que se complete el fetch (fallido)
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Verificar que el componente no crasheó y que las sugerencias están vacías
      // El error se loguea pero no afecta la funcionalidad
      expect(screen.queryAllByRole('button').filter(btn => btn.tagName === 'BUTTON')).toHaveLength(0);
    });

    it('debe manejar response.ok = false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // No debería mostrar sugerencias
      expect(screen.queryAllByRole('button').filter(btn => btn.tagName === 'BUTTON')).toHaveLength(0);
    });

    it('debe limpiar timeout anterior cuando el valor cambia rápidamente', async () => {
      // Este test verifica que solo se hace fetch con el último valor
      // (el debounce anterior se canceló) cuando cambiamos el valor prop
      let fetchCount = 0;
      const fetchValues: string[] = [];

      (global.fetch as jest.Mock).mockImplementation(async (url) => {
        fetchCount++;
        // Extraer el valor de 'q' de la URL
        const match = url.toString().match(/q=([^&]+)/);
        if (match) {
          fetchValues.push(decodeURIComponent(match[1]));
        }
        return {
          ok: true,
          json: async () => ({ data: [] }),
        };
      });

      const { rerender } = renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Cambiar valor varias veces rápidamente usando rerender
      // Esto simula cambios rápidos desde el padre
      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="ab"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );
      await new Promise(resolve => setTimeout(resolve, 50));

      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="abc"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );
      await new Promise(resolve => setTimeout(resolve, 50));

      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="abcd"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );

      // Esperar que se complete el debounce final
      await waitFor(
        () => {
          expect(fetchCount).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // Verificar que se hizo fetch y que fue con el último valor
      expect(fetchValues[fetchValues.length - 1]).toBe('abcd');
    });

    it('debe limpiar timeout en cleanup del useEffect', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      unmount();

      // Debería limpiar el timeout al desmontar
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('debe escapar correctamente los caracteres especiales en la query', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const specialValue = 'test & special=chars?query';

      renderWithRedux(
        <AutocompleteInput
          value={specialValue}
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(encodeURIComponent(specialValue)),
            expect.any(Object)
          );
        },
        { timeout: 2000 }
      );
    });

    it('debe funcionar con todos los tipos de field', async () => {
      const fields: Array<'cliente' | 'transportista' | 'patente'> = ['cliente', 'transportista', 'patente'];

      for (const field of fields) {
        (global.fetch as jest.Mock).mockClear();
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({ data: [] }),
        });

        renderWithRedux(
          <AutocompleteInput
            value="test"
            onChange={onChangeMock}
            field={field}
          />
        );

        await waitFor(
          () => {
            expect(global.fetch).toHaveBeenCalledWith(
              expect.stringContaining(`field=${field}`),
              expect.any(Object)
            );
          },
          { timeout: 2000 }
        );
      }
    });

    it('debe manejar múltiples cambios rápidos de valor', async () => {
      const fetchValues: string[] = [];

      (global.fetch as jest.Mock).mockImplementation(async (url) => {
        // Extraer el valor de 'q' de la URL
        const match = url.toString().match(/q=([^&]+)/);
        if (match) {
          fetchValues.push(decodeURIComponent(match[1]));
        }
        return {
          ok: true,
          json: async () => ({ data: [] }),
        };
      });

      const { rerender } = renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Cambiar valor rápidamente usando rerender (solo el último debe hacer fetch)
      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="ab"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );
      await new Promise(resolve => setTimeout(resolve, 50));

      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="abc"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );
      await new Promise(resolve => setTimeout(resolve, 50));

      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="abcd"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );
      await new Promise(resolve => setTimeout(resolve, 50));

      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="abcde"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );

      // Esperar el debounce + que se procesen las promesas
      await waitFor(
        () => {
          expect((global.fetch as jest.Mock)).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // El último fetch debe ser con el último valor ingresado
      const lastValue = fetchValues[fetchValues.length - 1];
      expect(lastValue).toBe('abcde');
    });

    it('debe incluir Authorization header con el token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              headers: {
                Authorization: `Bearer ${mockToken}`,
              },
            })
          );
        },
        { timeout: 2000 }
      );
    });
  });

  // ==========================================================================
  // 4. CLICK OUTSIDE
  // ==========================================================================

  describe('Click outside - Cerrar dropdown', () => {
    it('debe cerrar sugerencias al hacer click fuera del componente', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Opción 1'] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar que se complete el fetch
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Simular focus para activar showSuggestions
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(
        () => {
          expect(screen.getByText('Opción 1')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Simular click fuera del componente
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Opción 1')).not.toBeInTheDocument();
      });
    });

    it('NO debe cerrar sugerencias al hacer click dentro del componente', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Opción 1'] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Simular focus para activar showSuggestions
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(
        () => {
          expect(screen.getByText('Opción 1')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Hacer click en el input (dentro del componente)
      fireEvent.mouseDown(input);

      // Las sugerencias deberían seguir visibles
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.getByText('Opción 1')).toBeInTheDocument();
    });

    it('debe registrar y limpiar event listener de mousedown', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderWithRedux(
        <AutocompleteInput
          value=""
          onChange={onChangeMock}
          field="cliente"
        />
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  // ==========================================================================
  // 5. SELECCIÓN DE SUGERENCIAS
  // ==========================================================================

  describe('Selección de sugerencias', () => {
    it('debe llamar onChange con la sugerencia seleccionada', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Cliente Seleccionado'] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="Cli"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Simular focus para activar showSuggestions
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(
        () => {
          expect(screen.getByText('Cliente Seleccionado')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      fireEvent.click(screen.getByText('Cliente Seleccionado'));

      expect(onChangeMock).toHaveBeenCalledWith('Cliente Seleccionado');
    });

    it('debe limpiar sugerencias después de seleccionar', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Opción 1', 'Opción 2'] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Simular focus para activar showSuggestions
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(
        () => {
          expect(screen.getByText('Opción 1')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      fireEvent.click(screen.getByText('Opción 1'));

      await waitFor(() => {
        expect(screen.queryByText('Opción 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Opción 2')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 6. ESTADOS DE CARGA
  // ==========================================================================

  describe('Estados de carga', () => {
    it('debe mostrar spinner de carga mientras se hace fetch', async () => {
      // Crear una promesa que no se resuelve inmediatamente
      let resolveFetch: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(pendingPromise as any);

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar un poco para que se active el loading
      await new Promise(resolve => setTimeout(resolve, 100));

      // Esperar a que aparezca el spinner
      await waitFor(
        () => {
          const container = screen.getByRole('textbox').parentElement;
          expect(container?.querySelector('.animate-spin')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Resolver fetch
      resolveFetch!({
        ok: true,
        json: async () => ({ data: [] }),
      });

      // Esperar a que desaparezca el spinner
      await waitFor(
        () => {
          const container = screen.getByRole('textbox').parentElement;
          expect(container?.querySelector('.animate-spin')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('debe ocultar spinner cuando el fetch termina', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Resultado'] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Simular focus para activar showSuggestions
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      // Esperar a que termine el fetch y aparezca el resultado
      await waitFor(
        () => {
          expect(screen.getByText('Resultado')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // El spinner debería haber desaparecido
      const container = screen.getByRole('textbox').parentElement;
      expect(container?.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 7. EDGE CASES
  // ==========================================================================

  describe('Edge cases', () => {
    it('debe manejar datos vacíos correctamente', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // No debería haber dropdown
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('debe manejar response con data undefined', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: undefined }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // No debería lanzar error ni mostrar dropdown
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('debe manejar response con data null', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('debe limpiar sugerencias cuando el valor se reduce a < 2 caracteres', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Sugerencia'] }),
      });

      const { rerender } = renderWithRedux(
        <AutocompleteInput
          value="abc"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar que se complete el fetch
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Activar showSuggestions con focus
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(
        () => {
          expect(screen.getByText('Sugerencia')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Reducir valor a menos de 2 caracteres (esto debe limpiar las sugerencias)
      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="a"
            onChange={onChangeMock}
            field="cliente"
          />
        </Provider>
      );

      // Esperar a que el useEffect se ejecute con el nuevo valor
      await new Promise(resolve => setTimeout(resolve, 400));

      // Las sugerencias deberían haber desaparecido
      expect(screen.queryByText('Sugerencia')).not.toBeInTheDocument();
    });

    it('debe re-fetch cuando cambia el field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { rerender } = renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('field=cliente'),
            expect.any(Object)
          );
        },
        { timeout: 2000 }
      );

      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      rerender(
        <Provider store={mockStore}>
          <AutocompleteInput
            value="test"
            onChange={onChangeMock}
            field="transportista"
          />
        </Provider>
      );

      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('field=transportista'),
            expect.any(Object)
          );
        },
        { timeout: 2000 }
      );
    });

    it('debe mostrar dropdown con clases CSS correctas', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: ['Opción 1', 'Opción 2'] }),
      });

      renderWithRedux(
        <AutocompleteInput
          value="test"
          onChange={onChangeMock}
          field="cliente"
        />
      );

      // Esperar que se complete el fetch
      await waitFor(
        () => {
          expect(global.fetch).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Activar showSuggestions con focus
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      await waitFor(
        () => {
          expect(screen.getByText('Opción 1')).toBeInTheDocument();
          expect(screen.getByText('Opción 2')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Verificar clases CSS del dropdown
      const dropdown = screen.getByText('Opción 1').closest('.absolute');
      expect(dropdown).toHaveClass('z-50', 'w-full', 'mt-1');
    });
  });
});
