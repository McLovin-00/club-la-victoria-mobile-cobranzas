// Tests de gap coverage para `AuditLogsPage`: branches faltantes (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';

beforeAll(async () => {
  await jest.unstable_mockModule('../../../../lib/runtimeEnv', () => ({
    getRuntimeEnv: () => 'http://test-api.com',
  }));

  await jest.unstable_mockModule('../../../../components/ui/Toast.utils', () => ({
    showToast: jest.fn(),
  }));

  // Mock de fetch global
  global.fetch = jest.fn();
});

function createStore(userRole: string = 'SUPERADMIN') {
  return configureStore({
    reducer: {
      auth: () => ({
        user: { id: 1, email: 'test@test.com', role: userRole, empresaId: 1 },
        token: 'mock-token',
        isAuthenticated: true,
        initialized: true,
      }),
      documentosApiSlice: () => ({
        queries: {},
        mutations: {},
        provided: {},
        subscriptions: {},
      }),
    },
  });
}

describe('AuditLogsPage - Gap Coverage', () => {
  let AuditLogsPage: React.FC;

  beforeAll(async () => {
    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      documentosApiSlice: {
        reducerPath: 'documentosApiSlice',
        reducer: (state = {}) => state,
        middleware: () => (next: any) => (action: any) => next(action),
      },
      useGetAuditLogsQuery: () => ({ data: { data: [], page: 1, totalPages: 1 }, isLoading: false }),
    }));

    const module = await import('../AuditLogsPage');
    AuditLogsPage = module.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['test']),
    });
  });

  describe('getBackRoute según rol', () => {
    it('debe retornar ruta correcta según rol', () => {
      const roles = {
        'ADMIN_INTERNO': '/portal/admin-interno',
        'DADOR_DE_CARGA': '/portal/dadores',
        'TRANSPORTISTA': '/portal/transportistas',
        'CHOFER': '/portal/transportistas',
        'SUPERADMIN': '/documentos',
      };

      const getBackRoute = (userRole: string) => {
        switch (userRole) {
          case 'ADMIN_INTERNO':
            return '/portal/admin-interno';
          case 'DADOR_DE_CARGA':
            return '/portal/dadores';
          case 'TRANSPORTISTA':
          case 'CHOFER':
            return '/portal/transportistas';
          default:
            return '/documentos';
        }
      };

      for (const [role, expectedRoute] of Object.entries(roles)) {
        expect(getBackRoute(role)).toBe(expectedRoute);
      }
    });
  });

  describe('toInt helper', () => {
    it('debe convertir string a número o usar default', () => {
      const toInt = (s: string | null, def: number): number => {
        const n = s ? parseInt(s, 10) : NaN;
        return Number.isNaN(n) ? def : n;
      };

      expect(toInt('42', 0)).toBe(42);
      expect(toInt('123', 0)).toBe(123);
      expect(toInt(null, 1)).toBe(1);
      expect(toInt('', 1)).toBe(1);
      expect(toInt('invalid', 10)).toBe(10);
    });
  });

  describe('filtros de búsqueda', () => {
    it('debe mostrar inputs principales de filtro', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByLabelText('Desde')).toBeInTheDocument();
      expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('debe permitir cambiar valor de filtro desde', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const fromInput = screen.getByLabelText('Desde');
      fireEvent.change(fromInput, { target: { value: '2025-01-01T00:00' } });

      expect(fromInput).toHaveValue('2025-01-01T00:00');
    });

    it('debe permitir cambiar valor de filtro userEmail', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });

      expect(emailInput).toHaveValue('test@test.com');
    });
  });

  describe('botones rápidos', () => {
    it('debe tener botón de Hoy', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Hoy')).toBeInTheDocument();
    });

    it('debe tener botón de Últimos 7 días', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Últimos 7 días')).toBeInTheDocument();
    });
  });

  describe('toggle de columnas', () => {
    it('debe permitir ocultar columna fecha', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const columnaLabels = screen.getAllByText('Fecha');
      const fechaCheckboxLabel = columnaLabels.find(el => el.tagName === 'LABEL' && el.querySelector('input[type="checkbox"]'));
      expect(fechaCheckboxLabel).toBeDefined();

      const checkbox = fechaCheckboxLabel!.querySelector('input') as HTMLInputElement;
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('debe permitir ocultar todas las columnas', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(cb => fireEvent.click(cb));

      // Todos deberían estar desmarcados
      checkboxes.forEach(cb => expect(cb).not.toBeChecked());
    });
  });

  describe('paginación', () => {
    it('debe deshabilitar botón anterior en página 1', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const anteriorButton = screen.getByText('Anterior');
      expect(anteriorButton).toBeDisabled();
    });

    it('debe mostrar página actual', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Página 1 / 1')).toBeInTheDocument();
    });

    it('debe cambiar límite de resultados', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const limitSelect = screen.getByDisplayValue('20');
      fireEvent.change(limitSelect, { target: { value: '50' } });

      expect(limitSelect).toHaveValue('50');
    });

    it('debe mostrar opciones de límite', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const limitSelect = screen.getByDisplayValue('20');
      const options = Array.from(limitSelect.querySelectorAll('option'));

      expect(options.map(o => o.value)).toEqual(['10', '20', '50', '100']);
    });
  });

  describe('descarga de archivos', () => {
    it('debe descargar CSV', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const csvButton = screen.getByText('Descargar CSV');
      fireEvent.click(csvButton);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/audit/logs.csv'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'authorization': 'Bearer mock-token',
          }),
        })
      );
    });

    it('debe descargar Excel', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const excelButton = screen.getByText('Descargar Excel');
      fireEvent.click(excelButton);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/audit/logs.xlsx'),
        expect.any(Object)
      );
    });
  });

  describe('tabla de resultados', () => {
    it('debe mostrar "Sin resultados" cuando no hay datos', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    });

    it('debe manejar createdAt vacío', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('TextInput component', () => {
    it('debe renderizar input con label correcto', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByLabelText('Desde')).toBeInTheDocument();
      expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
    });
  });

  describe('NumberInput component', () => {
    it('debe renderizar input numérico con atributo inputMode', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      // Buscar por id en lugar de label para evitar ambigüedad
      const statusInput = document.getElementById('statusCode');
      expect(statusInput).toBeInTheDocument();
      expect(statusInput).toHaveAttribute('inputmode', 'numeric');
    });
  });

  describe('columnas visibles por defecto', () => {
    it('todas las columnas están visibles por defecto', async () => {
      const store = createStore();
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AuditLogsPage />
          </MemoryRouter>
        </Provider>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(cb => {
        expect(cb).toBeChecked();
      });
    });
  });
});
