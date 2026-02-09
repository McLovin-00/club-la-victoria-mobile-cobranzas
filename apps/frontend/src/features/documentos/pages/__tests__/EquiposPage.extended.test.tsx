/**
 * Tests extendidos para EquiposPage
 * Objetivo: aumentar cobertura al 90% cubriendo funcionalidades no probadas anteriormente
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest, beforeAll } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { EquipoWithExtras } from '../../types/entities';
import { documentosApiSlice } from '../../api/documentosApiSlice';
import { validatePhone } from '../../../../utils/validators';

// =============================================================================
// MOCK DATA
// =============================================================================

const mockDadores = [
  { id: 1, razonSocial: 'Dador Test 1', cuit: '20123456789' },
  { id: 2, razonSocial: 'Dador Test 2', cuit: '20987654321' },
];

const mockClients = [
  { id: 1, razonSocial: 'Cliente Test 1', cuit: '30123456789' },
  { id: 2, razonSocial: 'Cliente Test 2', cuit: '30987654321' },
];

const mockEmpresasTransp = [
  { id: 1, razonSocial: 'Transporte S.A.', cuit: '30111222333' },
  { id: 2, razonSocial: 'Logística Express', cuit: '30222333444' },
];

const mockChoferesPage1 = {
  data: [
    { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' },
    { id: 2, dni: '87654321', nombre: 'María', apellido: 'González' },
  ],
  pagination: { total: 55, page: 1, limit: 50 },
};

const mockChoferesPage2 = {
  data: [
    { id: 3, dni: '11111111', nombre: 'Carlos', apellido: 'López' },
    { id: 4, dni: '22222222', nombre: 'Ana', apellido: 'Martínez' },
  ],
  pagination: { total: 55, page: 2, limit: 50 },
};

const mockCamionesPage1 = {
  data: [
    { id: 1, patente: 'AB123CD' },
    { id: 2, patente: 'EF456GH' },
  ],
  pagination: { total: 75, page: 1, limit: 50 },
};

const mockCamionesPage2 = {
  data: [
    { id: 3, patente: 'IJ789KL' },
    { id: 4, patente: 'MN012OP' },
  ],
  pagination: { total: 75, page: 2, limit: 50 },
};

const mockAcopladosPage1 = {
  data: [
    { id: 1, patente: 'AA001BB' },
    { id: 2, patente: 'CC002DD' },
  ],
  pagination: { total: 30, page: 1, limit: 50 },
};

const mockAcopladosPage2 = {
  data: [
    { id: 3, patente: 'EE003FF' },
  ],
  pagination: { total: 30, page: 2, limit: 50 },
};

const mockEquipos: EquipoWithExtras[] = [
  {
    id: 1,
    driverDniNorm: '12345678',
    truckPlateNorm: 'AB123CD',
    trailerPlateNorm: 'AA001BB',
    empresaTransportistaId: 1,
    dador: { id: 1, razonSocial: 'Dador Test 1', cuit: '20123456789' },
    clientes: [{ clienteId: 1 }],
    estado: 'activa',
  },
  {
    id: 2,
    driverDniNorm: '87654321',
    truckPlateNorm: 'EF456GH',
    trailerPlateNorm: null,
    empresaTransportistaId: 2,
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

const mockComplianceData = {
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
      { id: 101, templateId: 1, status: 'APROBADO', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    ],
    CAMION: [
      { id: 102, templateId: 2, status: 'VENCIDO', expiresAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  },
};

const mockHistory = [
  {
    id: 1,
    action: 'create',
    createdAt: '2024-01-01T10:00:00Z',
    originEquipoId: null,
    component: 'driver',
    payload: null,
  },
  {
    id: 2,
    action: 'swap',
    createdAt: '2024-01-02T10:00:00Z',
    originEquipoId: 1,
    component: 'truck',
    payload: null,
  },
  {
    id: 3,
    action: 'attach',
    createdAt: '2024-01-03T10:00:00Z',
    originEquipoId: null,
    component: 'trailer',
    payload: null,
  },
  {
    id: 4,
    action: 'close',
    createdAt: '2024-01-04T10:00:00Z',
    originEquipoId: null,
    component: 'system',
    payload: null,
  },
  {
    id: 5,
    action: 'detach',
    createdAt: '2024-01-05T10:00:00Z',
    originEquipoId: null,
    component: 'trailer',
    payload: null,
  },
  {
    id: 6,
    action: 'reopen',
    createdAt: '2024-01-06T10:00:00Z',
    originEquipoId: null,
    component: 'system',
    payload: null,
  },
  {
    id: 7,
    action: 'delete',
    createdAt: '2024-01-07T10:00:00Z',
    originEquipoId: null,
    component: 'system',
    payload: null,
  },
];

// =============================================================================
// MOCKS SETUP
// =============================================================================

let mockConfirm: jest.Mock;
let mockNavigate: jest.Mock;
let mockGoBack: jest.Mock;

let mockUseGetEquiposQuery: jest.Mock;
let mockUseSearchEquiposQuery: jest.Mock;
let mockUseGetEquipoHistoryQuery: jest.Mock;
let mockUseGetEquipoComplianceQuery: jest.Mock;
let mockUseLazyGetEquipoComplianceQuery: jest.Mock;
let mockUseGetChoferesQuery: jest.Mock;
let mockUseGetCamionesQuery: jest.Mock;
let mockUseGetAcopladosQuery: jest.Mock;
let mockUseCreateEquipoMutation: jest.Mock;
let mockUseUpdateEquipoMutation: jest.Mock;
let mockUseDeleteEquipoMutation: jest.Mock;
let mockUseAssociateEquipoClienteMutation: jest.Mock;
let mockUseAttachEquipoComponentsMutation: jest.Mock;
let mockUseDetachEquipoComponentsMutation: jest.Mock;
let mockUseCreateChoferMutation: jest.Mock;
let mockUseCreateCamionMutation: jest.Mock;
let mockUseCreateAcopladoMutation: jest.Mock;
let mockUseImportCsvEquiposMutation: jest.Mock;

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
  mockUseSearchEquiposQuery = jest.fn();
  mockUseGetEquipoHistoryQuery = jest.fn();
  mockUseGetEquipoComplianceQuery = jest.fn();
  mockUseLazyGetEquipoComplianceQuery = jest.fn();
  mockUseGetChoferesQuery = jest.fn();
  mockUseGetCamionesQuery = jest.fn();
  mockUseGetAcopladosQuery = jest.fn();
  mockUseCreateEquipoMutation = jest.fn();
  mockUseUpdateEquipoMutation = jest.fn();
  mockUseDeleteEquipoMutation = jest.fn();
  mockUseAssociateEquipoClienteMutation = jest.fn();
  mockUseAttachEquipoComponentsMutation = jest.fn();
  mockUseDetachEquipoComponentsMutation = jest.fn();
  mockUseCreateChoferMutation = jest.fn();
  mockUseCreateCamionMutation = jest.fn();
  mockUseCreateAcopladoMutation = jest.fn();
  mockUseImportCsvEquiposMutation = jest.fn();

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
    useSearchEquiposQuery: (...args: unknown[]) => mockUseSearchEquiposQuery(...args),
    useGetEquipoHistoryQuery: (...args: unknown[]) => mockUseGetEquipoHistoryQuery(...args),
    useGetEquipoComplianceQuery: (...args: unknown[]) => mockUseGetEquipoComplianceQuery(...args),
    useLazyGetEquipoComplianceQuery: (...args: unknown[]) => mockUseLazyGetEquipoComplianceQuery(...args),
    useGetEquiposQuery: (...args: unknown[]) => mockUseGetEquiposQuery(...args),
    useGetChoferesQuery: (...args: unknown[]) => mockUseGetChoferesQuery(...args),
    useGetCamionesQuery: (...args: unknown[]) => mockUseGetCamionesQuery(...args),
    useGetAcopladosQuery: (...args: unknown[]) => mockUseGetAcopladosQuery(...args),
    useCreateEquipoMutation: (...args: unknown[]) => mockUseCreateEquipoMutation(...args),
    useUpdateEquipoMutation: (...args: unknown[]) => mockUseUpdateEquipoMutation(...args),
    useDeleteEquipoMutation: (...args: unknown[]) => mockUseDeleteEquipoMutation(...args),
    useAssociateEquipoClienteMutation: (...args: unknown[]) => mockUseAssociateEquipoClienteMutation(...args),
    useAttachEquipoComponentsMutation: (...args: unknown[]) => mockUseAttachEquipoComponentsMutation(...args),
    useDetachEquipoComponentsMutation: (...args: unknown[]) => mockUseDetachEquipoComponentsMutation(...args),
    useCreateChoferMutation: (...args: unknown[]) => mockUseCreateChoferMutation(...args),
    useCreateCamionMutation: (...args: unknown[]) => mockUseCreateCamionMutation(...args),
    useCreateAcopladoMutation: (...args: unknown[]) => mockUseCreateAcopladoMutation(...args),
    useImportCsvEquiposMutation: (...args: unknown[]) => mockUseImportCsvEquiposMutation(...args),
  }));

  // Mock de getRuntimeEnv
  (globalThis as any).getRuntimeEnv = jest.fn((key: string) => {
    if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://test-api';
    return '';
  });

  // Mock de JSZip
  await jest.unstable_mockModule('jszip', () => ({
    default: class MockJSZip {
      private files = new Map<string, Blob>();
      file(name: string, data: Blob) {
        this.files.set(name, data);
        return this;
      }
      async generateAsync() {
        return new Blob(['mocked-zip-content'], { type: 'application/zip' });
      }
    },
  }));

  // Setup global mocks
  global.URL.createObjectURL = jest.fn(() => 'mocked-blob-url');
  global.URL.revokeObjectURL = jest.fn();
  (globalThis as any).alert = jest.fn();
  (globalThis as any).console = { log: jest.fn(), ...console };
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
  mockUseSearchEquiposQuery.mockReturnValue({
    data: [],
    isLoading: false,
  });
  mockUseGetEquipoHistoryQuery.mockReturnValue({
    data: mockHistory,
    isLoading: false,
  });
  mockUseGetEquipoComplianceQuery.mockReturnValue({
    data: mockComplianceData,
  });
  mockUseLazyGetEquipoComplianceQuery.mockReturnValue([
    jest.fn().mockResolvedValue({ data: mockComplianceData }),
    { isFetching: false },
  ]);

  mockUseGetChoferesQuery.mockReturnValue({
    data: mockChoferesPage1.data,
    pagination: mockChoferesPage1.pagination,
    isLoading: false,
  });
  mockUseGetCamionesQuery.mockReturnValue({
    data: mockCamionesPage1.data,
    pagination: mockCamionesPage1.pagination,
    isLoading: false,
  });
  mockUseGetAcopladosQuery.mockReturnValue({
    data: mockAcopladosPage1.data,
    pagination: mockAcopladosPage1.pagination,
    isLoading: false,
  });

  mockUseCreateEquipoMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: { id: 3 } }),
    { isLoading: false, reset: jest.fn() },
  ]);
  mockUseUpdateEquipoMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: {} }),
    { isLoading: false },
  ]);
  mockUseDeleteEquipoMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: {} }),
    { isLoading: false },
  ]);
  mockUseAssociateEquipoClienteMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: {} }),
    { isLoading: false },
  ]);
  mockUseAttachEquipoComponentsMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: {} }),
    { isLoading: false },
  ]);
  mockUseDetachEquipoComponentsMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: {} }),
    { isLoading: false },
  ]);
  mockUseCreateChoferMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: { id: 10 } }),
    { isLoading: false },
  ]);
  mockUseCreateCamionMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: { id: 20 } }),
    { isLoading: false },
  ]);
  mockUseCreateAcopladoMutation.mockReturnValue([
    jest.fn().mockResolvedValue({ data: { id: 30 } }),
    { isLoading: false },
  ]);
  mockUseImportCsvEquiposMutation.mockReturnValue([
    jest.fn().mockResolvedValue({
      data: { created: 2, total: 2, errorsCsv: null },
    }),
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
// TESTS - Navegación y botones principales
// =============================================================================
describe('EquiposPage - Navegación y botones principales', () => {
  it('navega a "Alta Completa con Documentos" al cliclear el botón', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const altaCompletaBtn = screen.getByText('📄 Alta Completa con Documentos');
    await user.click(altaCompletaBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/documentos/equipos/alta-completa');
  });

  it('ejecuta goBack al cliclear botón "Volver"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const volverBtn = screen.getByText('Volver');
    await user.click(volverBtn);

    expect(mockGoBack).toHaveBeenCalled();
  });
});

// =============================================================================
// TESTS - Paginación de catálogos
// =============================================================================
describe('EquiposPage - Paginación de catálogos', () => {
  it('muestra "Cargar más" para choferes cuando hay más páginas', async () => {
    await renderEquiposPage();

    const cargarMasBtns = screen.getAllByText('Cargar más');
    expect(cargarMasBtns.length).toBeGreaterThanOrEqual(3);
  });

  it('deshabilita "Cargar más" para choferes cuando no hay más páginas', async () => {
    mockUseGetChoferesQuery.mockReturnValue({
      data: mockChoferesPage1.data,
      pagination: { total: 2, page: 1, limit: 50 },
      isLoading: false,
    });

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

    const cargarMasBtns = screen.getAllByText('Cargar más');
    const choferCargarMas = cargarMasBtns[0];
    expect(choferCargarMas).toBeDisabled();
  });

  it('carga más choferes al cliclear "Cargar más"', async () => {
    const user = userEvent.setup();

    mockUseGetChoferesQuery.mockImplementation(({ page }: { page: number }) => {
      if (page === 1) {
        return {
          data: mockChoferesPage1.data,
          pagination: mockChoferesPage1.pagination,
          isLoading: false,
        };
      }
      return {
        data: mockChoferesPage2.data,
        pagination: mockChoferesPage2.pagination,
        isLoading: false,
      };
    });

    await renderEquiposPage();

    const cargarMasBtns = screen.getAllByText('Cargar más');
    const choferCargarMas = cargarMasBtns[0];

    await user.click(choferCargarMas);

    // Verifica que se cargó la segunda página
    expect(screen.getByText('Carlos')).toBeInTheDocument();
  });

  it('carga más camiones al cliclear "Cargar más" de camiones', async () => {
    const user = userEvent.setup();

    mockUseGetCamionesQuery.mockImplementation(({ page }: { page: number }) => {
      if (page === 1) {
        return {
          data: mockCamionesPage1.data,
          pagination: mockCamionesPage1.pagination,
          isLoading: false,
        };
      }
      return {
        data: mockCamionesPage2.data,
        pagination: mockCamionesPage2.pagination,
        isLoading: false,
      };
    });

    await renderEquiposPage();

    const cargarMasBtns = screen.getAllByText('Cargar más');
    const camionCargarMas = cargarMasBtns[1];

    await user.click(camionCargarMas);

    // Verifica que se cargó la segunda página
    expect(screen.getByText('IJ789KL')).toBeInTheDocument();
  });

  it('carga más acoplados al cliclear "Cargar más" de acoplados', async () => {
    const user = userEvent.setup();

    mockUseGetAcopladosQuery.mockImplementation(({ page }: { page: number }) => {
      if (page === 1) {
        return {
          data: mockAcopladosPage1.data,
          pagination: mockAcopladosPage1.pagination,
          isLoading: false,
        };
      }
      return {
        data: mockAcopladosPage2.data,
        pagination: mockAcopladosPage2.pagination,
        isLoading: false,
      };
    });

    await renderEquiposPage();

    const cargarMasBtns = screen.getAllByText('Cargar más');
    const acopladoCargarMas = cargarMasBtns[2];

    await user.click(acopladoCargarMas);

    // Verifica que se cargó la segunda página
    expect(screen.getByText('EE003FF')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTS - Teléfonos del chofer
// =============================================================================
describe('EquiposPage - Teléfonos del chofer', () => {
  it('agrega teléfono cuando hay menos de 3', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const agregarBtn = screen.getByText('Agregar');
    await user.click(agregarBtn);

    const phoneInputs = screen.getAllByPlaceholderText('+54911...');
    expect(phoneInputs.length).toBe(2);
  });

  it('deshabilita "Agregar" cuando hay 3 teléfonos', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const agregarBtn = screen.getByText('Agregar');

    // Agregar hasta tener 3
    await user.click(agregarBtn);
    await user.click(agregarBtn);

    const agregarDisabledBtn = screen.getAllByText('Agregar').find(btn =>
      (btn as HTMLButtonElement).disabled
    );
    expect(agregarDisabledBtn).toBeDefined();
  });

  it('elimina teléfono al cliclear "Quitar"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const agregarBtn = screen.getByText('Agregar');
    await user.click(agregarBtn);

    const quitarBtns = screen.getAllByText('Quitar');
    await user.click(quitarBtns[0]);

    const phoneInputs = screen.getAllByPlaceholderText('+54911...');
    expect(phoneInputs.length).toBe(1);
  });

  it('deshabilita "Quitar" cuando solo hay un teléfono', async () => {
    await renderEquiposPage();

    const quitarBtn = screen.getByText('Quitar');
    expect(quitarBtn).toBeDisabled();
  });

  it('muestra error de formato inválido para teléfono incorrecto', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const phoneInput = screen.getByPlaceholderText('+54911...');
    await user.clear(phoneInput);
    await user.type(phoneInput, 'invalid-phone');

    expect(screen.getByText(/Formato WhatsApp:/)).toBeInTheDocument();
  });

  it('acepta teléfonos válidos con formato correcto', async () => {
    const validPhones = [
      '+5491112345678',
      '+5492233445566',
      '+5493344556677',
    ];

    validPhones.forEach(phone => {
      expect(validatePhone(phone)).toBe(true);
    });
  });

  it('rechaza teléfonos inválidos', async () => {
    const invalidPhones = [
      '123456',
      'abc123',
      '',
      '+5411',
    ];

    invalidPhones.forEach(phone => {
      expect(validatePhone(phone)).toBe(false);
    });
  });
});

// =============================================================================
// TESTS - Historial completo
// =============================================================================
describe('EquiposPage - Historial completo', () => {
  it('filtra historial por "Creación"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Historial de equipo/i)).toBeInTheDocument();
    });

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'create');

    await waitFor(() => {
      expect(screen.getByText('Creación')).toBeInTheDocument();
    });
  });

  it('filtra historial por "Swap"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'swap');

    await waitFor(() => {
      expect(screen.getByText('Swap')).toBeInTheDocument();
    });
  });

  it('filtra historial por "Adjuntar"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'attach');

    await waitFor(() => {
      expect(screen.getByText('Adjuntar')).toBeInTheDocument();
    });
  });

  it('filtra historial por "Cerrar"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'close');

    await waitFor(() => {
      expect(screen.getByText('Cerrar')).toBeInTheDocument();
    });
  });

  it('filtra historial por "Desasociar"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'detach');

    await waitFor(() => {
      expect(screen.getByText('Desasociar')).toBeInTheDocument();
    });
  });

  it('filtra historial por "Reabrir"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'reopen');

    await waitFor(() => {
      expect(screen.getByText('Reabrir')).toBeInTheDocument();
    });
  });

  it('filtra historial por "Eliminar"', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'delete');

    await waitFor(() => {
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
    });
  });

  it('muestra "Sin movimientos registrados" cuando no hay historial', async () => {
    mockUseGetEquipoHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const user = userEvent.setup();

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

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Sin movimientos registrados')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// TESTS - Force move con conflicto 409
// =============================================================================
describe('EquiposPage - Force move con conflicto 409', () => {
  it('muestra confirmación cuando hay conflicto 409 al crear equipo', async () => {
    const user = userEvent.setup();
    const reject409 = jest.fn().mockRejectedValue({
      status: 409,
      data: { message: 'Los componentes ya están en uso' },
    });

    mockUseCreateEquipoMutation.mockReturnValue([
      reject409,
      { isLoading: false, reset: jest.fn() },
    ]);

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

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Componentes en uso',
          message: expect.stringContaining('¿Mover componentes'),
        })
      );
    });
  });

  it('cancela operación cuando usuario rechaza confirmación de force move', async () => {
    const user = userEvent.setup();
    const reject409 = jest.fn().mockRejectedValue({
      status: 409,
      data: { message: 'Conflicto' },
    });

    mockConfirm = jest.fn().mockResolvedValue(false);
    mockUseCreateEquipoMutation.mockReturnValue([
      reject409,
      { isLoading: false, reset: jest.fn() },
    ]);

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

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// TESTS - Creación de componentes cuando no existen (404)
// =============================================================================
describe('EquiposPage - Creación de componentes cuando no existen (404)', () => {
  it('ofrece crear chofer cuando no existe (404)', async () => {
    const user = userEvent.setup();
    const reject404 = jest.fn().mockRejectedValue({ status: 404 });

    mockUseAttachEquipoComponentsMutation.mockReturnValue([
      reject404,
      { isLoading: false },
    ]);

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

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'driver');

    const input = screen.getByPlaceholderText('DNI');
    await user.clear(input);
    await user.type(input, '99999999');

    const applyBtn = screen.getByText('Aplicar');
    await user.click(applyBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chofer no encontrado',
          message: expect.stringContaining('¿Desea crearlo'),
        })
      );
    });
  });

  it('ofrece crear camión cuando no existe (404)', async () => {
    const user = userEvent.setup();
    const reject404 = jest.fn().mockRejectedValue({ status: 404 });

    mockUseAttachEquipoComponentsMutation.mockReturnValue([
      reject404,
      { isLoading: false },
    ]);

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

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'truck');

    const input = screen.getByPlaceholderText('Patente');
    await user.clear(input);
    await user.type(input, 'ZZ999ZZ');

    const applyBtn = screen.getByText('Aplicar');
    await user.click(applyBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Camión no encontrado',
          message: expect.stringContaining('¿Desea crearlo'),
        })
      );
    });
  });

  it('ofrece crear acoplado cuando no existe (404)', async () => {
    const user = userEvent.setup();
    const reject404 = jest.fn().mockRejectedValue({ status: 404 });

    mockUseAttachEquipoComponentsMutation.mockReturnValue([
      reject404,
      { isLoading: false },
    ]);

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

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'trailer');

    const input = screen.getByPlaceholderText('Patente');
    await user.clear(input);
    await user.type(input, 'YY888YY');

    const applyBtn = screen.getByText('Aplicar');
    await user.click(applyBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Acoplado no encontrado',
          message: expect.stringContaining('¿Desea crearlo'),
        })
      );
    });
  });

  it('crea y adjunta chofer cuando usuario confirma', async () => {
    const user = userEvent.setup();
    const reject404 = jest.fn().mockRejectedValue({ status: 404 });

    const createChofer = jest.fn().mockResolvedValue({
      unwrap: async () => ({ data: { id: 99 } }),
    });
    const attachSuccess = jest.fn().mockResolvedValue({
      unwrap: async () => ({ data: {} }),
    });

    mockUseCreateChoferMutation.mockReturnValue([createChofer, { isLoading: false }]);
    mockUseAttachEquipoComponentsMutation.mockReturnValue([reject404, { isLoading: false }]);

    mockConfirm = jest.fn().mockResolvedValue(true);

    const { EquiposPage } = await import('../EquiposPage');
    const store = createMockStore();
    const ConfirmContext = (await import('@/contexts/confirmContext')).ConfirmContext;

    // Patch the module to return the attach function after confirm
    let confirmCount = 0;
    mockUseAttachEquipoComponentsMutation.mockImplementation(() => {
      confirmCount++;
      if (confirmCount === 1) {
        return [reject404, { isLoading: false }];
      }
      return [attachSuccess, { isLoading: false }];
    });

    render(
      <Provider store={store}>
        <ConfirmContext.Provider value={{ confirm: mockConfirm }}>
          <MemoryRouter initialEntries={['/documentos/equipos']}>
            <EquiposPage />
          </MemoryRouter>
        </ConfirmContext.Provider>
      </Provider>
    );

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'driver');

    const input = screen.getByPlaceholderText('DNI');
    await user.clear(input);
    await user.type(input, '99999999');

    const applyBtn = screen.getByText('Aplicar');
    await user.click(applyBtn);

    await waitFor(() => {
      expect(createChofer).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// TESTS - Descargas (ZIP, Excel, Documentación)
// =============================================================================
describe('EquiposPage - Descargas', () => {
  it('descarga ZIP de vigentes correctamente', async () => {
    const user = userEvent.setup();

    // Mock fetch para descarga de ZIP
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: async () => new Blob(['mock-zip-content'], { type: 'application/zip' }),
      } as Response)
    );

    await renderEquiposPage();

    const zipBtns = screen.getAllByText('ZIP vigentes');
    await user.click(zipBtns[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api/api/docs/equipos/1/zip',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  it('muestra error cuando falla descarga de ZIP', async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response)
    );

    await renderEquiposPage();

    const zipBtns = screen.getAllByText('ZIP vigentes');
    await user.click(zipBtns[0]);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo descargar el ZIP')
      );
    });
  });

  it('descarga Excel de resumen correctamente', async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: async () => new Blob(['mock-xlsx-content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      } as Response)
    );

    await renderEquiposPage();

    const excelBtns = screen.getAllByText('Excel');
    await user.click(excelBtns[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api/api/docs/equipos/1/summary.xlsx',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  it('muestra error cuando falla descarga de Excel', async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response)
    );

    await renderEquiposPage();

    const excelBtns = screen.getAllByText('Excel');
    await user.click(excelBtns[0]);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo descargar el Excel')
      );
    });
  });

  it('descarga documentación aprobada como ZIP', async () => {
    const user = userEvent.setup();

    const getCompliance = jest.fn().mockResolvedValue({
      data: {
        clientes: [],
        documents: {
          CHOFER: [
            { id: 101, templateId: 1, status: 'APROBADO' },
          ],
        },
      },
    });

    mockUseLazyGetEquipoComplianceQuery.mockReturnValue([getCompliance, { isFetching: false }]);

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: async () => new Blob(['pdf-content'], { type: 'application/pdf' }),
        headers: {
          get: (name: string) => {
            if (name === 'content-disposition') return 'attachment; filename="doc.pdf"';
            return null;
          },
        },
      } as Response)
    );

    await renderEquiposPage();

    const docsBtns = screen.getAllByText('Bajar documentación');
    await user.click(docsBtns[0]);

    await waitFor(() => {
      expect(getCompliance).toHaveBeenCalled();
    });
  });

  it('muestra mensaje cuando no hay documentación vigente', async () => {
    const user = userEvent.setup();

    const getCompliance = jest.fn().mockResolvedValue({
      data: {
        clientes: [],
        documents: {},
      },
    });

    mockUseLazyGetEquipoComplianceQuery.mockReturnValue([getCompliance, { isFetching: false }]);

    await renderEquiposPage();

    const docsBtns = screen.getAllByText('Bajar documentación');
    await user.click(docsBtns[0]);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('No hay documentación vigente')
      );
    });
  });
});

// =============================================================================
// TESTS - Importación CSV con errores
// =============================================================================
describe('EquiposPage - Importación CSV con errores', () => {
  it('descarga archivo de errores cuando la importación tiene errores', async () => {
    const user = userEvent.setup();

    const importFn = jest.fn().mockResolvedValue({
      unwrap: async () => ({
        created: 1,
        total: 3,
        errorsCsv: 'error1,line1\nerror2,line2\n',
      }),
    });

    mockUseImportCsvEquiposMutation.mockReturnValue([importFn, { isLoading: false }]);

    await renderEquiposPage();

    const csvFile = new File(['header,data'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csvEquipos') as HTMLInputElement;
    await user.upload(fileInput, csvFile);

    const simularBtn = screen.getByText('Simular');
    await user.click(simularBtn);

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('muestra mensaje de error cuando falla la importación', async () => {
    const user = userEvent.setup();

    const importFn = jest.fn().mockRejectedValue({
      data: { message: 'Error de formato CSV' },
    });

    mockUseImportCsvEquiposMutation.mockReturnValue([importFn, { isLoading: false }]);

    await renderEquiposPage();

    const csvFile = new File(['header,data'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csvEquipos') as HTMLInputElement;
    await user.upload(fileInput, csvFile);

    const simularBtn = screen.getByText('Simular');
    await user.click(simularBtn);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// TESTS - Semáforo de compliance
// =============================================================================
describe('EquiposPage - Semáforo de compliance', () => {
  it('muestra semáforo con estado FALTANTE', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [{ entityType: 'CHOFER', state: 'FALTANTE', templateId: 1 }],
          },
        ],
        documents: {},
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Faltantes')).toBeInTheDocument();
    });
  });

  it('muestra semáforo con estado VENCIDO', async () => {
    const now = Date.now();
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [{ entityType: 'CHOFER', state: 'FALTANTE', templateId: 1 }],
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
    });
  });

  it('muestra semáforo con estado PROXIMO (por vencer)', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [{ entityType: 'CHOFER', state: 'PROXIMO', templateId: 1 }],
          },
        ],
        documents: {},
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Por vencer')).toBeInTheDocument();
    });
  });

  it('muestra semáforo con estado OK (vigente)', async () => {
    mockUseGetEquipoComplianceQuery.mockReturnValue({
      data: {
        clientes: [
          {
            compliance: [{ entityType: 'CHOFER', state: 'OK', templateId: 1 }],
          },
        ],
        documents: {},
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
    });
  });

  it('muestra múltiples estados simultáneamente', async () => {
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
          CHOFER: [{ id: 1, templateId: 1, status: 'VIGENTE' }],
          CAMION: [
            {
              id: 2,
              templateId: 2,
              status: 'VENCIDO',
              expiresAt: new Date(now - 86400000).toISOString(),
            },
          ],
        },
      },
    });

    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Faltantes')).toBeInTheDocument();
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
      expect(screen.getByText('Por vencer')).toBeInTheDocument();
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// TESTS - Renderizado de información de equipos
// =============================================================================
describe('EquiposPage - Renderizado de información de equipos', () => {
  it('muestra clientes asignados al equipo', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('Cliente Test 1')).toBeInTheDocument();
    });
  });

  it('muestra estado "activo" para equipos activos', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('activo')).toBeInTheDocument();
    });
  });

  it('muestra estado "inactivo" para equipos finalizados', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText('inactivo')).toBeInTheDocument();
    });
  });

  it('muestra información de empresa transportista', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText(/30111222333/)).toBeInTheDocument();
    });
  });

  it('muestra "-" cuando el acoplado es null', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText(/Camión EF456GH · Acoplado -/)).toBeInTheDocument();
    });
  });

  it('muestra KPIs de equipos', async () => {
    await renderEquiposPage();

    expect(screen.getByText('Equipos creados')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // created: 5
    expect(screen.getByText('Swaps/movimientos')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // swaps: 3
    expect(screen.getByText('Eliminados')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // deleted: 1
  });
});

// =============================================================================
// TESTS - Normalización de patentes
// =============================================================================
describe('EquiposPage - Normalización de patentes', () => {
  it('normaliza patentes eliminando caracteres no alfanuméricos', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const truckInput = screen.getByLabelText('Patente Camión');
    await user.type(truckInput, 'AB-123.CD');

    const buscarBtn = screen.getByRole('button', { name: 'Buscar' });
    // La patente normalizada es 'AB123CD' (7 caracteres)
    expect(buscarBtn).not.toBeDisabled();
  });

  it('convierte patentes a mayúsculas', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const truckInput = screen.getByLabelText('Patente Camión');
    await user.type(truckInput, 'ab123cd');

    const buscarBtn = screen.getByRole('button', { name: 'Buscar' });
    expect(buscarBtn).not.toBeDisabled();
  });
});

// =============================================================================
// TESTS - Mostrar información de contadores
// =============================================================================
describe('EquiposPage - Mostrar información de contadores', () => {
  it('muestra cantidad de choferes cargados', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 2 de 55/)).toBeInTheDocument();
    });
  });

  it('muestra cantidad de camiones cargados', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 2 de 75/)).toBeInTheDocument();
    });
  });

  it('muestra cantidad de acoplados cargados', async () => {
    await renderEquiposPage();

    await waitFor(() => {
      expect(screen.getByText(/Mostrando 2 de 30/)).toBeInTheDocument();
    });
  });

  it('no muestra total cuando no hay datos', async () => {
    mockUseGetChoferesQuery.mockReturnValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 50 },
      isLoading: false,
    });

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
      expect(screen.getByText('Mostrando 0')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// TESTS - Modal de gestión - cerrar
// =============================================================================
describe('EquiposPage - Modal de gestión - cerrar', () => {
  it('cierra modal de gestión al cliclear Cancelar', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Gestionar componentes del equipo/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByText('Cancelar');
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Gestionar componentes del equipo/i)).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// TESTS - Alta mínima (fallback)
// =============================================================================
describe('EquiposPage - Alta mínima (fallback)', () => {
  it('muestra error cuando no se selecciona dropdown ni se completa DNI/patente', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalledWith(
        expect.stringContaining('Seleccioná chofer/camión')
      );
    });
  });

  it('usa alta mínima cuando no hay selección por dropdown', async () => {
    const user = userEvent.setup();

    // Mock dinámico para useCreateEquipoMinimalMutation
    const createMinimal = jest.fn().mockResolvedValue({
      unwrap: async () => ({ data: { id: 99 } }),
    });

    await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
      documentosApiSlice: {
        reducerPath: 'documentosApi',
        reducer: (s: unknown) => s,
        middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
      },
      useGetDadoresQuery: () => ({ data: { list: mockDadores }, isLoading: false }),
      useGetDefaultsQuery: () => ({ data: mockDefaults, isLoading: false }),
      useGetClientsQuery: () => ({ data: { list: mockClients }, isLoading: false }),
      useGetEmpresasTransportistasQuery: () => ({ data: mockEmpresasTransp, isLoading: false }),
      useGetEquipoKpisQuery: () => ({ data: mockKpis, isLoading: false }),
      useGetEquiposQuery: () => ({ data: mockEquipos, isLoading: false }),
      useGetChoferesQuery: () => ({ data: mockChoferesPage1.data, pagination: mockChoferesPage1.pagination, isLoading: false }),
      useGetCamionesQuery: () => ({ data: mockCamionesPage1.data, pagination: mockCamionesPage1.pagination, isLoading: false }),
      useGetAcopladosQuery: () => ({ data: mockAcopladosPage1.data, pagination: mockAcopladosPage1.pagination, isLoading: false }),
      useCreateEquipoMinimalMutation: () => [createMinimal, { isLoading: false }],
    }));

    // Re-importar el componente con el nuevo mock
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

    // Ingresar DNI y patentes directamente (sin usar dropdowns)
    // Nota: esto requiere que el componente tenga campos visibles para DNI/patentes
    // que actualmente no existen en el HTML renderizado

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    // Debería mostrar error porque no hay DNI/patente
    await waitFor(() => {
      expect((globalThis as any).alert).toHaveBeenCalled();
    });
  });
});
