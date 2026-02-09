import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Remito, RemitoEstado } from '../../types';

// Helper para crear un remito mock completo
const createMockRemito = (overrides: Partial<Remito> = {}): Remito => ({
  id: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  numeroRemito: 'R-1',
  fechaOperacion: '2024-01-15T00:00:00.000Z',
  emisorNombre: 'Emisor Test',
  emisorDetalle: 'Detalle Test',
  clienteNombre: 'Cliente Test',
  producto: 'Producto Test',
  transportistaNombre: 'Transportista Test',
  choferNombre: 'Juan Pérez',
  choferDni: '12345678',
  patenteChasis: 'ABC123',
  patenteAcoplado: 'DEF456',
  pesoOrigenBruto: 1000,
  pesoOrigenTara: 500,
  pesoOrigenNeto: 500,
  pesoDestinoBruto: 800,
  pesoDestinoTara: 300,
  pesoDestinoNeto: 500,
  tieneTicketDestino: false,
  equipoId: null,
  choferId: null,
  dadorCargaId: 1,
  tenantEmpresaId: 1,
  choferCargadorDni: null,
  choferCargadorNombre: null,
  choferCargadorApellido: null,
  estado: 'PENDIENTE_APROBACION',
  cargadoPorUserId: 1,
  cargadoPorRol: 'ADMIN',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  rechazadoPorUserId: null,
  rechazadoAt: null,
  motivoRechazo: null,
  confianzaIA: null,
  camposDetectados: [],
  erroresAnalisis: [],
  analizadoAt: null,
  imagenes: [],
  ...overrides,
});

// Mock de RTK Query hooks - debe estar antes del import del componente
const mockApprove = jest.fn(() => ({ unwrap: jest.fn() }));
const mockReject = jest.fn(() => ({ unwrap: jest.fn() }));
const mockReprocess = jest.fn(() => ({ unwrap: jest.fn() }));
const mockUpdateRemito = jest.fn(() => ({ unwrap: jest.fn() }));

jest.mock('../../api/remitosApiSlice', () => ({
  useGetRemitoQuery: () => ({ data: { data: createMockRemito() }, isLoading: false, refetch: jest.fn() }),
  useApproveRemitoMutation: () => [mockApprove, { isLoading: false }],
  useRejectRemitoMutation: () => [mockReject, { isLoading: false }],
  useReprocessRemitoMutation: () => [mockReprocess, { isLoading: false }],
  useUpdateRemitoMutation: () => [mockUpdateRemito, { isLoading: false }],
}));

// Mock del store de Redux
jest.mock('@/store/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({ auth: {}, ui: {} })),
    subscribe: jest.fn(() => () => {}),
  },
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: jest.fn((selector) => selector({ auth: {}, ui: {} })),
  useAppDispatch: () => jest.fn(),
}));

// Importar componente después de los mocks
import { RemitoDetail } from '../RemitoDetail';

describe('RemitoDetail', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(globalThis, 'alert').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    (console.error as jest.MockedFunction<typeof console.error>).mockRestore();
    (globalThis.alert as jest.MockedFunction<typeof globalThis.alert>).mockRestore();
  });

  // Test básico de renderizado
  it('renderiza RemitoDetail con props mínimos', () => {
    const mockRemito = createMockRemito();
    const onBack = jest.fn();

    render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

    expect(screen.getByText(/Datos del Remito/i)).toBeInTheDocument();
    expect(screen.getByText('R-1')).toBeInTheDocument();
  });

  // Test de botón volver
  it('llama onBack cuando se hace click en Volver', () => {
    const mockRemito = createMockRemito();
    const onBack = jest.fn();

    render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

    fireEvent.click(screen.getByText('Volver'));
    expect(onBack).toHaveBeenCalled();
  });

  // Test de estados
  describe('etiquetas de estado', () => {
    it.each<{ estado: RemitoEstado; label: string }>([
      { estado: 'PENDIENTE_ANALISIS', label: 'Pendiente de Análisis' },
      { estado: 'EN_ANALISIS', label: 'En Análisis' },
      { estado: 'PENDIENTE_APROBACION', label: 'Pendiente Aprobación' },
      { estado: 'APROBADO', label: 'Aprobado' },
      { estado: 'RECHAZADO', label: 'Rechazado' },
      { estado: 'ERROR_ANALISIS', label: 'Error en Análisis' },
    ])('muestra estado $label correctamente', ({ estado, label }) => {
      const mockRemito = createMockRemito({ estado });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  // Test de confianza IA
  describe('confianza IA', () => {
    it('muestra confianza IA verde cuando >= 80', () => {
      const mockRemito = createMockRemito({ confianzaIA: 85 });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText(/Confianza del análisis/i)).toBeInTheDocument();
    });

    it('muestra confianza IA amarilla cuando >= 50 y < 80', () => {
      const mockRemito = createMockRemito({ confianzaIA: 65 });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('muestra confianza IA roja cuando < 50', () => {
      const mockRemito = createMockRemito({ confianzaIA: 30 });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('no muestra sección de confianza cuando confianzaIA es null', () => {
      const mockRemito = createMockRemito({ confianzaIA: null });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.queryByText(/Confianza del análisis/i)).not.toBeInTheDocument();
    });
  });

  // Test de sección chofer cargador
  describe('chofer cargador', () => {
    it('muestra sección de chofer cargador cuando hay datos', () => {
      const mockRemito = createMockRemito({
        choferCargadorDni: '98765432',
        choferCargadorNombre: 'Carlos',
        choferCargadorApellido: 'López',
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/Chofer Asignado \(Carga\)/i)).toBeInTheDocument();
      expect(screen.getByText('Carlos López')).toBeInTheDocument();
      expect(screen.getByText('98765432')).toBeInTheDocument();
    });

    it('no muestra sección de chofer cargador cuando todos los campos son null', () => {
      const mockRemito = createMockRemito({
        choferCargadorDni: null,
        choferCargadorNombre: null,
        choferCargadorApellido: null,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.queryByText(/Chofer Asignado \(Carga\)/i)).not.toBeInTheDocument();
    });
  });

  // Test de permisos y botones de acción
  describe('permisos canEdit y canReprocess', () => {
    it('muestra botón Editar cuando canApprove=true y estado=PENDIENTE_APROBACION', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    it('NO muestra botón Editar cuando canApprove=false', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    });

    it('NO muestra botón Editar cuando estado=APROBADO', () => {
      const mockRemito = createMockRemito({ estado: 'APROBADO' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    });

    it('muestra botón Reprocesar cuando canApprove=true y estado NO es APROBADO', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.getByText(/Reprocesar/i)).toBeInTheDocument();
    });

    it('NO muestra botón Reprocesar cuando estado=APROBADO', () => {
      const mockRemito = createMockRemito({ estado: 'APROBADO' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText(/Reprocesar/i)).not.toBeInTheDocument();
    });
  });

  // Test de botones de aprobación
  describe('botones de aprobación', () => {
    it('muestra botones Aprobar y Rechazar cuando canApprove=true y estado=PENDIENTE_APROBACION', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.getByText('Aprobar')).toBeInTheDocument();
      expect(screen.getByText('Rechazar')).toBeInTheDocument();
    });

    it('NO muestra botones Aprobar y Rechazar cuando canApprove=false', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.queryByText('Aprobar')).not.toBeInTheDocument();
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument();
    });

    it('NO muestra botones Aprobar y Rechazar cuando estado=APROBADO', () => {
      const mockRemito = createMockRemito({ estado: 'APROBADO' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText('Aprobar')).not.toBeInTheDocument();
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument();
    });

    it('NO muestra botones Aprobar y Rechazar cuando estado=RECHAZADO', () => {
      const mockRemito = createMockRemito({ estado: 'RECHAZADO' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText('Aprobar')).not.toBeInTheDocument();
    });
  });

  // Test de pesos
  describe('pesos', () => {
    it('muestra pesos formateados correctamente', () => {
      const mockRemito = createMockRemito({
        pesoOrigenBruto: 1500,
        pesoOrigenTara: 500,
        pesoOrigenNeto: 1000,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('1.000 kg')).toBeInTheDocument();
    });

    it('muestra "-" cuando peso es null', () => {
      const mockRemito = createMockRemito({
        pesoOrigenBruto: null,
        pesoOrigenTara: null,
        pesoOrigenNeto: null,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      const pesoElements = screen.getAllByText('-');
      expect(pesoElements.length).toBeGreaterThan(0);
    });
  });

  // Test de transporte
  describe('transporte', () => {
    it('muestra datos del transporte extraído', () => {
      const mockRemito = createMockRemito({
        transportistaNombre: 'Transportes S.A.',
        choferNombre: 'Juan Pérez',
        choferDni: '12345678',
        patenteChasis: 'ABC123',
        patenteAcoplado: 'DEF456',
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('Transportes S.A.')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('12345678')).toBeInTheDocument();
    });
  });

  // Test de imágenes
  describe('imágenes', () => {
    it('muestra placeholder cuando no hay imágenes', () => {
      const mockRemito = createMockRemito({ imagenes: [] });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/Imagen del Remito/i)).toBeInTheDocument();
    });

    it('muestra imagen cuando hay URL disponible', () => {
      const mockRemito = createMockRemito({
        imagenes: [{
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
        }],
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      const img = screen.getByRole('img') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toContain('image.jpg');
    });

    it('muestra iframe cuando la imagen es PDF', () => {
      const mockRemito = createMockRemito({
        imagenes: [{
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
        }],
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      const iframe = screen.getByTitle(/Remito PDF/i);
      expect(iframe).toBeInTheDocument();
      expect(screen.getByText(/Abrir PDF en nueva pestaña/i)).toBeInTheDocument();
    });
  });

  // Test de datos extraídos
  describe('datos extraídos por IA', () => {
    it('muestra todos los datos extraídos por IA', () => {
      const mockRemito = createMockRemito({
        numeroRemito: 'REM-2024-001',
        emisorNombre: 'Transportes S.A.',
        clienteNombre: 'Cliente S.A.',
        producto: 'Soja',
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('REM-2024-001')).toBeInTheDocument();
      expect(screen.getByText('Transportes S.A.')).toBeInTheDocument();
      expect(screen.getByText('Cliente S.A.')).toBeInTheDocument();
      expect(screen.getByText('Soja')).toBeInTheDocument();
    });
  });

  // Test de tickets destino
  describe('tickets destino', () => {
    it('muestra pesos destino cuando tieneTicketDestino=true', () => {
      const mockRemito = createMockRemito({
        tieneTicketDestino: true,
        pesoDestinoBruto: 1200,
        pesoDestinoTara: 400,
        pesoDestinoNeto: 800,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('800 kg')).toBeInTheDocument();
    });
  });

  // Test de modal de rechazo
  describe('modal de rechazo', () => {
    it('muestra modal de rechazo al hacer click en Rechazar', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Rechazar'));

      expect(screen.getByText('Rechazar Remito')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Motivo del rechazo (mínimo 5 caracteres)')).toBeInTheDocument();
    });

    it('cierra modal de rechazo al hacer click en Cancelar', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Rechazar'));
      expect(screen.getByText('Rechazar Remito')).toBeInTheDocument();

      const cancelButtons = screen.getAllByText('Cancelar');
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);
      expect(screen.queryByText('Rechazar Remito')).not.toBeInTheDocument();
    });
  });

  // Test de modo edición
  describe('modo edición', () => {
    it('entra en modo edición al hacer click en Editar', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Editar'));

      expect(screen.getByText('Guardar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('(Editando)')).toBeInTheDocument();
    });

    it('sale del modo edición al hacer click en Cancelar', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Editar'));
      expect(screen.getByText('Guardar')).toBeInTheDocument();

      const cancelButtons = screen.getAllByText('Cancelar');
      fireEvent.click(cancelButtons[0]);
      expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
      expect(screen.getByText('Editar')).toBeInTheDocument();
    });

    it('muestra inputs editables en modo edición', () => {
      const mockRemito = createMockRemito({
        numeroRemito: 'TEST-123',
        estado: 'PENDIENTE_APROBACION',
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Editar'));

      const numeroInput = screen.getByDisplayValue('TEST-123') as HTMLInputElement;
      expect(numeroInput).toBeInTheDocument();
      expect(numeroInput.tagName).toBe('INPUT');
    });

    it('muestra botones Recalcular en modo edición', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Editar'));

      const recalcButtons = screen.getAllByText('Recalcular');
      expect(recalcButtons.length).toBeGreaterThanOrEqual(2);
    });
  });

  // Test de fechas
  describe('fechas', () => {
    it('formatea fecha correctamente', () => {
      const mockRemito = createMockRemito({
        fechaOperacion: '2024-01-15T10:30:00.000Z',
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('muestra "-" cuando fecha es null', () => {
      const mockRemito = createMockRemito({
        fechaOperacion: null,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      const fechaElements = screen.getAllByText('-');
      expect(fechaElements.length).toBeGreaterThan(0);
    });
  });

  // Test de validación de motivo de rechazo
  describe('validación de motivo de rechazo', () => {
    it('deshabilita botón Confirmar cuando motivo tiene menos de 5 caracteres', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Rechazar'));

      const input = screen.getByPlaceholderText('Motivo del rechazo (mínimo 5 caracteres)');
      const confirmBtn = screen.getByText('Confirmar Rechazo') as HTMLButtonElement;

      expect(confirmBtn).toBeDisabled();

      fireEvent.change(input, { target: { value: 'abc' } });
      expect(confirmBtn).toBeDisabled();

      fireEvent.change(input, { target: { value: 'motivo válido' } });
      expect(confirmBtn).not.toBeDisabled();
    });
  });

  // Test de secciones de pesos
  describe('secciones de pesos', () => {
    it('muestra sección de pesos de origen y destino', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('Origen')).toBeInTheDocument();
      expect(screen.getByText('Destino')).toBeInTheDocument();
    });

    it('muestra campos Bruto, Tara y Neto para origen', () => {
      const mockRemito = createMockRemito({
        pesoOrigenBruto: 1000,
        pesoOrigenTara: 500,
        pesoOrigenNeto: 500,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('1.000 kg')).toBeInTheDocument();
    });

    it('muestra campos Bruto, Tara y Neto para destino', () => {
      const mockRemito = createMockRemito({
        pesoDestinoBruto: 800,
        pesoDestinoTara: 300,
        pesoDestinoNeto: 500,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('800 kg')).toBeInTheDocument();
    });
  });

  // Test de títulos de secciones
  describe('títulos de secciones', () => {
    it('muestra título de imagen del remito', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/Imagen del Remito/i)).toBeInTheDocument();
    });

    it('muestra título de transporte extraído', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/Transporte \(extraído del remito\)/i)).toBeInTheDocument();
    });

    it('muestra título de pesos', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/Pesos/i)).toBeInTheDocument();
    });
  });

  // Test de datos del chofer
  describe('datos del chofer', () => {
    it('muestra etiqueta Chofer (remito)', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('Chofer (remito)')).toBeInTheDocument();
    });

    it('muestra DNI Chofer', () => {
      const mockRemito = createMockRemito({ choferDni: '12345678' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('12345678')).toBeInTheDocument();
    });
  });

  // Test de patentes
  describe('patentes', () => {
    it('muestra Patente Chasis', () => {
      const mockRemito = createMockRemito({ patenteChasis: 'ABC123' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('muestra Patente Acoplado', () => {
      const mockRemito = createMockRemito({ patenteAcoplado: 'DEF456' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText('DEF456')).toBeInTheDocument();
    });
  });

  // Test de manejo de campos nulos
  describe('campos nulos', () => {
    it('muestra "-" para campos nulos', () => {
      const mockRemito = createMockRemito({
        emisorNombre: null,
        clienteNombre: null,
        producto: null,
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      const dashElements = screen.getAllByText('-');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  // Test de estado en edición
  describe('indicadores de edición', () => {
    it('muestra texto (Editando) en título cuando está en modo edición', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText('(Editando)')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Editar'));

      expect(screen.getByText('(Editando)')).toBeInTheDocument();
    });

    it('oculta botón Editar cuando está en modo edición', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_APROBACION' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      fireEvent.click(screen.getByText('Editar'));

      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    });
  });

  // Test de diferentes estados con canApprove
  describe('comportamiento según estado y permisos', () => {
    it('con estado PENDIENTE_ANALISIS y canApprove=true no muestra botones de aprobación', () => {
      const mockRemito = createMockRemito({ estado: 'PENDIENTE_ANALISIS' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText('Aprobar')).not.toBeInTheDocument();
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument();
    });

    it('con estado EN_ANALISIS y canApprove=true no muestra botones de aprobación', () => {
      const mockRemito = createMockRemito({ estado: 'EN_ANALISIS' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText('Aprobar')).not.toBeInTheDocument();
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument();
    });

    it('con estado ERROR_ANALISIS y canApprove=true no muestra botones de aprobación', () => {
      const mockRemito = createMockRemito({ estado: 'ERROR_ANALISIS' });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={true} />);

      expect(screen.queryByText('Aprobar')).not.toBeInTheDocument();
      expect(screen.queryByText('Rechazar')).not.toBeInTheDocument();
    });
  });

  // Test de múltiples imágenes
  describe('múltiples imágenes', () => {
    it('muestra primera imagen cuando hay múltiples imágenes', () => {
      const mockRemito = createMockRemito({
        imagenes: [
          {
            id: 1,
            remitoId: 1,
            bucketName: 'test',
            objectKey: 'test/first.jpg',
            fileName: 'first.jpg',
            mimeType: 'image/jpeg',
            size: 12345,
            tipo: 'REMITO_PRINCIPAL',
            orden: 0,
            procesadoPorIA: true,
            createdAt: '2024-01-01T00:00:00Z',
            url: 'http://example.com/first.jpg',
          },
          {
            id: 2,
            remitoId: 1,
            bucketName: 'test',
            objectKey: 'test/second.jpg',
            fileName: 'second.jpg',
            mimeType: 'image/jpeg',
            size: 67890,
            tipo: 'REMITO_SECUNDARIO',
            orden: 1,
            procesadoPorIA: false,
            createdAt: '2024-01-01T00:00:00Z',
            url: 'http://example.com/second.jpg',
          },
        ],
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      const img = screen.getByRole('img') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toContain('first.jpg');
    });
  });

  // Test de emojis en títulos
  describe('elementos visuales', () => {
    it('muestra emoji 📄 en título de imagen', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/📄/)).toBeInTheDocument();
    });

    it('muestra emoji 📋 en título de datos', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/📋/)).toBeInTheDocument();
    });

    it('muestra emoji 🚛 en título de transporte', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/🚛/)).toBeInTheDocument();
    });

    it('muestra emoji ⚖️ en título de pesos', () => {
      const mockRemito = createMockRemito();
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/⚖️/)).toBeInTheDocument();
    });
  });

  // Test de info del chofer cargador
  describe('info del chofer cargador', () => {
    it('muestra nota explicativa sobre datos del chofer', () => {
      const mockRemito = createMockRemito({
        choferCargadorDni: '12345678',
        choferCargadorNombre: 'Juan',
        choferCargadorApellido: 'Pérez',
      });
      const onBack = jest.fn();

      render(<RemitoDetail remito={mockRemito} onBack={onBack} canApprove={false} />);

      expect(screen.getByText(/Datos del chofer seleccionado\/registrado al cargar el remito/i)).toBeInTheDocument();
    });
  });
});
