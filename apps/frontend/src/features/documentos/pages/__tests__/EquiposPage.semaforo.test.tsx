/**
 * Tests para el componente EquipoSemaforo y funcionalidades de estado de EquiposPage
 * Objetivo: cubrir completamente el componente EquipoSemaforo y gestión de estados
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest, beforeAll } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { documentosApiSlice } from '../../api/documentosApiSlice';
import type { EquipoWithExtras } from '../../types/entities';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockDadores = [
  { id: 1, razonSocial: 'Dador Test 1', cuit: '20123456789' },
  { id: 2, razonSocial: 'Dador Test 2', cuit: '20987654321' },
];

const mockClients = [
  { id: 1, razonSocial: 'Cliente Test 1', cuit: '30123456789' },
];

const mockEmpresasTransp = [
  { id: 1, razonSocial: 'Transporte S.A.', cuit: '30111222333' },
];

const mockChoferes = {
  data: [
    { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' },
  ],
  pagination: { total: 1, page: 1, limit: 50 },
};

const mockCamiones = {
  data: [
    { id: 1, patente: 'AB123CD' },
  ],
  pagination: { total: 1, page: 1, limit: 50 },
};

const mockAcoplados = {
  data: [
    { id: 1, patente: 'AA001BB' },
  ],
  pagination: { total: 1, page: 1, limit: 50 },
};

const mockEquipos: EquipoWithExtras[] = [
  {
    id: 1,
    driverDniNorm: '12345678',
    truckPlateNorm: 'AB123CD',
    trailerPlateNorm: 'AA001BB',
    empresaTransportistaId: 1,
    dador: { id: 1, razonSocial: 'Dador Test 1', cuit: '20123456789' },
    clientes: [],
    estado: 'activa',
  },
  {
    id: 2,
    driverDniNorm: '87654321',
    truckPlateNorm: 'EF456GH',
    trailerPlateNorm: null,
    empresaTransportistaId: 1,
    dador: { id: 1, razonSocial: 'Dador Test 1', cuit: '20123456789' },
    clientes: [],
    estado: 'finalizada',
  },
];

const mockDefaults = {
  defaultDadorId: 1,
  defaultClienteId: 1,
};

const mockKpis = {
  created: 5,
  swaps: 3,
  deleted: 1,
};

// =============================================================================
// MOCKS SETUP
// =============================================================================

let mockConfirm: jest.Mock;
let mockNavigate: jest.Mock;
let mockGoBack: jest.Mock;

let mockUseGetEquiposQuery: jest.Mock;
let mockUseGetEquipoComplianceQuery: jest.Mock;

beforeAll(async () => {
  // Mock de confirm context
  mockConfirm = jest.fn().mockResolvedValue(true);
  await jest.unstable_mockModule('@/contexts/confirmContext', () => ({
    ConfirmContext: React.createContext({ confirm: mockConfirm }),
    useConfirm: () => ({ confirm: mockConfirm }),
  }));

  // Mock de navigate y useRoleBasedNavigation
  mockNavigate = jest.fn();
  mockGoBack = jest.fn();
  await jest.unstable_mockModule('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
  }));

  await jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({
    useRoleBasedNavigation: () => ({
      canNavigate: () => true,
      getHomeRoute: () => '/documentos',
      goBack: mockGoBack,
    }),
  }));

  // Crear funciones mock para los hooks
  mockUseGetEquiposQuery = jest.fn();
  mockUseGetEquipoComplianceQuery = jest.fn();

  // Mock del módulo de API
  await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
    documentosApiSlice: {
      reducerPath: 'documentosApi',
      reducer: (state: unknown = {}) => state,
      middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
    },
    useGetDadoresQuery: () => ({ data: { list: mockDadores }, isLoading: false, refetch: jest.fn() }),
    useGetDefaultsQuery: () => ({ data: mockDefaults, isLoading: false }),
    useGetEquipoKpisQuery: () => ({ data: mockKpis, isLoading: false }),
    useGetClientsQuery: () => ({ data: { list: mockClients }, isLoading: false }),
    useGetEmpresasTransportistasQuery: () => ({ data: mockEmpresasTransp, isLoading: false }),
    useGetEquipoHistoryQuery: () => ({ data: [], isLoading: false }),
    useSearchEquiposQuery: () => ({ data: [], isLoading: false }),
    useGetEquipoComplianceQuery: (...args: unknown[]) => mockUseGetEquipoComplianceQuery(...args),
    useLazyGetEquipoComplianceQuery: () => [jest.fn().mockResolvedValue({ data: {} }), { isFetching: false }],
    useGetEquiposQuery: (...args: unknown[]) => mockUseGetEquiposQuery(...args),
    useGetChoferesQuery: () => ({ data: mockChoferes.data, pagination: mockChoferes.pagination, isLoading: false }),
    useGetCamionesQuery: () => ({ data: mockCamiones.data, pagination: mockCamiones.pagination, isLoading: false }),
    useGetAcopladosQuery: () => ({ data: mockAcoplados.data, pagination: mockAcoplados.pagination, isLoading: false }),
    useCreateEquipoMutation: () => [jest.fn().mockResolvedValue({ data: { id: 1 } }), { isLoading: false }],
    useUpdateEquipoMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { isLoading: false }],
    useDeleteEquipoMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { isLoading: false }],
    useAssociateEquipoClienteMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { isLoading: false }],
    useAttachEquipoComponentsMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { isLoading: false }],
    useDetachEquipoComponentsMutation: () => [jest.fn().mockResolvedValue({ data: {} }), { isLoading: false }],
    useCreateChoferMutation: () => [jest.fn().mockResolvedValue({ data: { id: 1 } }), { isLoading: false }],
    useCreateCamionMutation: () => [jest.fn().mockResolvedValue({ data: { id: 1 } }), { isLoading: false }],
    useCreateAcopladoMutation: () => [jest.fn().mockResolvedValue({ data: { id: 1 } }), { isLoading: false }],
    useImportCsvEquiposMutation: () => [jest.fn().mockResolvedValue({ data: { created: 1, total: 1 } }), { isLoading: false }],
  }));

  // Setup global mocks
  global.URL.createObjectURL = jest.fn(() => 'mocked-blob-url');
  global.URL.revokeObjectURL = jest.fn();
  (globalThis as any).alert = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirm = jest.fn().mockResolvedValue(true);

  // Valores por defecto de los mocks
  mockUseGetEquiposQuery.mockReturnValue({
    data: mockEquipos,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  });
  mockUseGetEquipoComplianceQuery.mockReturnValue({
    data: null,
  });
});

// =============================================================================
// STORE SETUP
// =============================================================================

function createMockStore() {
  return configureStore({
    reducer: {
      auth: (state = {
        user: { id: 1, name: 'Admin', role: 'SUPERADMIN', empresaId: 1 },
        token: 'mock-token',
        isAuthenticated: true,
        initialized: true,
      }) => state,
      [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(documentosApiSlice.middleware),
  });
}

// =============================================================================
// HELPER - Render con MemoryRouter y Redux Provider
// =============================================================================

async function renderEquiposPage() {
  const { EquiposPage } = await import('../EquiposPage');
  const store = createMockStore();
  const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

  return render(
    <Provider store={store}>
      <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
        <MemoryRouter initialEntries={['/documentos/equipos']}>
          <EquiposPage />
        </MemoryRouter>
      </ConfirmContext.Provider>
    </Provider>
  );
}

// =============================================================================
// TESTS - EquipoSemaforo
// =============================================================================
describe('EquiposPage - EquipoSemaforo', () => {
  it('no renderiza nada cuando no hay datos de compliance', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({ data: null });

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: jest.fn() }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    await waitFor(() => {
      const semaforos = screen.queryAllByText('Faltantes');
      expect(semaforos.length).toBe(0);
    });
  });

  it('calcula correctamente estado OK (vigente)', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'CHOFER', state: 'OK', templateId: 1 },
            ],
          },
        ],
        documents: {
          CHOFER: [
            { id: 1, templateId: 1, status: 'APROBADO', expiresAt: new Date(Date.now() + 86400000).toISOString() },
          ],
        },
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Count of vigentes
    });
  });

  it('calcula correctamente estado PROXIMO (por vencer)', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'CHOFER', state: 'PROXIMO', templateId: 1 },
            ],
          },
        ],
        documents: {},
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Por vencer')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Count of por vencer
    });
  });

  it('calcula FALTANTE cuando no existe documento y no está vencido', async () => {
    const now = Date.now();
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'CHOFER', state: 'FALTANTE', templateId: 1 },
            ],
          },
        ],
        documents: {
          CHOFER: [
            {
              id: 1,
              templateId: 1,
              status: 'VIGENTE',
              expiresAt: new Date(now + 86400000).toISOString(),
            },
          ],
        },
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Faltantes')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Count of faltantes
    });
  });

  it('calcula VENCIDO cuando documento existe y está vencido', async () => {
    const now = Date.now();
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'CHOFER', state: 'FALTANTE', templateId: 1 },
            ],
          },
        ],
        documents: {
          CHOFER: [
            {
              id: 1,
              templateId: 1,
              status: 'VENCIDO',
              expiresAt: new Date(now - 86400000).toISOString(),
            },
          ],
        },
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Count of vencidos
    });
  });

  it('calcula VENCIDO cuando expiresAt está en el pasado', async () => {
    const now = Date.now();
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'CHOFER', state: 'FALTANTE', templateId: 1 },
            ],
          },
        ],
        documents: {
          CHOFER: [
            {
              id: 1,
              templateId: 1,
              status: 'VIGENTE',
              expiresAt: new Date(now - 1000).toISOString(),
            },
          ],
        },
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
    });
  });

  it('maneja múltiples entidades simultáneamente', async () => {
    const now = Date.now();
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'CHOFER', state: 'OK', templateId: 1 },
              { entityType: 'CAMION', state: 'PROXIMO', templateId: 2 },
              { entityType: 'ACOPLADO', state: 'FALTANTE', templateId: 3 },
            ],
          },
        ],
        documents: {
          CHOFER: [
            { id: 1, templateId: 1, status: 'APROBADO', expiresAt: new Date(now + 86400000).toISOString() },
          ],
          CAMION: [
            { id: 2, templateId: 2, status: 'VIGENTE', expiresAt: new Date(now - 86400000).toISOString() },
          ],
        },
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
      expect(screen.getByText('Por vencer')).toBeInTheDocument();
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
      expect(screen.getByText('Faltantes')).toBeInTheDocument();
    });
  });

  it('maneja estructura de clientes vacía sin errores', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [],
        documents: {},
      },
    });

    await renderEquiposPage();

    // No debe lanzar error
    await waitFor(() => {
      expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
    });
  });

  it('maneja estructura de compliance vacía sin errores', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          { compliance: [] },
        ],
        documents: {},
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
    });
  });

  it('maneja documentos undefined sin errores', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'CHOFER', state: 'FALTANTE', templateId: 1 },
            ],
          },
        ],
        documents: undefined as unknown as Record<string, unknown[]>,
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Faltantes')).toBeInTheDocument();
    });
  });

  it('ignora entidades no reconocidas en compliance', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [
              { entityType: 'UNKNOWN_ENTITY', state: 'OK', templateId: 99 },
            ],
          },
        ],
        documents: {},
      },
    });

    await renderEquiposPage();

    // No debe lanzar error, simplemente no cuenta
    await waitFor(() => {
      expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// TESTS - Cambio de estado de equipos (activar/desactivar)
// =============================================================================
describe('EquiposPage - Cambio de estado de equipos', () => {
  it('activa equipo finalizado sin confirmación', async () => {
    const user = userEvent.setup();
    const updateEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseUpdateEquipoMutation.mockReturnValue([updateEquipo, { isLoading: false }]);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const activateBtns = screen.getAllByText('Activar');
    await user.click(activateBtns[0]);

    await waitFor(() => {
      expect(updateEquipo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 2,
          estado: 'activa',
        })
      );
    });
  });

  it('desactiva equipo activo con confirmación', async () => {
    const user = userEvent.setup();
    const updateEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseUpdateEquipoMutation.mockReturnValue([updateEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(true);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deactivateBtns = screen.getAllByText('Desactivar');
    await user.click(deactivateBtns[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Desactivar equipo',
          message: expect.stringContaining('#1'),
          confirmText: 'Desactivar',
          variant: 'danger',
        })
      );
    });
  });

  it('no desactiva equipo si usuario cancela confirmación', async () => {
    const user = userEvent.setup();
    const updateEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseUpdateEquipoMutation.mockReturnValue([updateEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(false);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deactivateBtns = screen.getAllByText('Desactivar');
    await user.click(deactivateBtns[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(updateEquipo).not.toHaveBeenCalled();
    });
  });

  it('desactiva equipo después de confirmación', async () => {
    const user = userEvent.setup();
    const updateEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseUpdateEquipoMutation.mockReturnValue([updateEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(true);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deactivateBtns = screen.getAllByText('Desactivar');
    await user.click(deactivateBtns[0]);

    await waitFor(() => {
      expect(updateEquipo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          estado: 'finalizada',
        })
      );
    });
  });
});

// =============================================================================
// TESTS - Eliminación de equipos
// =============================================================================
describe('EquiposPage - Eliminación de equipos', () => {
  it('muestra confirmación al eliminar equipo', async () => {
    const user = userEvent.setup();
    const deleteEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseDeleteEquipoMutation.mockReturnValue([deleteEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(true);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deleteBtns = screen.getAllByText('Eliminar');
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eliminar equipo',
          message: expect.stringContaining('¿Eliminar equipo #1?'),
          confirmText: 'Eliminar',
          variant: 'danger',
        })
      );
    });
  });

  it('no elimina equipo si usuario cancela confirmación', async () => {
    const user = userEvent.setup();
    const deleteEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseDeleteEquipoMutation.mockReturnValue([deleteEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(false);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deleteBtns = screen.getAllByText('Eliminar');
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(deleteEquipo).not.toHaveBeenCalled();
    });
  });

  it('elimina equipo después de confirmación', async () => {
    const user = userEvent.setup();
    const deleteEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseDeleteEquipoMutation.mockReturnValue([deleteEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(true);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deleteBtns = screen.getAllByText('Eliminar');
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect(deleteEquipo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
        })
      );
    });
  });
});

// =============================================================================
// TESTS - Actualización de estado de equipo
// =============================================================================
describe('EquiposPage - Actualización de estado', () => {
  it('muestra mensaje de éxito al activar equipo', async () => {
    const user = userEvent.setup();
    const updateEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseUpdateEquipoMutation.mockReturnValue([updateEquipo, { isLoading: false }]);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: jest.fn() }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const activateBtns = screen.getAllByText('Activar');
    await user.click(activateBtns[0]);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('Equipo activado'),
        'success'
      );
    });
  });

  it('muestra mensaje de éxito al desactivar equipo', async () => {
    const user = userEvent.setup();
    const updateEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseUpdateEquipoMutation.mockReturnValue([updateEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(true);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deactivateBtns = screen.getAllByText('Desactivar');
    await user.click(deactivateBtns[0]);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('Equipo desactivado'),
        'success'
      );
    });
  });

  it('muestra mensaje de éxito al eliminar equipo', async () => {
    const user = userEvent.setup();
    const deleteEquipo = jest.fn().mockResolvedValue({ data: {} });

    mockUseDeleteEquipoMutation.mockReturnValue([deleteEquipo, { isLoading: false }]);
    mockConfirm = jest.fn().mockResolvedValue(true);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const deleteBtns = screen.getAllByText('Eliminar');
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('Equipo eliminado'),
        'success'
      );
    });
  });
});
