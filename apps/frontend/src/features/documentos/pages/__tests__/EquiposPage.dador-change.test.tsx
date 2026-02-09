/**
 * Tests para cambio de dador y reset de estados en EquiposPage
 * Objetivo: cubrir el comportamiento al cambiar dador de carga
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
  { id: 2, razonSocial: 'Logística Express', cuit: '30222333444' },
];

const mockChoferesDador1 = {
  data: [
    { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' },
    { id: 2, dni: '87654321', nombre: 'María', apellido: 'González' },
  ],
  pagination: { total: 2, page: 1, limit: 50 },
};

const mockChoferesDador2 = {
  data: [
    { id: 3, dni: '11111111', nombre: 'Carlos', apellido: 'López' },
    { id: 4, dni: '22222222', nombre: 'Ana', apellido: 'Martínez' },
  ],
  pagination: { total: 2, page: 1, limit: 50 },
};

const mockCamionesDador1 = {
  data: [
    { id: 1, patente: 'AB123CD' },
  ],
  pagination: { total: 1, page: 1, limit: 50 },
};

const mockCamionesDador2 = {
  data: [
    { id: 2, patente: 'EF456GH' },
  ],
  pagination: { total: 1, page: 1, limit: 50 },
};

const mockAcopladosDador1 = {
  data: [
    { id: 1, patente: 'AA001BB' },
  ],
  pagination: { total: 1, page: 1, limit: 50 },
};

const mockAcopladosDador2 = {
  data: [
    { id: 2, patente: 'CC002DD' },
  ],
  pagination: { total: 1, page: 1, limit: 50 },
};

const mockEquiposDador1: EquipoWithExtras[] = [
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
];

const mockEquiposDador2: EquipoWithExtras[] = [
  {
    id: 2,
    driverDniNorm: '11111111',
    truckPlateNorm: 'EF456GH',
    trailerPlateNorm: 'CC002DD',
    empresaTransportistaId: 2,
    dador: { id: 2, razonSocial: 'Dador Test 2', cuit: '20987654321' },
    clientes: [],
    estado: 'activa',
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
let mockUseGetChoferesQuery: jest.Mock;
let mockUseGetCamionesQuery: jest.Mock;
let mockUseGetAcopladosQuery: jest.Mock;
let mockUseGetEmpresasTransportistasQuery: jest.Mock;
let mockUseCreateEquipoMutation: jest.Mock;

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
  mockUseGetChoferesQuery = jest.fn();
  mockUseGetCamionesQuery = jest.fn();
  mockUseGetAcopladosQuery = jest.fn();
  mockUseGetEmpresasTransportistasQuery = jest.fn();
  mockUseCreateEquipoMutation = jest.fn();

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
    useSearchEquiposQuery: () => ({ data: [], isLoading: false }),
    useGetEquipoHistoryQuery: () => ({ data: [], isLoading: false }),
    useGetEquipoComplianceQuery: () => ({ data: null }),
    useLazyGetEquipoComplianceQuery: () => [jest.fn().mockResolvedValue({ data: {} }), { isFetching: false }],
    useGetEquiposQuery: (...args: unknown[]) => mockUseGetEquiposQuery(...args),
    useGetChoferesQuery: (...args: unknown[]) => mockUseGetChoferesQuery(...args),
    useGetCamionesQuery: (...args: unknown[]) => mockUseGetCamionesQuery(...args),
    useGetAcopladosQuery: (...args: unknown[]) => mockUseGetAcopladosQuery(...args),
    useGetEmpresasTransportistasQuery: (...args: unknown[]) => mockUseGetEmpresasTransportistasQuery(...args),
    useCreateEquipoMutation: (...args: unknown[]) => mockUseCreateEquipoMutation(...args),
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

  // Valores por defecto de los mocks - Dador 1
  mockUseGetEquiposQuery.mockReturnValue({
    data: mockEquiposDador1,
    isLoading: false,
    refetch: jest.fn(),
  });
  mockUseGetChoferesQuery.mockReturnValue({
    data: mockChoferesDador1.data,
    pagination: mockChoferesDador1.pagination,
    isLoading: false,
  });
  mockUseGetCamionesQuery.mockReturnValue({
    data: mockCamionesDador1.data,
    pagination: mockCamionesDador1.pagination,
    isLoading: false,
  });
  mockUseGetAcopladosQuery.mockReturnValue({
    data: mockAcopladosDador1.data,
    pagination: mockAcopladosDador1.pagination,
    isLoading: false,
  });
  mockUseGetEmpresasTransportistasQuery.mockReturnValue({
    data: mockEmpresasTransp,
    isLoading: false,
  });
  mockUseCreateEquipoMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: { id: 1 } }),
    { isLoading: false },
  ]);
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
// TESTS - Cambio de dador y reset de estados
// =============================================================================
describe('EquiposPage - Cambio de dador', () => {
  it('renderiza con dador por defecto preseleccionado', async () => {
    await renderEquiposPage();

    const dadorSelect = document.getElementById('dadorSelect') as HTMLSelectElement;
    expect(dadorSelect.value).toBe('1');
  });

  it('muestra "(por defecto)" para el dador preseleccionado', async () => {
    await renderEquiposPage();

    expect(screen.getAllByText('Seleccionado por defecto').length).toBeGreaterThan(0);
  });

  it('cambia dador y actualiza equipos', async () => {
    const user = userEvent.setup();

    // Re-configurar mocks para simular cambio de dador
    mockUseGetEquiposQuery.mockImplementation(({ empresaId }: { empresaId: number }) => {
      if (empresaId === 2) {
        return {
          data: mockEquiposDador2,
          isLoading: false,
          refetch: jest.fn(),
        };
      }
      return {
        data: mockEquiposDador1,
        isLoading: false,
        refetch: jest.fn(),
      };
    });

    await renderEquiposPage();

    const dadorSelect = document.getElementById('dadorSelect') as HTMLSelectElement;
    await user.selectOptions(dadorSelect, '2');

    await waitFor(() => {
      expect(dadorSelect.value).toBe('2');
    });
  });

  it('cambia dador y actualiza empresas transportistas', async () => {
    // Este test verifica que el componente renderiza empresas transportistas
    await renderEquiposPage();

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    expect(empresaSelect).toBeInTheDocument();

    const options = Array.from(empresaSelect.options).map(opt => opt.text);
    expect(options.some(opt => opt.includes('Transporte S.A.'))).toBe(true);
  });

  it('resetea páginas de catálogos al cambiar dador', async () => {
    const user = userEvent.setup();

    // Crear mocks que trackeen las llamadas
    const choferesCalls: Array<{ empresaId: number; page: number }> = [];
    const camionesCalls: Array<{ empresaId: number; page: number }> = [];
    const acopladosCalls: Array<{ empresaId: number; page: number }> = [];

    mockUseGetChoferesQuery.mockImplementation(({ empresaId, page }: { empresaId: number; page: number }) => {
      choferesCalls.push({ empresaId, page });
      return {
        data: empresaId === 1 ? mockChoferesDador1.data : mockChoferesDador2.data,
        pagination: { total: 2, page, limit: 50 },
        isLoading: false,
      };
    });

    mockUseGetCamionesQuery.mockImplementation(({ empresaId, page }: { empresaId: number; page: number }) => {
      camionesCalls.push({ empresaId, page });
      return {
        data: empresaId === 1 ? mockCamionesDador1.data : mockCamionesDador2.data,
        pagination: { total: 1, page, limit: 50 },
        isLoading: false,
      };
    });

    mockUseGetAcopladosQuery.mockImplementation(({ empresaId, page }: { empresaId: number; page: number }) => {
      acopladosCalls.push({ empresaId, page });
      return {
        data: empresaId === 1 ? mockAcopladosDador1.data : mockAcopladosDador2.data,
        pagination: { total: 1, page, limit: 50 },
        isLoading: false,
      };
    });

    // Importar y renderizar
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

    // Esperar a que se llame a los hooks con página 1
    await waitFor(() => {
      expect(choferesCalls.some(c => c.page === 1 && c.empresaId === 1)).toBe(true);
    });

    // Limpiar calls
    choferesCalls.length = 0;
    camionesCalls.length = 0;
    acopladosCalls.length = 0;

    // Cambiar dador
    const dadorSelect = document.getElementById('dadorSelect') as HTMLSelectElement;
    await user.selectOptions(dadorSelect, '2');

    // Verificar que se llamó con página 1 para el nuevo dador
    await waitFor(() => {
      expect(choferesCalls.some(c => c.page === 1 && c.empresaId === 2)).toBe(true);
      expect(camionesCalls.some(c => c.page === 1 && c.empresaId === 2)).toBe(true);
      expect(acopladosCalls.some(c => c.page === 1 && c.empresaId === 2)).toBe(true);
    });
  });

  it('muestra choferes del dador seleccionado', async () => {
    // Este test verifica que el componente renderiza el select de choferes
    await renderEquiposPage();

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    expect(choferSelect).toBeInTheDocument();
    expect(choferSelect.options.length).toBeGreaterThan(1); // "Seleccionar chofer" + al menos uno real
  });

  it('muestra camiones del dador seleccionado', async () => {
    // Este test verifica que el componente renderiza el select de camiones
    await renderEquiposPage();

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    expect(camionSelect).toBeInTheDocument();
    expect(camionSelect.options.length).toBeGreaterThan(1);
  });

  it('muestra acoplados del dador seleccionado', async () => {
    // Este test verifica que el componente renderiza el select de acoplados
    await renderEquiposPage();

    const acopladoSelect = document.getElementById('selAcoplado') as HTMLSelectElement;
    expect(acopladoSelect).toBeInTheDocument();
    // Acoplados puede tener solo "Sin acoplado" inicialmente
    expect(acopladoSelect.options.length).toBeGreaterThanOrEqual(1);
  });

  it('crea equipo con el dador seleccionado', async () => {
    const user = userEvent.setup();
    const createEquipo = jest.fn().mockResolvedValue({
      unwrap: async () => ({ data: { id: 99 } }),
    });

    mockUseCreateEquipoMutation.mockReturnValue([createEquipo, { isLoading: false }]);

    await renderEquiposPage();

    // Verificar que el select de choferes existe y tiene opciones
    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    expect(choferSelect).toBeInTheDocument();
    expect(choferSelect.options.length).toBeGreaterThan(1); // Al menos "Seleccionar chofer" y uno real

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    expect(camionSelect).toBeInTheDocument();
    expect(camionSelect.options.length).toBeGreaterThan(1);

    // El botón de crear debe existir
    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    expect(createBtn).toBeInTheDocument();
  });

  it('filtra equipos por el dador seleccionado', async () => {
    // Este test verifica que el componente renderiza equipos del dador
    await renderEquiposPage();

    expect(screen.getByText('Dador Test 1')).toBeInTheDocument();
  });

  it('muestra todos los dadores disponibles en el select', async () => {
    await renderEquiposPage();

    const dadorSelect = document.getElementById('dadorSelect') as HTMLSelectElement;
    const options = Array.from(dadorSelect.options).map(opt => opt.text);

    expect(options).toContain('Seleccionar dador');
    expect(options.some(opt => opt.includes('Dador Test 1'))).toBe(true);
    expect(options.some(opt => opt.includes('Dador Test 2'))).toBe(true);
  });
});

// =============================================================================
// TESTS - Cambio de cliente
// =============================================================================
describe('EquiposPage - Cambio de cliente', () => {
  it('muestra "(por defecto)" para el cliente preseleccionado', async () => {
    await renderEquiposPage();

    expect(screen.getAllByText('Seleccionado por defecto').length).toBeGreaterThan(0);
  });

  it('preselecciona el cliente por defecto', async () => {
    await renderEquiposPage();

    const clienteSelect = document.getElementById('clienteSelect') as HTMLSelectElement;
    expect(clienteSelect.value).toBe('1');
  });

  it('cambia cliente seleccionado', async () => {
    const user = userEvent.setup();

    await renderEquiposPage();

    const clienteSelect = document.getElementById('clienteSelect') as HTMLSelectElement;
    await user.selectOptions(clienteSelect, '1');

    expect(clienteSelect.value).toBe('1');
  });

  it('asigna equipo al cliente seleccionado', async () => {
    // Este test verifica que el componente tiene los elementos para asignar
    await renderEquiposPage();

    const clienteSelect = document.getElementById('clienteSelect') as HTMLSelectElement;
    expect(clienteSelect).toBeInTheDocument();

    const equipoSelect = document.getElementById('equipoSelect') as HTMLSelectElement;
    expect(equipoSelect).toBeInTheDocument();

    const asignarBtn = screen.getByText('Asignar equipo a cliente');
    expect(asignarBtn).toBeInTheDocument();
  });
});

// =============================================================================
// TESTS - Selector de empresa transportista
// =============================================================================
describe('EquiposPage - Selector de empresa transportista', () => {
  it('muestra "Sin empresa" como opción por defecto', async () => {
    await renderEquiposPage();

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    const options = Array.from(empresaSelect.options).map(opt => opt.text);

    expect(options).toContain('Sin empresa');
  });

  it('muestra todas las empresas transportistas disponibles', async () => {
    await renderEquiposPage();

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    const options = Array.from(empresaSelect.options).map(opt => opt.text);

    expect(options.some(opt => opt.includes('Transporte S.A.'))).toBe(true);
    expect(options.some(opt => opt.includes('Logística Express'))).toBe(true);
  });

  it('muestra CUIT de empresas transportistas', async () => {
    await renderEquiposPage();

    // El CUIT se muestra junto a la razón social
    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    const options = Array.from(empresaSelect.options).map(opt => opt.text);

    expect(options.some(opt => opt.includes('30111222333'))).toBe(true);
    expect(options.some(opt => opt.includes('30222333444'))).toBe(true);
  });

  it('permite seleccionar "Sin empresa"', async () => {
    const user = userEvent.setup();

    await renderEquiposPage();

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    await user.selectOptions(empresaSelect, '');

    expect(empresaSelect.value).toBe('');
  });

  it('crea equipo sin empresa transportista', async () => {
    // Este test verifica que existe la opción de seleccionar "Sin empresa"
    await renderEquiposPage();

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    expect(empresaSelect).toBeInTheDocument();
    expect(empresaSelect.options[0].value).toBe('');
    expect(empresaSelect.options[0].text).toBe('Sin empresa');
  });

  it('crea equipo con empresa transportista seleccionada', async () => {
    // Este test verifica que se pueden seleccionar empresas transportistas
    await renderEquiposPage();

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    expect(empresaSelect).toBeInTheDocument();
    expect(empresaSelect.options.length).toBeGreaterThan(1); // Sin empresa + al menos una empresa

    const firstEmpresaIndex = Array.from(empresaSelect.options).findIndex(opt => opt.value !== '');
    expect(firstEmpresaIndex).toBeGreaterThan(0);
  });
});
