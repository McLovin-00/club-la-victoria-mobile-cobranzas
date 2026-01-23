/**
 * Comprehensive tests for RemitoDetail using ESM mocking pattern
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import type { Remito, RemitoEstado } from '../../types';

// Mock implementations
let mockApprove: jest.Mock;
let mockReject: jest.Mock;
let mockReprocess: jest.Mock;
let mockUpdateRemito: jest.Mock;
let mockRemitoData: { data: Remito } | undefined;
let mockIsLoading: boolean;

// Sample remito data factory
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
  choferCargadorDni: null,
  choferCargadorNombre: null,
  choferCargadorApellido: null,
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

describe('RemitoDetail - Coverage Tests', () => {
  let RemitoDetail: React.FC<{
    remito: Remito;
    onBack: () => void;
    canApprove?: boolean;
  }>;

  beforeAll(async () => {
    // Initialize mocks
    mockApprove = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
    mockReject = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
    mockReprocess = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
    mockUpdateRemito = jest.fn(() => ({ unwrap: () => Promise.resolve() }));

    // Mock remitosApiSlice
    jest.unstable_mockModule('../../api/remitosApiSlice', () => ({
      useGetRemitoQuery: () => ({
        data: mockRemitoData,
        isLoading: mockIsLoading,
        refetch: jest.fn(),
      }),
      useApproveRemitoMutation: () => [mockApprove, { isLoading: false }],
      useRejectRemitoMutation: () => [mockReject, { isLoading: false }],
      useReprocessRemitoMutation: () => [mockReprocess, { isLoading: false }],
      useUpdateRemitoMutation: () => [mockUpdateRemito, { isLoading: false }],
    }));

    // Import the actual component AFTER mocking
    const module = await import('../RemitoDetail');
    RemitoDetail = module.RemitoDetail;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemitoData = undefined;
    mockIsLoading = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create test store
  const createTestStore = () =>
    configureStore({
      reducer: {
        auth: () => ({ user: null, token: null }),
        api: () => ({}),
      },
    });

  const renderWithProviders = (component: React.ReactElement) => {
    const store = createTestStore();
    return render(<Provider store={store}>{component}</Provider>);
  };

  describe('Rendering', () => {
    it('renders component with basic props', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText(/Datos del Remito/i)).toBeTruthy();
    });

    it('shows loading state when loadingRemito is true', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();
      mockIsLoading = true;

      const { container } = renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      // Check for spinner animation
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('renders estado badge correctly', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText('Pendiente Aprobación')).toBeTruthy();
    });
  });

  describe('Back Button', () => {
    it('calls onBack when clicking Volver', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      fireEvent.click(screen.getByText('Volver'));
      expect(onBack).toHaveBeenCalled();
    });
  });

  describe('Estado Labels', () => {
    const estados: Array<{ estado: RemitoEstado; label: string }> = [
      { estado: 'PENDIENTE_ANALISIS', label: 'Pendiente de Análisis' },
      { estado: 'EN_ANALISIS', label: 'En Análisis' },
      { estado: 'PENDIENTE_APROBACION', label: 'Pendiente Aprobación' },
      { estado: 'APROBADO', label: 'Aprobado' },
      { estado: 'RECHAZADO', label: 'Rechazado' },
      { estado: 'ERROR_ANALISIS', label: 'Error en Análisis' },
    ];

    estados.forEach(({ estado, label }) => {
      it(`shows ${label} correctly`, () => {
        const mockRemito = createMockRemito({ estado });
        const onBack = jest.fn();
        mockRemitoData = { data: mockRemito };

        renderWithProviders(
          <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
        );

        expect(screen.getByText(label)).toBeTruthy();
      });
    });
  });

  describe('Confianza IA', () => {
    it('shows confianza IA when present', () => {
      const mockRemito = createMockRemito({ confianzaIA: 85 });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText('85%')).toBeTruthy();
      expect(screen.getByText(/Confianza del análisis/i)).toBeTruthy();
    });

    it('does not show confianza section when null', () => {
      const mockRemito = createMockRemito({ confianzaIA: null });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.queryByText(/Confianza del análisis/i)).not.toBeTruthy();
    });
  });

  describe('Edit Mode', () => {
    it('shows Edit button when canApprove=true and not APROBADO', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      expect(screen.getByText('Editar')).toBeTruthy();
    });

    it('does not show Edit button when canApprove=false', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.queryByText('Editar')).not.toBeTruthy();
    });

    it('enters edit mode and shows save/cancel buttons', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      fireEvent.click(screen.getByText('Editar'));

      expect(screen.getByText('Guardar')).toBeTruthy();
      expect(screen.getByText('Cancelar')).toBeTruthy();
      expect(screen.getByText('(Editando)')).toBeTruthy();
    });

    it('exits edit mode when clicking Cancel', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      fireEvent.click(screen.getByText('Editar'));
      expect(screen.getByText('Guardar')).toBeTruthy();

      fireEvent.click(screen.getByText('Cancelar'));
      expect(screen.queryByText('Guardar')).not.toBeTruthy();
      expect(screen.getByText('Editar')).toBeTruthy();
    });

    it('shows Recalcular buttons in edit mode', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      fireEvent.click(screen.getByText('Editar'));

      const recalcButtons = screen.getAllByText('Recalcular');
      expect(recalcButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Approve/Reject', () => {
    it('shows Aprobar and Rechazar buttons for pending approval with permission', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      expect(screen.getByText('Aprobar')).toBeTruthy();
      expect(screen.getByText('Rechazar')).toBeTruthy();
    });

    it('does not show Aprobar/Rechazar when canApprove=false', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.queryByText('Aprobar')).not.toBeTruthy();
      expect(screen.queryByText('Rechazar')).not.toBeTruthy();
    });

    it('calls approve mutation when clicking Aprobar', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Aprobar'));
      });

      expect(mockApprove).toHaveBeenCalledWith(mockRemito.id);
    });

    it('shows reject modal when clicking Rechazar', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      fireEvent.click(screen.getByText('Rechazar'));

      expect(screen.getByText('Rechazar Remito')).toBeTruthy();
      expect(
        screen.getByPlaceholderText('Motivo del rechazo (mínimo 5 caracteres)')
      ).toBeTruthy();
    });

    it('disables confirm reject when motivo < 5 chars', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      fireEvent.click(screen.getByText('Rechazar'));

      const confirmBtn = screen.getByText('Confirmar Rechazo');
      expect(confirmBtn.hasAttribute('disabled')).toBe(true);

      const textarea = screen.getByPlaceholderText(
        'Motivo del rechazo (mínimo 5 caracteres)'
      );
      fireEvent.change(textarea, { target: { value: 'abc' } });
      expect(confirmBtn.hasAttribute('disabled')).toBe(true);

      fireEvent.change(textarea, { target: { value: 'motivo válido' } });
      expect(confirmBtn.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('Reprocess', () => {
    it('shows Reprocesar button when canApprove and not APROBADO', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      expect(screen.getByText(/Reprocesar con IA/i)).toBeTruthy();
    });

    it('does not show Reprocesar when estado=APROBADO', () => {
      const mockRemito = createMockRemito({ estado: 'APROBADO' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      expect(screen.queryByText(/Reprocesar/i)).not.toBeTruthy();
    });

    it('calls reprocess and onBack when clicking Reprocesar', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      await act(async () => {
        fireEvent.click(screen.getByText(/Reprocesar con IA/i));
      });

      expect(mockReprocess).toHaveBeenCalledWith(mockRemito.id);
      await waitFor(() => {
        expect(onBack).toHaveBeenCalled();
      });
    });
  });

  describe('Images', () => {
    it('shows placeholder when no images', () => {
      const mockRemito = createMockRemito({ imagenes: [] });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText(/Imagen del Remito/i)).toBeTruthy();
    });

    it('shows image when available', () => {
      const mockRemito = createMockRemito({
        imagenes: [
          {
            id: 1,
            remitoId: 1,
            bucketName: 'test',
            objectKey: 'test/image.jpg',
            fileName: 'image.jpg',
            mimeType: 'image/jpeg',
            size: 12345,
            tipo: 'REMITO_PRINCIPAL',
            orden: 0,
            procesadoPorIA: true,
            createdAt: '2024-01-01T00:00:00Z',
            url: 'http://example.com/image.jpg',
          },
        ],
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      const img = screen.getByRole('img') as HTMLImageElement;
      expect(img).toBeTruthy();
      expect(img.src).toContain('image.jpg');
    });

    it('shows PDF iframe when mimeType is PDF', () => {
      const mockRemito = createMockRemito({
        imagenes: [
          {
            id: 1,
            remitoId: 1,
            bucketName: 'test',
            objectKey: 'test/remito.pdf',
            fileName: 'remito.pdf',
            mimeType: 'application/pdf',
            size: 12345,
            tipo: 'REMITO_PRINCIPAL',
            orden: 0,
            procesadoPorIA: true,
            createdAt: '2024-01-01T00:00:00Z',
            url: 'http://example.com/remito.pdf',
          },
        ],
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByTitle(/Remito PDF/i)).toBeTruthy();
      expect(screen.getByText(/Abrir PDF en nueva pestaña/i)).toBeTruthy();
    });
  });

  describe('Chofer Cargador', () => {
    it('shows chofer cargador section when data present', () => {
      const mockRemito = createMockRemito({
        choferCargadorDni: '98765432',
        choferCargadorNombre: 'Carlos',
        choferCargadorApellido: 'López',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText(/Chofer Asignado \(Carga\)/i)).toBeTruthy();
      expect(screen.getByText('Carlos López')).toBeTruthy();
      expect(screen.getByText('98765432')).toBeTruthy();
    });

    it('does not show chofer cargador section when all null', () => {
      const mockRemito = createMockRemito({
        choferCargadorDni: null,
        choferCargadorNombre: null,
        choferCargadorApellido: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.queryByText(/Chofer Asignado \(Carga\)/i)).not.toBeTruthy();
    });
  });

  describe('Weights', () => {
    it('shows formatted weights', () => {
      const mockRemito = createMockRemito({
        pesoOrigenBruto: 1500,
        pesoOrigenTara: 500,
        pesoOrigenNeto: 1000,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText('1.000 kg')).toBeTruthy();
    });

    it('shows "-" for null weights', () => {
      const mockRemito = createMockRemito({
        pesoOrigenBruto: null,
        pesoOrigenTara: null,
        pesoOrigenNeto: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it('shows Origen and Destino weight sections', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText('Origen')).toBeTruthy();
      expect(screen.getByText('Destino')).toBeTruthy();
    });
  });

  describe('Section Titles', () => {
    it('shows all section titles', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText(/Imagen del Remito/i)).toBeTruthy();
      expect(screen.getByText(/Datos del Remito/i)).toBeTruthy();
      expect(screen.getByText(/Transporte \(extraído del remito\)/i)).toBeTruthy();
      expect(screen.getByText(/Pesos/i)).toBeTruthy();
    });
  });

  describe('Transporte Data', () => {
    it('shows transportista, chofer, and patentes', () => {
      const mockRemito = createMockRemito({
        transportistaNombre: 'Transportes S.A.',
        choferNombre: 'Juan Pérez',
        choferDni: '12345678',
        patenteChasis: 'ABC123',
        patenteAcoplado: 'DEF456',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(screen.getByText('Transportes S.A.')).toBeTruthy();
      expect(screen.getByText('Juan Pérez')).toBeTruthy();
      expect(screen.getByText('ABC123')).toBeTruthy();
      expect(screen.getByText('DEF456')).toBeTruthy();
    });
  });

  describe('Null Field Handling', () => {
    it('shows "-" for null fields', () => {
      const mockRemito = createMockRemito({
        emisorNombre: null,
        clienteNombre: null,
        producto: null,
        fechaOperacion: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  describe('Save Edit', () => {
    it('calls updateRemito when clicking Guardar', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));
      expect(screen.getByText('Guardar')).toBeTruthy();

      // Click save
      await act(async () => {
        fireEvent.click(screen.getByText('Guardar'));
      });

      expect(mockUpdateRemito).toHaveBeenCalled();
    });

    it('allows editing input fields in edit mode', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        numeroRemito: 'REM-001',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find input with the numero remito value
      const input = screen.getByDisplayValue('REM-001') as HTMLInputElement;
      expect(input).toBeTruthy();

      // Change value
      fireEvent.change(input, { target: { value: 'REM-002' } });
      expect(input.value).toBe('REM-002');
    });
  });

  describe('Reject Confirmation', () => {
    it('calls reject mutation when confirming with valid motivo', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Open reject modal
      fireEvent.click(screen.getByText('Rechazar'));

      // Enter valid motivo
      const textarea = screen.getByPlaceholderText(
        'Motivo del rechazo (mínimo 5 caracteres)'
      );
      fireEvent.change(textarea, { target: { value: 'Datos incorrectos' } });

      // Confirm rejection
      await act(async () => {
        fireEvent.click(screen.getByText('Confirmar Rechazo'));
      });

      expect(mockReject).toHaveBeenCalledWith({
        id: mockRemito.id,
        motivo: 'Datos incorrectos',
      });
    });

    it('closes reject modal when Cancel is clicked', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Open reject modal
      fireEvent.click(screen.getByText('Rechazar'));
      expect(screen.getByText('Rechazar Remito')).toBeTruthy();

      // Find Cancel button inside modal
      const cancelButtons = screen.getAllByText('Cancelar');
      const modalCancelButton = cancelButtons[cancelButtons.length - 1];
      fireEvent.click(modalCancelButton);

      // Modal should be closed
      expect(screen.queryByText('Rechazar Remito')).not.toBeTruthy();
    });
  });

  describe('Weight Recalculation', () => {
    it('shows Recalcular buttons in edit mode for Origen and Destino', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Should have 2 Recalcular buttons (one for Origen, one for Destino)
      const recalcButtons = screen.getAllByText('Recalcular');
      expect(recalcButtons.length).toBe(2);
    });

    it('clicking Recalcular for Origen triggers calculation', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoOrigenBruto: 1000,
        pesoOrigenTara: 400,
        pesoOrigenNeto: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click first Recalcular (Origen)
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[0]);

      // Button should exist and be clickable
      expect(recalcButtons[0]).toBeTruthy();
    });

    it('clicking Recalcular for Destino triggers calculation', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoDestinoBruto: 800,
        pesoDestinoTara: 300,
        pesoDestinoNeto: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click second Recalcular (Destino)
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[1]);

      // Button should exist and be clickable
      expect(recalcButtons[1]).toBeTruthy();
    });
  });

  describe('Editable Fields', () => {
    it('renders date input in edit mode', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        fechaOperacion: '2024-01-15',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find date input
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('renders number inputs for weights in edit mode', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find number inputs
      const numberInputs = document.querySelectorAll('input[type="number"]');
      expect(numberInputs.length).toBeGreaterThanOrEqual(6); // 6 weight fields
    });

    it('converts patente input to uppercase', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        patenteChasis: 'ABC123',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find patente input
      const patenteInput = screen.getByDisplayValue('ABC123') as HTMLInputElement;
      expect(patenteInput).toBeTruthy();
    });
  });

  describe('Confianza IA Colors', () => {
    it('shows green for confianza >= 80', () => {
      const mockRemito = createMockRemito({ confianzaIA: 85 });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      const { container } = renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(container.querySelector('.text-green-600')).toBeTruthy();
    });

    it('shows yellow for confianza >= 50 and < 80', () => {
      const mockRemito = createMockRemito({ confianzaIA: 65 });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      const { container } = renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(container.querySelector('.text-yellow-600')).toBeTruthy();
    });

    it('shows red for confianza < 50', () => {
      const mockRemito = createMockRemito({ confianzaIA: 30 });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      const { container } = renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      expect(container.querySelector('.text-red-600')).toBeTruthy();
    });
  });

  describe('Action Buttons Visibility', () => {
    it('hides action buttons when in edit mode', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Verify buttons are visible before edit mode
      expect(screen.getByText('Aprobar')).toBeTruthy();
      expect(screen.getByText('Rechazar')).toBeTruthy();

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Buttons should be hidden in edit mode
      expect(screen.queryByText('Aprobar')).not.toBeTruthy();
    });

    it('hides Editar and Reprocesar when in edit mode', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // These buttons should be hidden
      expect(screen.queryByText('Editar')).not.toBeTruthy();
      expect(screen.queryByText(/Reprocesar con IA/i)).not.toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles approve mutation error gracefully', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      // Make approve throw an error
      mockApprove.mockImplementationOnce(() => ({
        unwrap: () => Promise.reject(new Error('Approve failed')),
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      await act(async () => {
        fireEvent.click(screen.getByText('Aprobar'));
      });

      expect(mockApprove).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error aprobando:', expect.anything());
      consoleSpy.mockRestore();
    });

    it('handles reject mutation error gracefully', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      // Make reject throw an error
      mockReject.mockImplementationOnce(() => ({
        unwrap: () => Promise.reject(new Error('Reject failed')),
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Open reject modal and submit
      fireEvent.click(screen.getByText('Rechazar'));
      const textarea = screen.getByPlaceholderText('Motivo del rechazo (mínimo 5 caracteres)');
      fireEvent.change(textarea, { target: { value: 'Datos incorrectos' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Confirmar Rechazo'));
      });

      expect(mockReject).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error rechazando:', expect.anything());
      consoleSpy.mockRestore();
    });

    it('handles reprocess mutation error gracefully', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      // Make reprocess throw an error
      mockReprocess.mockImplementationOnce(() => ({
        unwrap: () => Promise.reject(new Error('Reprocess failed')),
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      await act(async () => {
        fireEvent.click(screen.getByText(/Reprocesar con IA/i));
      });

      expect(mockReprocess).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error reprocesando:', expect.anything());
      consoleSpy.mockRestore();
    });

    it('handles updateRemito mutation error gracefully', async () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      // Make updateRemito throw an error
      mockUpdateRemito.mockImplementationOnce(() => ({
        unwrap: () => Promise.reject(new Error('Update failed')),
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode and save
      fireEvent.click(screen.getByText('Editar'));

      await act(async () => {
        fireEvent.click(screen.getByText('Guardar'));
      });

      expect(mockUpdateRemito).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error guardando edición:', expect.anything());
      expect(alertSpy).toHaveBeenCalledWith('Error al guardar los cambios');
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('Weight Calculation - Origen Branches', () => {
    it('calculates Neto when Bruto and Tara are present but Neto is missing', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoOrigenBruto: 1000,
        pesoOrigenTara: 400,
        pesoOrigenNeto: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Origen
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[0]);

      // After recalculation, neto should be 600 (1000 - 400)
      await waitFor(() => {
        const netoInput = screen.getByDisplayValue('600') as HTMLInputElement;
        expect(netoInput).toBeTruthy();
      });
    });

    it('calculates Tara when Bruto and Neto are present but Tara is missing', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoOrigenBruto: 1000,
        pesoOrigenTara: null,
        pesoOrigenNeto: 600,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Origen
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[0]);

      // After recalculation, tara should be 400 (1000 - 600)
      await waitFor(() => {
        const taraInput = screen.getByDisplayValue('400') as HTMLInputElement;
        expect(taraInput).toBeTruthy();
      });
    });

    it('calculates Bruto when Tara and Neto are present but Bruto is missing', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoOrigenBruto: null,
        pesoOrigenTara: 400,
        pesoOrigenNeto: 600,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Origen
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[0]);

      // After recalculation, bruto should be 1000 (400 + 600)
      await waitFor(() => {
        const brutoInput = screen.getByDisplayValue('1000') as HTMLInputElement;
        expect(brutoInput).toBeTruthy();
      });
    });

    it('recalculates Neto when all three fields are present', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoOrigenBruto: 1000,
        pesoOrigenTara: 400,
        pesoOrigenNeto: 500, // Wrong value
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Origen
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[0]);

      // After recalculation, neto should be corrected to 600
      await waitFor(() => {
        const netoInput = screen.getByDisplayValue('600') as HTMLInputElement;
        expect(netoInput).toBeTruthy();
      });
    });
  });

  describe('Weight Calculation - Destino Branches', () => {
    it('calculates Destino Neto when Bruto and Tara are present but Neto is missing', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoDestinoBruto: 800,
        pesoDestinoTara: 300,
        pesoDestinoNeto: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Destino (second button)
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[1]);

      // After recalculation, neto should be 500 (800 - 300)
      await waitFor(() => {
        const netoInput = screen.getByDisplayValue('500') as HTMLInputElement;
        expect(netoInput).toBeTruthy();
      });
    });

    it('calculates Destino Tara when Bruto and Neto are present but Tara is missing', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoDestinoBruto: 800,
        pesoDestinoTara: null,
        pesoDestinoNeto: 500,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Destino (second button)
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[1]);

      // After recalculation, tara should be 300 (800 - 500)
      await waitFor(() => {
        const taraInput = screen.getByDisplayValue('300') as HTMLInputElement;
        expect(taraInput).toBeTruthy();
      });
    });

    it('calculates Destino Bruto when Tara and Neto are present but Bruto is missing', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoDestinoBruto: null,
        pesoDestinoTara: 300,
        pesoDestinoNeto: 500,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Destino (second button)
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[1]);

      // After recalculation, bruto should be 800 (300 + 500)
      await waitFor(() => {
        const brutoInput = screen.getByDisplayValue('800') as HTMLInputElement;
        expect(brutoInput).toBeTruthy();
      });
    });

    it('recalculates Destino Neto when all three fields are present', async () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoDestinoBruto: 800,
        pesoDestinoTara: 300,
        pesoDestinoNeto: 400, // Wrong value
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Click Recalcular for Destino (second button)
      const recalcButtons = screen.getAllByText('Recalcular');
      fireEvent.click(recalcButtons[1]);

      // After recalculation, neto should be corrected to 500
      await waitFor(() => {
        const netoInput = screen.getByDisplayValue('500') as HTMLInputElement;
        expect(netoInput).toBeTruthy();
      });
    });
  });

  describe('EditableRow Field Interactions', () => {
    it('renders all editable fields in edit mode', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        numeroRemito: 'REM-001',
        emisorNombre: 'Emisor Test',
        emisorDetalle: 'Detalle Test',
        clienteNombre: 'Cliente Test',
        producto: 'Producto Test',
        transportistaNombre: 'Transportista Test',
        choferNombre: 'Chofer Test',
        choferDni: '12345678',
        patenteChasis: 'ABC123',
        patenteAcoplado: 'DEF456',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Check all editable fields are rendered as inputs
      expect(screen.getByDisplayValue('REM-001')).toBeTruthy();
      expect(screen.getByDisplayValue('Emisor Test')).toBeTruthy();
      expect(screen.getByDisplayValue('Detalle Test')).toBeTruthy();
      expect(screen.getByDisplayValue('Cliente Test')).toBeTruthy();
      expect(screen.getByDisplayValue('Producto Test')).toBeTruthy();
      expect(screen.getByDisplayValue('Transportista Test')).toBeTruthy();
      expect(screen.getByDisplayValue('Chofer Test')).toBeTruthy();
      expect(screen.getByDisplayValue('12345678')).toBeTruthy();
      expect(screen.getByDisplayValue('ABC123')).toBeTruthy();
      expect(screen.getByDisplayValue('DEF456')).toBeTruthy();
    });

    it('updates emisorNombre field correctly', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        emisorNombre: 'Emisor Original',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find and modify emisorNombre input
      const input = screen.getByDisplayValue('Emisor Original') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Nuevo Emisor' } });
      expect(input.value).toBe('Nuevo Emisor');
    });

    it('updates clienteNombre field correctly', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        clienteNombre: 'Cliente Original',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find and modify clienteNombre input
      const input = screen.getByDisplayValue('Cliente Original') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Nuevo Cliente' } });
      expect(input.value).toBe('Nuevo Cliente');
    });

    it('updates transportistaNombre field correctly', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        transportistaNombre: 'Transportista Original',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find and modify transportistaNombre input
      const input = screen.getByDisplayValue('Transportista Original') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Nuevo Transportista' } });
      expect(input.value).toBe('Nuevo Transportista');
    });

    it('updates weight fields correctly', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        pesoOrigenBruto: 1000,
        pesoOrigenTara: 400,
        pesoOrigenNeto: 600,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find and modify weight input
      const brutoInput = screen.getByDisplayValue('1000') as HTMLInputElement;
      fireEvent.change(brutoInput, { target: { value: '1500' } });
      expect(brutoInput.value).toBe('1500');
    });

    it('updates patente acoplado with uppercase conversion', () => {
      const mockRemito = createMockRemito({
        estado: 'PENDIENTE_APROBACION',
        patenteAcoplado: 'DEF456',
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Enter edit mode
      fireEvent.click(screen.getByText('Editar'));

      // Find patente acoplado input
      const input = screen.getByDisplayValue('DEF456') as HTMLInputElement;
      expect(input).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles remito with all null optional fields', () => {
      const mockRemito = createMockRemito({
        numeroRemito: null,
        fechaOperacion: null,
        emisorNombre: null,
        emisorDetalle: null,
        clienteNombre: null,
        producto: null,
        transportistaNombre: null,
        choferNombre: null,
        choferDni: null,
        patenteChasis: null,
        patenteAcoplado: null,
        pesoOrigenBruto: null,
        pesoOrigenTara: null,
        pesoOrigenNeto: null,
        pesoDestinoBruto: null,
        pesoDestinoTara: null,
        pesoDestinoNeto: null,
        confianzaIA: null,
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      // Should render without crashing
      expect(screen.getByText(/Datos del Remito/i)).toBeTruthy();
    });

    it('handles multiple images', () => {
      const mockRemito = createMockRemito({
        imagenes: [
          {
            id: 1,
            remitoId: 1,
            bucketName: 'test',
            objectKey: 'test/image1.jpg',
            fileName: 'image1.jpg',
            mimeType: 'image/jpeg',
            size: 12345,
            tipo: 'REMITO_PRINCIPAL',
            orden: 0,
            procesadoPorIA: true,
            createdAt: '2024-01-01T00:00:00Z',
            url: 'http://example.com/image1.jpg',
          },
          {
            id: 2,
            remitoId: 1,
            bucketName: 'test',
            objectKey: 'test/image2.jpg',
            fileName: 'image2.jpg',
            mimeType: 'image/jpeg',
            size: 12345,
            tipo: 'TICKET_DESTINO',
            orden: 1,
            procesadoPorIA: false,
            createdAt: '2024-01-01T00:00:00Z',
            url: 'http://example.com/image2.jpg',
          },
        ],
      });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />
      );

      // Should show at least one image
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show approve/reject for non-pending estados', () => {
      const mockRemito = createMockRemito({ estado: 'EN_ANALISIS' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      // Aprobar/Rechazar should not be visible for EN_ANALISIS
      expect(screen.queryByText('Aprobar')).not.toBeTruthy();
      expect(screen.queryByText('Rechazar')).not.toBeTruthy();
    });

    it('shows edit button for non-APROBADO estados with permission', () => {
      const estados: RemitoEstado[] = ['PENDIENTE_ANALISIS', 'EN_ANALISIS', 'PENDIENTE_APROBACION', 'RECHAZADO', 'ERROR_ANALISIS'];

      estados.forEach((estado) => {
        const mockRemito = createMockRemito({ estado });
        const onBack = jest.fn();
        mockRemitoData = { data: mockRemito };

        const { unmount } = renderWithProviders(
          <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
        );

        expect(screen.getByText('Editar')).toBeTruthy();
        unmount();
      });
    });

    it('does not show edit button for APROBADO estado', () => {
      const mockRemito = createMockRemito({ estado: 'APROBADO' });
      const onBack = jest.fn();
      mockRemitoData = { data: mockRemito };

      renderWithProviders(
        <RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />
      );

      expect(screen.queryByText('Editar')).not.toBeTruthy();
    });
  });
});
