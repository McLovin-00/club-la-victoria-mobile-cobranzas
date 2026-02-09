/**
 * Propósito: Tests de render exhaustivos para `DadoresPortalPage` que ejecutan
 * la lógica real del componente (handlers, efectos, subcomponentes) para subir el coverage.
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mocks
const showToastMock = jest.fn();
const goBackMock = jest.fn();
const navigateMock = jest.fn();
const createMinimalMock = jest.fn();
const importCsvMock = jest.fn();
const uploadBatchMock = jest.fn();

// Mock de toasts
await jest.unstable_mockModule('../../components/ui/Toast.utils', () => ({
  showToast: showToastMock,
}));

// Mock de navegación
await jest.unstable_mockModule('../../hooks/useRoleBasedNavigation', () => ({
  useRoleBasedNavigation: () => ({
    goBack: goBackMock,
  }),
}));

// Mock de react-router-dom navigate
await jest.unstable_mockModule('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => navigateMock,
}));

// Mock del store (borde). La página usa `useSelector` para token/empresaId.
await jest.unstable_mockModule('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (s: unknown) => unknown) =>
    selector({
      auth: {
        token: 'test-token',
        user: { empresaId: 123 },
      },
    }),
}));

// Mock de runtimeEnv (debe exportar ambas funciones)
await jest.unstable_mockModule('../../lib/runtimeEnv', () => ({
  getRuntimeEnv: (key: string) => {
    if (key === 'VITE_DOCUMENTOS_API_URL') return 'http://localhost:4802';
    return '';
  },
  getRuntimeFlag: (_key: string) => false,
}));

// Datos de prueba
const mockDadores = [
  { id: 1, razonSocial: 'Dador Demo' },
  { id: 2, razonSocial: 'Otro Dador' },
];

const mockEquipos = [
  { id: 100, equipo: { id: 100 } },
  { id: 101, equipo: { id: 101 } },
];

const mockChoferes = [
  { id: 1, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' },
  { id: 2, dni: '87654321', nombre: 'María', apellido: 'López' },
];

const mockCamiones = [
  { id: 1, patente: 'AA123BB', marca: 'Scania', modelo: 'R500' },
  { id: 2, patente: 'BB456CC', marca: 'Volvo', modelo: 'FH16' },
];

const mockAcoplados = [
  { id: 1, patente: 'AC456CD', tipo: 'Semi' },
  { id: 2, patente: 'AD789EF', tipo: 'Tanque' },
];

// Variable para controlar el estado del job
let batchJobStatus: { status?: string; progress?: number; results?: any[] } | undefined = undefined;

// Mock de RTK Query hooks
await jest.unstable_mockModule('@/features/documentos/api/documentosApiSlice', () => ({
  useGetDadoresQuery: () => ({ data: { list: mockDadores } }),
  useCreateEquipoMinimalMutation: () => [
    createMinimalMock,
    { isLoading: false },
  ],
  useImportCsvEquiposMutation: () => [
    importCsvMock,
    { isLoading: false, data: { created: 2, total: 3 } },
  ],
  useUploadBatchDocsDadorMutation: () => [
    uploadBatchMock,
    { isLoading: false },
  ],
  useGetJobStatusQuery: () => ({
    data: batchJobStatus ? { job: batchJobStatus } : undefined,
  }),
  useGetChoferesQuery: () => ({
    data: { data: mockChoferes, pagination: { pages: 2, total: 10, limit: 10 } },
    isFetching: false,
  }),
  useGetCamionesQuery: () => ({
    data: { data: mockCamiones, pagination: { pages: 1 } },
    isFetching: false,
  }),
  useGetAcopladosQuery: () => ({
    data: { data: mockAcoplados, pagination: { pages: 1 } },
    isFetching: false,
  }),
  useGetEquiposQuery: () => ({ data: mockEquipos }),
}));

const { DadoresPortalPage } = await import('../DadoresPortalPage');

describe('DadoresPortalPage - render completo (coverage real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    batchJobStatus = undefined;
    createMinimalMock.mockResolvedValue({});
    importCsvMock.mockResolvedValue({ created: 2, total: 3 });
    uploadBatchMock.mockResolvedValue({ jobId: 'batch-123' });

    // Mock de URL.createObjectURL y URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:test') as any;
    global.URL.revokeObjectURL = jest.fn() as any;

    // Mock de fetch global
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
      blob: async () => new Blob(['test']),
    }) as any;
  });

  it('renderiza el header principal y descripción', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/¡Bienvenido,\s*Dador de Carga!/i)).toBeInTheDocument();
    expect(screen.getByText(/Centro de control logístico/i)).toBeInTheDocument();
  });

  it('ejecuta goBack al hacer click en Volver', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    const volverBtn = screen.getByText('← Volver');
    fireEvent.click(volverBtn);
    expect(goBackMock).toHaveBeenCalled();
  });

  it('renderiza la sección Alta Rápida de Equipo', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Alta Rápida de Equipo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: 12345678')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('AA123BB')).toBeInTheDocument();
  });

  it('crea equipo mínimo cuando hay datos válidos', async () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Ej: 12345678'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('AA123BB'), { target: { value: 'AA123BB' } });
    fireEvent.change(screen.getByPlaceholderText('AC456CD (opcional)'), { target: { value: 'AC456CD' } });

    const crearBtn = screen.getByText('¡Crear Equipo!');
    await act(async () => {
      fireEvent.click(crearBtn);
    });

    await waitFor(() => {
      expect(createMinimalMock).toHaveBeenCalled();
    });
  });

  it('renderiza la sección Importación Masiva CSV', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Importación Masiva CSV/i)).toBeInTheDocument();
    expect(screen.getByText('Descargar plantilla')).toBeInTheDocument();
  });

  it('descarga la plantilla CSV', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    const descargarBtn = screen.getByText('Descargar plantilla');
    fireEvent.click(descargarBtn);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('renderiza la sección Carga Inicial por Planilla', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Carga Inicial por Planilla/i)).toBeInTheDocument();
  });

  it('renderiza la sección Aprobación de Documentos', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Aprobación de Documentos/i)).toBeInTheDocument();
    expect(screen.getByText('Ir a Aprobación')).toBeInTheDocument();
  });

  it('navega a aprobación al hacer click', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    const aprobacionBtn = screen.getByText('Ir a Aprobación');
    fireEvent.click(aprobacionBtn);
    expect(navigateMock).toHaveBeenCalledWith('/documentos/aprobacion');
  });

  it('renderiza la sección Maestros (Solo Lectura)', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Maestros \(Solo Lectura\)/i)).toBeInTheDocument();
    expect(screen.getByText('Choferes')).toBeInTheDocument();
    expect(screen.getByText('Camiones')).toBeInTheDocument();
    expect(screen.getByText('Acoplados')).toBeInTheDocument();
  });

  it('muestra datos de choferes en Maestros', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/12345678/)).toBeInTheDocument();
    expect(screen.getByText(/Juan/)).toBeInTheDocument();
  });

  it('muestra datos de camiones en Maestros', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/AA123BB/)).toBeInTheDocument();
    expect(screen.getByText(/Scania/)).toBeInTheDocument();
  });

  it('muestra datos de acoplados en Maestros', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/AC456CD/)).toBeInTheDocument();
    expect(screen.getByText(/Semi/)).toBeInTheDocument();
  });

  it('navega páginas de choferes', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    // Hay botones de paginación para cada maestro
    const siguienteButtons = screen.getAllByText('Siguiente');
    expect(siguienteButtons.length).toBeGreaterThan(0);

    fireEvent.click(siguienteButtons[0]);
  });

  it('renderiza la sección Procesamiento Inteligente', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Procesamiento Inteligente de Documentos/i)).toBeInTheDocument();
    expect(screen.getByText('IA Inteligente')).toBeInTheDocument();
  });

  it('renderiza la sección Centro de Control de Equipos', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Centro de Control de Equipos/i)).toBeInTheDocument();
    expect(screen.getByText('Control Automatizado')).toBeInTheDocument();
  });

  it('genera Resumen CSV', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    const resumenBtn = screen.getByText('Resumen CSV');
    fireEvent.click(resumenBtn);
    expect(showToastMock).toHaveBeenCalledWith('CSV generado', 'success');
  });

  it('cambia el dador seleccionado', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    const selects = screen.getAllByRole('combobox');
    // El primer select debería ser el de dador
    const dadorSelect = selects.find(s => s.textContent?.includes('Dador'));
    if (dadorSelect) {
      fireEvent.change(dadorSelect, { target: { value: '2' } });
    }
  });

  it('renderiza acciones por equipo', () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Revisar faltantes ahora')).toBeInTheDocument();
    expect(screen.getByText('Solicitar documentación')).toBeInTheDocument();
    expect(screen.getByText('Descargar ZIP')).toBeInTheDocument();
  });

  it('ejecuta revisar faltantes', async () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    const revisarBtn = screen.getByText('Revisar faltantes ahora');
    await act(async () => {
      fireEvent.click(revisarBtn);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('ejecuta solicitar documentación', async () => {
    render(
      <MemoryRouter>
        <DadoresPortalPage />
      </MemoryRouter>
    );

    const solicitarBtn = screen.getByText('Solicitar documentación');
    await act(async () => {
      fireEvent.click(solicitarBtn);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
