/**
 * Tests de cobertura para EquiposPage
 * Objetivo: alcanzar ≥90% de coverage (lines + branches)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest, beforeAll } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { documentosApiSlice } from '../../api/documentosApiSlice';

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

const mockChoferes = {
  data: [
    { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' },
    { id: 2, dni: '87654321', nombre: 'María', apellido: 'González' },
  ],
  pagination: { total: 2, page: 1, limit: 50 },
};

const mockCamiones = {
  data: [
    { id: 1, patente: 'AB123CD' },
    { id: 2, patente: 'EF456GH' },
  ],
  pagination: { total: 2, page: 1, limit: 50 },
};

const mockAcoplados = {
  data: [
    { id: 1, patente: 'AA001BB' },
    { id: 2, patente: 'CC002DD' },
  ],
  pagination: { total: 2, page: 1, limit: 50 },
};

const mockEquipos = [
  {
    id: 1,
    driverDniNorm: '12345678',
    truckPlateNorm: 'AB123CD',
    trailerPlateNorm: 'AA001BB',
    empresaTransportistaId: 1,
    dador: { id: 1, razonSocial: 'Dador Test 1' },
    clientes: [],
    estado: 'activa',
  },
  {
    id: 2,
    driverDniNorm: '87654321',
    truckPlateNorm: 'EF456GH',
    trailerPlateNorm: null,
    empresaTransportistaId: 2,
    dador: { id: 1, razonSocial: 'Dador Test 1' },
    clientes: [{ clienteId: 1 }],
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

const mockEquipoHistory = [
  {
    id: 1,
    action: 'create',
    actionType: 'create',
    createdAt: '2024-01-01T10:00:00Z',
    originEquipoId: null,
    component: 'driver',
  },
  {
    id: 2,
    action: 'swap',
    actionType: 'swap',
    createdAt: '2024-01-02T10:00:00Z',
    originEquipoId: 1,
    component: 'truck',
  },
];

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
    chofer: [
      { id: 1, templateId: 1, status: 'VIGENTE', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    ],
  },
};

const mockComplianceWithExpired = {
  clientes: [
    {
      compliance: [
        { entityType: 'CHOFER', state: 'FALTANTE', templateId: 1 },
      ],
    },
  ],
  documents: {
    chofer: [
      { id: 1, templateId: 1, status: 'VENCIDO', expiresAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  },
};

// =============================================================================
// MOCKS SETUP
// =============================================================================

let mockConfirm: jest.Mock;
let mockNavigate: jest.Mock;

let mockUseGetEquiposQuery: jest.Mock;
let mockUseGetEquipoHistoryQuery: jest.Mock;
let mockUseSearchEquiposQuery: jest.Mock;
let mockUseGetEquipoComplianceQuery: jest.Mock;
let mockUseLazyGetEquipoComplianceQuery: jest.Mock;
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
let mockUseLazyGetChoferesQuery: jest.Mock;
let mockUseLazyGetCamionesQuery: jest.Mock;
let mockUseLazyGetAcopladosQuery: jest.Mock;

beforeAll(async () => {
  // Mock de confirm context
  mockConfirm = jest.fn().mockResolvedValue(true);
  await jest.unstable_mockModule('@/contexts/confirmContext', () => ({
    ConfirmContext: React.createContext({ confirm: mockConfirm }),
    useConfirm: () => ({ confirm: mockConfirm }),
  }));

  // Mock de navigate
  mockNavigate = jest.fn();
  await jest.unstable_mockModule('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
  }));

  // Crear funciones mock para los hooks
  mockUseGetEquiposQuery = jest.fn();
  mockUseGetEquipoHistoryQuery = jest.fn();
  mockUseSearchEquiposQuery = jest.fn();
  mockUseGetEquipoComplianceQuery = jest.fn();
  mockUseLazyGetEquipoComplianceQuery = jest.fn();
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
  mockUseLazyGetChoferesQuery = jest.fn();
  mockUseLazyGetCamionesQuery = jest.fn();
  mockUseLazyGetAcopladosQuery = jest.fn();

  // Mock del módulo de API
  await jest.unstable_mockModule('../../api/documentosApiSlice', () => ({
    documentosApiSlice: {
      reducerPath: 'documentosApi',
      reducer: (state = {}) => state,
      middleware: () => (next: (action: unknown) => unknown) => (action: unknown) => next(action),
    },
    useGetDadoresQuery: () => ({ data: { list: mockDadores }, isLoading: false, refetch: jest.fn() }),
    useGetDefaultsQuery: () => ({ data: mockDefaults, isLoading: false }),
    useGetEquipoKpisQuery: () => ({ data: mockKpis, isLoading: false }),
    useGetEquiposQuery: (...args: unknown[]) => mockUseGetEquiposQuery(...args),
    useGetClientsQuery: () => ({ data: { list: mockClients }, isLoading: false }),
    useGetEmpresasTransportistasQuery: () => ({ data: mockEmpresasTransp, isLoading: false }),
    useGetChoferesQuery: () => ({ data: mockChoferes.data, pagination: mockChoferes.pagination, isLoading: false }),
    useGetCamionesQuery: () => ({ data: mockCamiones.data, pagination: mockCamiones.pagination, isLoading: false }),
    useGetAcopladosQuery: () => ({ data: mockAcoplados.data, pagination: mockAcoplados.pagination, isLoading: false }),
    useSearchEquiposQuery: (...args: unknown[]) => mockUseSearchEquiposQuery(...args),
    useGetEquipoHistoryQuery: (...args: unknown[]) => mockUseGetEquipoHistoryQuery(...args),
    useGetEquipoComplianceQuery: (...args: unknown[]) => mockUseGetEquipoComplianceQuery(...args),
    useLazyGetEquipoComplianceQuery: (...args: unknown[]) => mockUseLazyGetEquipoComplianceQuery(...args),
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
    useLazyGetChoferesQuery: (...args: unknown[]) => mockUseLazyGetChoferesQuery(...args),
    useLazyGetCamionesQuery: (...args: unknown[]) => mockUseLazyGetCamionesQuery(...args),
    useLazyGetAcopladosQuery: (...args: unknown[]) => mockUseLazyGetAcopladosQuery(...args),
  }));

  // Mock de useRoleBasedNavigation
  await jest.unstable_mockModule('@/hooks/useRoleBasedNavigation', () => ({
    useRoleBasedNavigation: () => ({
      canNavigate: () => true,
      getHomeRoute: () => '/documentos',
      goBack: jest.fn(),
    }),
  }));

  // Mock de useToast
  await jest.unstable_mockModule('@/components/ui/useToast', () => ({
    useToast: () => ({ show: jest.fn() }),
  }));

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
  (globalThis as any).getRuntimeEnv = jest.fn((key: string) => {
    if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://test-api';
    return '';
  });

  // Importar el componente después de mockear dependencias
  await import('../EquiposPage');
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
  mockUseGetEquipoHistoryQuery.mockReturnValue({
    data: mockEquipoHistory,
    isLoading: false,
  });
  mockUseSearchEquiposQuery.mockReturnValue({
    data: [],
    isLoading: false,
  });
  mockUseGetEquipoComplianceQuery.mockReturnValue({
    data: mockComplianceData,
  });
  mockUseLazyGetEquipoComplianceQuery.mockReturnValue([
    jest.fn().mockResolvedValue({ data: mockComplianceData }),
    { isFetching: false },
  ]);

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

  const lazyTrigger = jest.fn().mockResolvedValue({ data: mockChoferes });
  mockUseLazyGetChoferesQuery.mockReturnValue([lazyTrigger, { isFetching: false }]);
  mockUseLazyGetCamionesQuery.mockReturnValue([lazyTrigger, { isFetching: false }]);
  mockUseLazyGetAcopladosQuery.mockReturnValue([lazyTrigger, { isFetching: false }]);
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
// TESTS - Búsqueda
// =============================================================================
describe('EquiposPage - Búsqueda', () => {
  it('ejecuta búsqueda al presionar Enter', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const dniInput = screen.getByLabelText('Buscar por DNI');
    await user.type(dniInput, '123456{Enter}');

    await waitFor(() => {
      expect(mockUseSearchEquiposQuery).toHaveBeenCalled();
    });
  });

  it('limpia filtros al cliclear Limpiar', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const dniInput = screen.getByLabelText('Buscar por DNI');
    await user.type(dniInput, '123456');

    const limpiarBtn = screen.getByText('Limpiar');
    await user.click(limpiarBtn);

    await waitFor(() => {
      expect(dniInput).toHaveValue('');
    });
  });

  it('habilita buscar con DNI válido (≥6 caracteres)', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const dniInput = screen.getByLabelText('Buscar por DNI');
    await user.type(dniInput, '123456');

    const buscarBtn = screen.getByRole('button', { name: 'Buscar' });
    expect(buscarBtn).not.toBeDisabled();
  });

  it('deshabilita buscar con DNI inválido (<6 caracteres)', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const dniInput = screen.getByLabelText('Buscar por DNI');
    await user.type(dniInput, '12345');

    expect(screen.getByText('Mínimo 6 dígitos')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTS - Importación CSV
// =============================================================================
describe('EquiposPage - Importación CSV', () => {
  it('descarga template de CSV ejecutando downloadCsvTemplate', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const downloadBtn = screen.getByText('Descargar plantilla');
    await user.click(downloadBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('ejecuta importación con dry-run=true', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const csvFile = new File(['test,csv,data'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csvEquipos') as HTMLInputElement;

    await user.upload(fileInput, csvFile);

    expect(screen.getByText('test.csv')).toBeInTheDocument();

    const checkbox = document.getElementById('dryrun') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    const simularBtn = screen.getByText('Simular');
    await user.click(simularBtn);

    await waitFor(() => {
      const trigger = mockUseImportCsvEquiposMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
        })
      );
    });
  });

  it('ejecuta importación con dry-run=false', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const csvFile = new File(['test,csv,data'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csvEquipos') as HTMLInputElement;
    await user.upload(fileInput, csvFile);

    const checkbox = document.getElementById('dryrun') as HTMLInputElement;
    await user.click(checkbox);

    const importBtn = screen.getByText('Importar');
    await user.click(importBtn);

    await waitFor(() => {
      const trigger = mockUseImportCsvEquiposMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: false,
        })
      );
    });
  });

  it('deshabilita botón cuando no hay archivo seleccionado', async () => {
    await renderEquiposPage();

    const simularBtn = screen.getByText('Simular');
    expect(simularBtn).toBeDisabled();
  });
});

// =============================================================================
// TESTS - Creación de equipo
// =============================================================================
describe('EquiposPage - Creación de equipo', () => {
  it('crea equipo con dropdowns (chofer + camión)', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      const trigger = mockUseCreateEquipoMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          dadorCargaId: 1,
          driverId: 1,
          truckId: 1,
        })
      );
    });
  });

  it('crea equipo con dropdowns (chofer + camión + acoplado)', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const acopladoSelect = document.getElementById('selAcoplado') as HTMLSelectElement;
    await user.selectOptions(acopladoSelect, '1');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      const trigger = mockUseCreateEquipoMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          trailerId: 1,
        })
      );
    });
  });

  it('muestra error de teléfonos inválidos', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const phoneInput = screen.getByPlaceholderText('+54911...');
    await user.clear(phoneInput);
    await user.type(phoneInput, 'invalid-phone');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    const trigger = mockUseCreateEquipoMutation()[0] as jest.Mock;
    expect(trigger).not.toHaveBeenCalled();
  });

  it('crea equipo con empresa transportista seleccionada', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    await user.selectOptions(empresaSelect, '1');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      const trigger = mockUseCreateEquipoMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaTransportistaId: 1,
        })
      );
    });
  });

  it('crea equipo con múltiples teléfonos válidos', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const phoneInput = screen.getByPlaceholderText('+54911...');
    await user.clear(phoneInput);
    await user.type(phoneInput, '+5491112345678,+5492233445566');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      const trigger = mockUseCreateEquipoMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalled();
    });
  });

  it('muestra error cuando falla la creación de equipo', async () => {
    const user = userEvent.setup();

    const triggerError = jest.fn().mockRejectedValue(new Error('Error al crear'));
    mockUseCreateEquipoMutation.mockReturnValue([
      triggerError,
      { isLoading: false, reset: jest.fn() },
    ]);

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

    const choferSelect = document.getElementById('selChofer') as HTMLSelectElement;
    await user.selectOptions(choferSelect, '1');

    const camionSelect = document.getElementById('selCamion') as HTMLSelectElement;
    await user.selectOptions(camionSelect, '1');

    const createBtn = screen.getByRole('button', { name: 'Crear equipo' });
    await user.click(createBtn);

    await waitFor(() => {
      expect(triggerError).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// TESTS - Modal de gestión de componentes
// =============================================================================
describe('EquiposPage - Gestión de componentes (modal)', () => {
  it('abre modal de gestión de componentes', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Gestionar componentes del equipo/i)).toBeInTheDocument();
    });
  });

  it('muestra currentIdentifier para chofer', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Gestionar componentes del equipo/i)).toBeInTheDocument();
    });

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'driver');

    await waitFor(() => {
      expect(screen.getByText('12345678')).toBeInTheDocument();
    });
  });

  it('muestra currentIdentifier para camión', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'truck');

    await waitFor(() => {
      expect(screen.getByText('AB123CD')).toBeInTheDocument();
    });
  });

  it('muestra currentIdentifier para acoplado', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'trailer');

    await waitFor(() => {
      expect(screen.getByText('AA001BB')).toBeInTheDocument();
    });
  });

  it('muestra currentIdentifier para empresa', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'empresa');

    await waitFor(() => {
      expect(screen.getByText('30111222333')).toBeInTheDocument();
    });
  });

  it('adjunta nuevo chofer por DNI', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

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
      const trigger = mockUseAttachEquipoComponentsMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          driverDni: '99999999',
        })
      );
    });
  });

  it('adjunta nuevo camión por patente', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

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
      const trigger = mockUseAttachEquipoComponentsMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          truckPlate: 'ZZ999ZZ',
        })
      );
    });
  });

  it('adjunta nuevo acoplado por patente', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

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
      const trigger = mockUseAttachEquipoComponentsMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          trailerPlate: 'YY888YY',
        })
      );
    });
  });

  it('adjunta nueva empresa transportista', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const gestionarBtns = screen.getAllByText('Gestionar componentes');
    await user.click(gestionarBtns[0]);

    const componentSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(componentSelect, 'empresa');

    const empresaSelect = screen.getAllByRole('combobox')[1];
    await user.selectOptions(empresaSelect, '2');

    const applyBtn = screen.getByText('Aplicar');
    await user.click(applyBtn);

    await waitFor(() => {
      const trigger = mockUseUpdateEquipoMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaTransportistaId: 2,
        })
      );
    });
  });
});

// =============================================================================
// TESTS - Acciones de equipo
// =============================================================================
describe('EquiposPage - Acciones de equipo', () => {
  it('navega a editar al cliclear botón Editar', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const editBtns = screen.getAllByText('✏️ Editar');
    await user.click(editBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/documentos/equipos/1/editar');
  });

  it('navega a ver estado al cliclear botón Ver estado', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const estadoBtns = screen.getAllByText('Ver estado');
    await user.click(estadoBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/documentos/equipos/1/estado?only=vencidos');
  });

  it('activa equipo (sin confirmación)', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const activateBtns = screen.getAllByText('Activar');
    await user.click(activateBtns[0]);

    await waitFor(() => {
      const trigger = mockUseUpdateEquipoMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'activa',
        })
      );
    });
  });

  it('desactiva equipo con confirmación', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const deactivateBtns = screen.getAllByText('Desactivar');
    await user.click(deactivateBtns[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Desactivar equipo',
        })
      );
    });
  });

  it('elimina equipo con confirmación', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const deleteBtns = screen.getAllByText('Eliminar');
    await user.click(deleteBtns[0]);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eliminar equipo',
        })
      );
    });
  });
});

// =============================================================================
// TESTS - Modal de historial
// =============================================================================
describe('EquiposPage - Modal de historial', () => {
  it('abre modal de historial', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Historial de equipo/i)).toBeInTheDocument();
    });
  });

  it('cierra modal de historial', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Historial de equipo/i)).toBeInTheDocument();
    });

    const cerrarBtn = screen.getByText('Cerrar');
    await user.click(cerrarBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Historial de equipo/i)).not.toBeInTheDocument();
    });
  });

  it('filtra historial por tipo de acción', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    const filterSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(filterSelect, 'create');

    await waitFor(() => {
      expect(screen.getByText('Creación')).toBeInTheDocument();
    });
  });

  it('muestra originEquipoId cuando existe', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const historialBtns = screen.getAllByText('Historial');
    await user.click(historialBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Origen equipo #1')).toBeInTheDocument();
    });
  });
});

// =============================================================================
// TESTS - EquipoSemaforo
// =============================================================================
describe('EquiposPage - EquipoSemaforo', () => {
  it('retorna null cuando no hay datos de compliance', async () => {
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
      expect(screen.queryAllByText('Faltantes').length).toBe(0);
    });
  });

  it('calcula estados correctamente', async () => {
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
// TESTS - Asignación de equipo a cliente
// =============================================================================
describe('EquiposPage - Asignación de equipo a cliente', () => {
  it('asigna equipo a cliente seleccionado', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const clienteSelect = document.getElementById('clienteSelect') as HTMLSelectElement;
    await user.selectOptions(clienteSelect, '1');

    const equipoSelect = document.getElementById('equipoSelect') as HTMLSelectElement;
    await user.selectOptions(equipoSelect, '1');

    const asignarBtn = screen.getByText('Asignar equipo a cliente');
    await user.click(asignarBtn);

    await waitFor(() => {
      const trigger = mockUseAssociateEquipoClienteMutation()[0] as jest.Mock;
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          equipoId: 1,
          clienteId: 1,
        })
      );
    });
  });
});

// =============================================================================
// TESTS - Validaciones de búsqueda
// =============================================================================
describe('EquiposPage - Validaciones de búsqueda', () => {
  it('habilita buscar con patente camión válida (≥5 caracteres)', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const truckInput = screen.getByLabelText('Patente Camión');
    await user.type(truckInput, 'AB123');

    const buscarBtn = screen.getByRole('button', { name: 'Buscar' });
    expect(buscarBtn).not.toBeDisabled();
  });

  it('habilita buscar con patente acoplado válida (≥5 caracteres)', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const trailerInput = screen.getByLabelText('Patente Acoplado');
    await user.type(trailerInput, 'AA001');

    const buscarBtn = screen.getByRole('button', { name: 'Buscar' });
    expect(buscarBtn).not.toBeDisabled();
  });

  it('muestra mensaje de validación para patente camión inválida', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const truckInput = screen.getByLabelText('Patente Camión');
    await user.type(truckInput, 'AB12');

    expect(screen.getByText('Mínimo 5 caracteres')).toBeInTheDocument();
  });

  it('muestra mensaje de validación para patente acoplado inválida', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const trailerInput = screen.getByLabelText('Patente Acoplado');
    await user.type(trailerInput, 'AA00');

    expect(screen.getByText('Mínimo 5 caracteres')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTS - Selectores y asignación
// =============================================================================
describe('EquiposPage - Selectores y asignación', () => {
  it('cambia cliente en select', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const clienteSelect = document.getElementById('clienteSelect') as HTMLSelectElement;
    await user.selectOptions(clienteSelect, '2');

    expect(clienteSelect.value).toBe('2');
  });

  it('cambia dador en select', async () => {
    const user = userEvent.setup();
    await renderEquiposPage();

    const dadorSelect = document.getElementById('dadorSelect') as HTMLSelectElement;
    await user.selectOptions(dadorSelect, '2');

    expect(dadorSelect.value).toBe('2');
  });

  it('muestra mensaje de "por defecto" para cliente preseleccionado', async () => {
    await renderEquiposPage();

    expect(screen.getByText('Seleccionado por defecto')).toBeInTheDocument();
  });
});

// =============================================================================
// TESTS - Renderizado básico
// =============================================================================
describe('EquiposPage - Renderizado básico', () => {
  it('renderiza título principal', async () => {
    await renderEquiposPage();
    expect(screen.getByText('Asociación de Equipos')).toBeInTheDocument();
  });

  it('muestra KPIs', async () => {
    await renderEquiposPage();
    expect(screen.getByText('Equipos creados')).toBeInTheDocument();
    expect(screen.getByText('Swaps/movimientos')).toBeInTheDocument();
    expect(screen.getByText('Eliminados')).toBeInTheDocument();
  });

  it('muestra Sin equipos cuando no hay datos', async () => {
    mockUseGetEquiposQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
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

    expect(screen.getByText('Sin equipos')).toBeInTheDocument();
  });

  it('muestra spinner durante carga', async () => {
    mockUseGetEquiposQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
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

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('muestra botones de Cargar más para catálogos', async () => {
    await renderEquiposPage();

    const cargarMasBtns = screen.getAllByText('Cargar más');
    expect(cargarMasBtns.length).toBeGreaterThanOrEqual(3);
  });

  it('muestra información de dador en equipos', async () => {
    await renderEquiposPage();

    expect(screen.getByText('Dador Test 1')).toBeInTheDocument();
  });

  it('muestra información de empresa transportista', async () => {
    await renderEquiposPage();

    expect(screen.getByText(/Emp\.Transp/)).toBeInTheDocument();
    expect(screen.getByText('30111222333')).toBeInTheDocument();
  });

  it('muestra botones de acción disponibles', async () => {
    await renderEquiposPage();

    expect(screen.getAllByText('✏️ Editar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ZIP vigentes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Excel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bajar documentación').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ver estado').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gestionar componentes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Historial').length).toBeGreaterThan(0);
  });

  it('muestra labels informativos', async () => {
    await renderEquiposPage();

    expect(screen.getByText('Chofer')).toBeInTheDocument();
    expect(screen.getByText('Camión')).toBeInTheDocument();
    expect(screen.getByText('Acoplado')).toBeInTheDocument();
    expect(screen.getByText('Empresa Transportista (opcional)')).toBeInTheDocument();
    expect(screen.getByText(/Teléfonos del Chofer/)).toBeInTheDocument();
    expect(screen.getByText('Archivo CSV')).toBeInTheDocument();
  });

  it('muestra select de empresas transportistas', async () => {
    await renderEquiposPage();

    const empresaSelect = document.getElementById('empresaTransp') as HTMLSelectElement;
    expect(empresaSelect).toBeInTheDocument();
    expect(empresaSelect.options.length).toBeGreaterThan(1); // Incluye "Sin empresa"
  });
});
