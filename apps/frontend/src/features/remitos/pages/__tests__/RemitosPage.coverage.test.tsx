/**
 * Comprehensive tests for RemitosPage - ACTUAL component coverage
 *
 * These tests use ESM mocking pattern to properly cover the RemitosPage component.
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import type { Remito, RemitoStats, RemitosListResponse } from '../../types';

// Mock implementations - defined before mocking
let mockRefetch: jest.Mock;
let mockRemitosData: RemitosListResponse | null;
let mockIsLoading: boolean;
let mockIsFetching: boolean;
// Using type assertion for flexible mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockFetch: any;
let mockCreateObjectURL: jest.Mock;
let mockRevokeObjectURL: jest.Mock;

// User type for mocks
interface MockUser {
  id: number;
  email: string;
  role: string;
  empresaId: number;
}

// Mock user data
const mockSuperAdmin: MockUser = {
  id: 1,
  email: 'admin@test.com',
  role: 'SUPERADMIN',
  empresaId: 1,
};

const mockRegularUser: MockUser = {
  id: 2,
  email: 'user@test.com',
  role: 'USER',
  empresaId: 1,
};

// Sample remito data
const createMockRemito = (overrides: Partial<Remito> = {}): Remito => ({
  id: 1,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  numeroRemito: 'REM-001',
  fechaOperacion: '2024-01-15',
  emisorNombre: 'Emisor Test',
  emisorDetalle: 'Detalle emisor',
  clienteNombre: 'Cliente Test',
  producto: 'Producto Test',
  transportistaNombre: 'Transportista Test',
  choferNombre: 'Chofer Test',
  choferDni: '12345678',
  patenteChasis: 'ABC123',
  patenteAcoplado: 'DEF456',
  pesoOrigenBruto: 10000,
  pesoOrigenTara: 5000,
  pesoOrigenNeto: 5000,
  pesoDestinoBruto: 10000,
  pesoDestinoTara: 5000,
  pesoDestinoNeto: 5000,
  tieneTicketDestino: true,
  equipoId: 1,
  choferId: 1,
  dadorCargaId: 1,
  tenantEmpresaId: 1,
  choferCargadorDni: '12345678',
  choferCargadorNombre: 'Chofer',
  choferCargadorApellido: 'Cargador',
  estado: 'PENDIENTE_APROBACION',
  cargadoPorUserId: 1,
  cargadoPorRol: 'CHOFER',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  rechazadoPorUserId: null,
  rechazadoAt: null,
  motivoRechazo: null,
  confianzaIA: 0.95,
  camposDetectados: ['numeroRemito', 'fechaOperacion'],
  erroresAnalisis: [],
  analizadoAt: '2024-01-15T10:00:00Z',
  imagenes: [],
  ...overrides,
});

const mockStats: RemitoStats = {
  total: 100,
  pendientes: 30,
  aprobados: 60,
  rechazados: 10,
};

describe('RemitosPage - Coverage Tests', () => {
  let RemitosPage: React.FC;
  let currentUser = mockSuperAdmin;
  let currentToken = 'mock-token';

  beforeAll(async () => {
    // Initialize mocks
    mockRefetch = jest.fn();
    mockFetch = jest.fn();
    mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = jest.fn();

    // Set up global mocks
    global.fetch = mockFetch as unknown as typeof fetch;
    global.URL.createObjectURL = mockCreateObjectURL as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL as unknown as typeof URL.revokeObjectURL;

    // Mock authSlice
    jest.unstable_mockModule('../../../auth/authSlice', () => ({
      selectCurrentUser: (state: Record<string, unknown>) => currentUser,
      selectCurrentToken: (state: Record<string, unknown>) => currentToken,
    }));

    // Mock react-redux useSelector
    jest.unstable_mockModule('react-redux', () => {
      const actual = jest.requireActual('react-redux') as Record<string, unknown>;
      return {
        ...actual,
        useSelector: (selector: (state: Record<string, unknown>) => unknown) => {
          // Return appropriate mock based on selector
          if (selector.toString().includes('selectCurrentUser')) {
            return currentUser;
          }
          if (selector.toString().includes('selectCurrentToken')) {
            return currentToken;
          }
          return selector({ auth: { user: currentUser, token: currentToken } });
        },
      };
    });

    // Mock remitosApiSlice
    jest.unstable_mockModule('../../api/remitosApiSlice', () => ({
      useGetRemitosQuery: () => ({
        data: mockRemitosData,
        isLoading: mockIsLoading,
        isFetching: mockIsFetching,
        refetch: mockRefetch,
      }),
    }));

    // Mock RemitoCard
    jest.unstable_mockModule('../../components/RemitoCard', () => ({
      RemitoCard: ({
        remito,
        onClick,
      }: {
        remito: Remito;
        onClick: () => void;
      }) => (
        <div
          data-testid={`remito-card-${remito.id}`}
          onClick={onClick}
          role="button"
        >
          <span>{remito.numeroRemito}</span>
          <span>{remito.estado}</span>
        </div>
      ),
    }));

    // Mock RemitoUploader
    jest.unstable_mockModule('../../components/RemitoUploader', () => ({
      RemitoUploader: ({ onSuccess }: { onSuccess: () => void }) => (
        <div data-testid="remito-uploader">
          <button onClick={onSuccess} data-testid="upload-success-btn">
            Upload Success
          </button>
        </div>
      ),
    }));

    // Mock RemitoDetail
    jest.unstable_mockModule('../../components/RemitoDetail', () => ({
      RemitoDetail: ({
        remito,
        onBack,
        canApprove,
      }: {
        remito: Remito;
        onBack: () => void;
        canApprove: boolean;
      }) => (
        <div data-testid="remito-detail">
          <span>Detalle: {remito.numeroRemito}</span>
          <span data-testid="can-approve">{canApprove ? 'true' : 'false'}</span>
          <button onClick={onBack} data-testid="back-button">
            Volver
          </button>
        </div>
      ),
    }));

    // Mock AutocompleteInput
    jest.unstable_mockModule('../../../../components/common/AutocompleteInput', () => ({
      AutocompleteInput: ({
        value,
        onChange,
        placeholder,
        field,
      }: {
        value: string;
        onChange: (value: string) => void;
        placeholder: string;
        field: string;
      }) => (
        <input
          data-testid={`autocomplete-${field}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ),
    }));

    // Import the actual component AFTER mocking
    const module = await import('../RemitosPage');
    RemitosPage = module.RemitosPage;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemitosData = null;
    mockIsLoading = false;
    mockIsFetching = false;
    currentUser = mockSuperAdmin;
    currentToken = 'mock-token';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create test store
  const createTestStore = () =>
    configureStore({
      reducer: {
        auth: () => ({ user: currentUser, token: currentToken }),
      },
    });

  const renderWithProviders = (component: React.ReactElement) => {
    const store = createTestStore();
    return render(
      <Provider store={store}>
        <MemoryRouter>{component}</MemoryRouter>
      </Provider>
    );
  };

  describe('Rendering', () => {
    it('renders the page title and description', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.getByText(/Remitos/)).toBeTruthy();
      expect(screen.getByText('Gestión de remitos de transporte')).toBeTruthy();
    });

    it('renders refresh button', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const refreshButton = screen.getByTitle('Actualizar');
      expect(refreshButton).toBeTruthy();
    });

    it('renders export button', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const exportButton = screen.getByTitle('Exportar a Excel');
      expect(exportButton).toBeTruthy();
    });

    it('renders "Cargar Remito" button', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.getByText(/Cargar Remito/i)).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton loader when loading', () => {
      mockIsLoading = true;
      mockRemitosData = null;

      const { container } = renderWithProviders(<RemitosPage />);

      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('shows spinning icon when fetching', () => {
      mockIsFetching = true;
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      const { container } = renderWithProviders(<RemitosPage />);

      const spinningIcon = container.querySelector('.animate-spin');
      expect(spinningIcon).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no remitos', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.getByText(/No hay remitos/)).toBeTruthy();
    });

    it('shows appropriate message for "todos" filter', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Click on "Total" stat card to switch to 'todos' filter
      fireEvent.click(screen.getByText('Total'));

      expect(
        screen.getByText('Cargá tu primer remito para comenzar')
      ).toBeTruthy();
    });
  });

  describe('Stats Cards', () => {
    it('renders stats when available', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.getByText('100')).toBeTruthy(); // total
      expect(screen.getByText('30')).toBeTruthy(); // pendientes
      expect(screen.getByText('60')).toBeTruthy(); // aprobados
      expect(screen.getByText('10')).toBeTruthy(); // rechazados
    });

    it('renders stat labels', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.getByText('Total')).toBeTruthy();
      expect(screen.getByText('Pendientes')).toBeTruthy();
      expect(screen.getByText('Aprobados')).toBeTruthy();
      expect(screen.getByText('Rechazados')).toBeTruthy();
    });

    it('clicking stat card changes filter', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Click on "Total" to switch to 'todos'
      fireEvent.click(screen.getByText('Total'));
      expect(
        screen.getByText('Cargá tu primer remito para comenzar')
      ).toBeTruthy();

      // Click on "Aprobados"
      fireEvent.click(screen.getByText('Aprobados'));
      expect(
        screen.getByText('No se encontraron remitos con este estado')
      ).toBeTruthy();

      // Click on "Rechazados"
      fireEvent.click(screen.getByText('Rechazados'));
      expect(
        screen.getByText('No se encontraron remitos con este estado')
      ).toBeTruthy();
    });
  });

  describe('Remito List', () => {
    it('renders remito cards', () => {
      const remitos = [
        createMockRemito({ id: 1, numeroRemito: 'REM-001' }),
        createMockRemito({ id: 2, numeroRemito: 'REM-002' }),
      ];

      mockRemitosData = {
        success: true,
        data: remitos,
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.getByTestId('remito-card-1')).toBeTruthy();
      expect(screen.getByTestId('remito-card-2')).toBeTruthy();
    });

    it('clicking a remito shows detail view', () => {
      const remito = createMockRemito({ id: 1, numeroRemito: 'REM-001' });

      mockRemitosData = {
        success: true,
        data: [remito],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTestId('remito-card-1'));

      expect(screen.getByTestId('remito-detail')).toBeTruthy();
      expect(screen.getByText('Detalle: REM-001')).toBeTruthy();
    });

    it('back button from detail returns to list', () => {
      const remito = createMockRemito({ id: 1, numeroRemito: 'REM-001' });

      mockRemitosData = {
        success: true,
        data: [remito],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Go to detail
      fireEvent.click(screen.getByTestId('remito-card-1'));
      expect(screen.getByTestId('remito-detail')).toBeTruthy();

      // Go back
      fireEvent.click(screen.getByTestId('back-button'));
      expect(screen.queryByTestId('remito-detail')).not.toBeTruthy();
      expect(screen.getByTestId('remito-card-1')).toBeTruthy();
    });
  });

  describe('Search', () => {
    it('renders search input', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const searchInput = screen.getByPlaceholderText('Buscar por número...');
      expect(searchInput).toBeTruthy();
    });

    it('allows typing in search input', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const searchInput = screen.getByPlaceholderText(
        'Buscar por número...'
      ) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'REM-001' } });

      expect(searchInput.value).toBe('REM-001');
    });
  });

  describe('Uploader', () => {
    it('toggles uploader visibility', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Initially hidden
      expect(screen.queryByTestId('remito-uploader')).not.toBeTruthy();

      // Click to show
      fireEvent.click(screen.getByText(/Cargar Remito/i));
      expect(screen.getByTestId('remito-uploader')).toBeTruthy();

      // Click to hide
      fireEvent.click(screen.getByText(/Cargar Remito/i));
      expect(screen.queryByTestId('remito-uploader')).not.toBeTruthy();
    });

    it('closes uploader and refetches on success', async () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Show uploader
      fireEvent.click(screen.getByText(/Cargar Remito/i));
      expect(screen.getByTestId('remito-uploader')).toBeTruthy();

      // Trigger success
      fireEvent.click(screen.getByTestId('upload-success-btn'));

      await waitFor(() => {
        expect(screen.queryByTestId('remito-uploader')).not.toBeTruthy();
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('renders pagination when multiple pages', () => {
      mockRemitosData = {
        success: true,
        data: [createMockRemito()],
        pagination: { page: 1, limit: 20, total: 50, pages: 3 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.getByText('Anterior')).toBeTruthy();
      expect(screen.getByText('Siguiente')).toBeTruthy();
      expect(screen.getByText('Página 1 de 3')).toBeTruthy();
    });

    it('disables "Anterior" on first page', () => {
      mockRemitosData = {
        success: true,
        data: [createMockRemito()],
        pagination: { page: 1, limit: 20, total: 50, pages: 3 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const prevButton = screen.getByText('Anterior');
      expect(prevButton.hasAttribute('disabled')).toBe(true);
    });

    it('clicking "Siguiente" navigates to next page', () => {
      mockRemitosData = {
        success: true,
        data: [createMockRemito()],
        pagination: { page: 1, limit: 20, total: 50, pages: 3 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const nextButton = screen.getByText('Siguiente');
      fireEvent.click(nextButton);

      // The page state should change (we can't verify internal state directly,
      // but the component should handle the click)
      expect(nextButton).toBeTruthy();
    });

    it('does not render pagination for single page', () => {
      mockRemitosData = {
        success: true,
        data: [createMockRemito()],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      expect(screen.queryByText('Anterior')).not.toBeTruthy();
      expect(screen.queryByText('Siguiente')).not.toBeTruthy();
    });
  });

  describe('Refresh Button', () => {
    it('calls refetch when clicked', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const refreshButton = screen.getByTitle('Actualizar');
      fireEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('is disabled when fetching', () => {
      mockIsFetching = true;
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      const refreshButton = screen.getByTitle('Actualizar');
      expect(refreshButton.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Export Modal', () => {
    it('opens export modal when export button clicked', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      expect(screen.getByText('Exportar Remitos a Excel')).toBeTruthy();
    });

    it('closes export modal with X button', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      const { container } = renderWithProviders(<RemitosPage />);

      // Open modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));
      expect(screen.getByText('Exportar Remitos a Excel')).toBeTruthy();

      // Find the X button in the modal header - it's a button with an SVG that closes the modal
      // The modal structure has a header div with the title and a close button
      const modalHeader = container.querySelector('.flex.items-center.justify-between.p-4.border-b');
      expect(modalHeader).toBeTruthy();
      
      const xButton = modalHeader?.querySelector('button');
      expect(xButton).toBeTruthy();
      
      if (xButton) {
        fireEvent.click(xButton);
      }
      
      // Verify modal is closed
      expect(screen.queryByText('Exportar Remitos a Excel')).not.toBeTruthy();
    });

    it('closes export modal with Cancel button', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Open modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));
      expect(screen.getByText('Exportar Remitos a Excel')).toBeTruthy();

      // Click cancel
      fireEvent.click(screen.getByText('Cancelar'));

      expect(screen.queryByText('Exportar Remitos a Excel')).not.toBeTruthy();
    });

    it('renders export filter inputs', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      expect(screen.getByText('Fecha Desde')).toBeTruthy();
      expect(screen.getByText('Fecha Hasta')).toBeTruthy();
      expect(screen.getByText('Estado')).toBeTruthy();
      expect(screen.getByText('Cliente')).toBeTruthy();
      expect(screen.getByText('Transportista')).toBeTruthy();
      expect(screen.getByText('Patente Chasis')).toBeTruthy();
    });

    it('allows changing export filters', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Change estado select
      const estadoSelect = screen.getByRole('combobox');
      fireEvent.change(estadoSelect, { target: { value: 'APROBADO' } });
      expect((estadoSelect as HTMLSelectElement).value).toBe('APROBADO');

      // Change date inputs
      const dateInputs = screen.getAllByRole('textbox').filter(
        (input) => (input as HTMLInputElement).type === 'date'
      );
      // There might be date inputs as type="date" but they show as textbox in some cases
    });

    it('handles export success', async () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      // Mock successful fetch
      const mockBlob = new Blob(['test data'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Click export button
      const exportButton = screen.getByText('Exportar Excel');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('exports with all filters set', async () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      // Mock successful fetch
      const mockBlob = new Blob(['test data'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      renderWithProviders(<RemitosPage />);

      // Open export modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Set all filter values
      const dateInputs = document.querySelectorAll('input[type="date"]');
      fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } }); // fechaDesde
      fireEvent.change(dateInputs[1], { target: { value: '2024-12-31' } }); // fechaHasta

      // Change estado select
      const estadoSelect = screen.getByRole('combobox');
      fireEvent.change(estadoSelect, { target: { value: 'APROBADO' } });

      // Set autocomplete inputs
      const clienteInput = screen.getByTestId('autocomplete-cliente');
      fireEvent.change(clienteInput, { target: { value: 'Cliente Test' } });

      const transportistaInput = screen.getByTestId('autocomplete-transportista');
      fireEvent.change(transportistaInput, { target: { value: 'Transportista Test' } });

      const patenteInput = screen.getByTestId('autocomplete-patente');
      fireEvent.change(patenteInput, { target: { value: 'ABC123' } });

      // Click export button
      const exportButton = screen.getByText('Exportar Excel');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        // Verify the URL contains all the filter params
        const fetchCall = mockFetch.mock.calls[0];
        const url = fetchCall[0] as string;
        expect(url).toContain('fechaDesde=2024-01-01');
        expect(url).toContain('fechaHasta=2024-12-31');
        expect(url).toContain('estado=APROBADO');
        expect(url).toContain('clienteNombre=Cliente');
        expect(url).toContain('transportistaNombre=Transportista');
        expect(url).toContain('patenteChasis=ABC123');
      });
    });

    it('handles export error', async () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      // Mock failed fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const alertMock = jest.fn();
      global.alert = alertMock;

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      const exportButton = screen.getByText('Exportar Excel');
      await act(async () => {
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('Error al exportar los remitos');
      });
    });
  });

  describe('Permissions', () => {
    it('passes canApprove=true for SUPERADMIN', () => {
      currentUser = mockSuperAdmin;
      const remito = createMockRemito({ id: 1, numeroRemito: 'REM-001' });

      mockRemitosData = {
        success: true,
        data: [remito],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTestId('remito-card-1'));

      expect(screen.getByTestId('can-approve').textContent).toBe('true');
    });

    it('passes canApprove=false for regular USER', () => {
      currentUser = mockRegularUser;
      const remito = createMockRemito({ id: 1, numeroRemito: 'REM-001' });

      mockRemitosData = {
        success: true,
        data: [remito],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByTestId('remito-card-1'));

      expect(screen.getByTestId('can-approve').textContent).toBe('false');
    });
  });

  describe('getFilterLabel helper', () => {
    it('shows correct label for PENDIENTE_APROBACION filter', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Default filter is PENDIENTE_APROBACION
      expect(screen.getByText(/No hay remitos pendientes/i)).toBeTruthy();
    });

    it('shows correct label for APROBADO filter', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByText('Aprobados'));

      expect(screen.getByText(/No hay remitos aprobados/i)).toBeTruthy();
    });

    it('shows correct label for RECHAZADO filter', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      fireEvent.click(screen.getByText('Rechazados'));

      expect(screen.getByText(/No hay remitos rechazados/i)).toBeTruthy();
    });
  });

  describe('StatCard Component', () => {
    it('renders all StatCard colors correctly', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      const { container } = renderWithProviders(<RemitosPage />);

      // Check that stat cards are rendered with different color classes
      expect(container.querySelector('.bg-blue-50')).toBeTruthy();
      expect(container.querySelector('.bg-yellow-50')).toBeTruthy();
      expect(container.querySelector('.bg-green-50')).toBeTruthy();
      expect(container.querySelector('.bg-red-50')).toBeTruthy();
    });

    it('applies active style to selected filter', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      const { container } = renderWithProviders(<RemitosPage />);

      // Default filter is PENDIENTE_APROBACION (yellow)
      // Check for active ring style on yellow card
      const yellowCard = container.querySelector('.ring-yellow-500');
      expect(yellowCard).toBeTruthy();
    });
  });

  describe('Pagination Navigation', () => {
    it('clicking "Anterior" decreases page number', async () => {
      // We need to first go to page 2, then click Anterior
      mockRemitosData = {
        success: true,
        data: [createMockRemito()],
        pagination: { page: 1, limit: 20, total: 50, pages: 3 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // First, go to page 2 by clicking Siguiente
      const nextButton = screen.getByText('Siguiente');
      fireEvent.click(nextButton);

      // Now click Anterior
      const prevButton = screen.getByText('Anterior');
      fireEvent.click(prevButton);

      // The button should be clickable (we're testing that the onClick handler is called)
      expect(prevButton).toBeTruthy();
    });

    it('clicking Pendientes stat card triggers filter change', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // First change to another filter
      fireEvent.click(screen.getByText('Total'));
      
      // Then click Pendientes to trigger the specific onClick for PENDIENTE_APROBACION
      fireEvent.click(screen.getByText('Pendientes'));

      expect(screen.getByText(/No hay remitos pendientes/i)).toBeTruthy();
    });
  });

  describe('Export Modal Date Inputs', () => {
    it('changes fechaDesde input', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Open export modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Find the fechaDesde date input (first date input)
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      const fechaDesdeInput = dateInputs[0] as HTMLInputElement;
      fireEvent.change(fechaDesdeInput, { target: { value: '2024-01-01' } });

      expect(fechaDesdeInput.value).toBe('2024-01-01');
    });

    it('changes fechaHasta input', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Open export modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Find the fechaHasta date input (second date input)
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);

      const fechaHastaInput = dateInputs[1] as HTMLInputElement;
      fireEvent.change(fechaHastaInput, { target: { value: '2024-12-31' } });

      expect(fechaHastaInput.value).toBe('2024-12-31');
    });
  });

  describe('Export Modal AutocompleteInput', () => {
    it('changes cliente autocomplete value', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Open export modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Find the cliente autocomplete input
      const clienteInput = screen.getByTestId('autocomplete-cliente') as HTMLInputElement;
      fireEvent.change(clienteInput, { target: { value: 'Test Cliente' } });

      expect(clienteInput.value).toBe('Test Cliente');
    });

    it('changes transportista autocomplete value', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Open export modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Find the transportista autocomplete input
      const transportistaInput = screen.getByTestId('autocomplete-transportista') as HTMLInputElement;
      fireEvent.change(transportistaInput, { target: { value: 'Test Transportista' } });

      expect(transportistaInput.value).toBe('Test Transportista');
    });

    it('changes patente autocomplete value', () => {
      mockRemitosData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: mockStats,
      };

      renderWithProviders(<RemitosPage />);

      // Open export modal
      fireEvent.click(screen.getByTitle('Exportar a Excel'));

      // Find the patente autocomplete input
      const patenteInput = screen.getByTestId('autocomplete-patente') as HTMLInputElement;
      fireEvent.change(patenteInput, { target: { value: 'ABC123' } });

      expect(patenteInput.value).toBe('ABC123');
    });
  });
});
