/**
 * Tests para el componente RemitoCard
 * Verifica el renderizado correcto de la tarjeta de remito
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { RemitoCard } from '../RemitoCard';
import { Remito, RemitoEstado } from '../../types';

// Helper para crear un remito mock
const createMockRemito = (overrides: Partial<Remito> = {}): Remito => ({
  id: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  numeroRemito: 'REM-001',
  fechaOperacion: '2024-01-15T00:00:00.000Z',
  emisorNombre: 'Emisor Test',
  emisorDetalle: null,
  clienteNombre: 'Cliente Test',
  producto: 'Producto Test',
  transportistaNombre: 'Transportista Test',
  choferNombre: 'Juan Pérez',
  choferDni: '12345678',
  patenteChasis: 'ABC123',
  patenteAcoplado: 'DEF456',
  pesoOrigenBruto: 1500,
  pesoOrigenTara: 500,
  pesoOrigenNeto: 1000,
  pesoDestinoBruto: null,
  pesoDestinoTara: null,
  pesoDestinoNeto: null,
  tieneTicketDestino: false,
  equipoId: 1,
  choferId: 1,
  dadorCargaId: 1,
  tenantEmpresaId: 1,
  choferCargadorDni: null,
  choferCargadorNombre: null,
  choferCargadorApellido: null,
  estado: 'PENDIENTE_APROBACION',
  cargadoPorUserId: 1,
  cargadoPorRol: 'admin',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  rechazadoPorUserId: null,
  rechazadoAt: null,
  motivoRechazo: null,
  confianzaIA: 85,
  camposDetectados: [],
  erroresAnalisis: [],
  analizadoAt: null,
  imagenes: [],
  ...overrides,
});

describe('RemitoCard', () => {
  describe('renderizado básico', () => {
    it('debe renderizar el número de remito', () => {
      const remito = createMockRemito({ numeroRemito: 'REM-12345' });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText('REM-12345')).toBeInTheDocument();
    });

    it('debe mostrar el ID si no hay número de remito', () => {
      const remito = createMockRemito({ numeroRemito: null, id: 999 });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText('#999')).toBeInTheDocument();
    });

    it('debe renderizar la fecha de operación formateada', () => {
      const remito = createMockRemito({ fechaOperacion: '2024-03-15T00:00:00.000Z' });
      render(<RemitoCard remito={remito} />);

      // Usamos el mismo formateo que el componente para evitar flakiness por timezone/locale del runner.
      const expected = new Date('2024-03-15T00:00:00.000Z').toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it('debe mostrar guión si no hay fecha de operación', () => {
      const remito = createMockRemito({ fechaOperacion: null });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('información del transportista', () => {
    it('debe mostrar el nombre del transportista', () => {
      const remito = createMockRemito({ transportistaNombre: 'Mi Transportista' });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText('Mi Transportista')).toBeInTheDocument();
    });

    it('no debe mostrar transportista si no hay nombre', () => {
      const remito = createMockRemito({ transportistaNombre: null });
      render(<RemitoCard remito={remito} />);

      expect(screen.queryByText(/transportista/i)).not.toBeInTheDocument();
    });
  });

  describe('información del chofer', () => {
    it('debe mostrar el nombre del chofer', () => {
      const remito = createMockRemito({ choferNombre: 'Carlos García' });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText('Carlos García')).toBeInTheDocument();
    });

    it('no debe mostrar chofer si no hay nombre', () => {
      const remito = createMockRemito({ choferNombre: null });
      render(<RemitoCard remito={remito} />);

      expect(screen.queryByText('Carlos García')).not.toBeInTheDocument();
    });
  });

  describe('peso', () => {
    it('debe mostrar el peso neto formateado', () => {
      const remito = createMockRemito({ pesoOrigenNeto: 2500 });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText('2.500 kg')).toBeInTheDocument();
    });

    it('no debe mostrar peso si es null', () => {
      const remito = createMockRemito({ pesoOrigenNeto: null });
      render(<RemitoCard remito={remito} />);

      // No debe haber ningún texto con "kg" excepto si hay peso
      const elements = screen.queryAllByText(/kg$/);
      expect(elements).toHaveLength(0);
    });
  });

  describe('patentes', () => {
    it('debe mostrar la patente del chasis', () => {
      const remito = createMockRemito({ patenteChasis: 'XYZ789', patenteAcoplado: null });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText(/XYZ789/)).toBeInTheDocument();
    });

    it('debe mostrar la patente del acoplado', () => {
      const remito = createMockRemito({ patenteChasis: null, patenteAcoplado: 'QRS456' });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText(/QRS456/)).toBeInTheDocument();
    });

    it('debe mostrar ambas patentes', () => {
      const remito = createMockRemito({ patenteChasis: 'ABC123', patenteAcoplado: 'DEF456' });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText(/ABC123/)).toBeInTheDocument();
      expect(screen.getByText(/DEF456/)).toBeInTheDocument();
    });

    it('no debe mostrar sección de patentes si no hay ninguna', () => {
      const remito = createMockRemito({ patenteChasis: null, patenteAcoplado: null });
      render(<RemitoCard remito={remito} />);

      // No debe haber emojis de camiones
      expect(screen.queryByText(/🚛/)).not.toBeInTheDocument();
      expect(screen.queryByText(/🚚/)).not.toBeInTheDocument();
    });
  });

  describe('estados', () => {
    const estados: { estado: RemitoEstado; label: string }[] = [
      { estado: 'PENDIENTE_ANALISIS', label: 'Pendiente de Análisis' },
      { estado: 'EN_ANALISIS', label: 'En Análisis' },
      { estado: 'PENDIENTE_APROBACION', label: 'Pendiente Aprobación' },
      { estado: 'APROBADO', label: 'Aprobado' },
      { estado: 'RECHAZADO', label: 'Rechazado' },
      { estado: 'ERROR_ANALISIS', label: 'Error en Análisis' },
    ];

    estados.forEach(({ estado, label }) => {
      it(`debe mostrar el estado ${estado} correctamente`, () => {
        const remito = createMockRemito({ estado });
        render(<RemitoCard remito={remito} />);

        // Puede haber dos etiquetas (mobile y desktop)
        const labels = screen.getAllByText(label);
        expect(labels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('confianza IA', () => {
    it('debe mostrar el porcentaje de confianza', () => {
      const remito = createMockRemito({ confianzaIA: 75 });
      render(<RemitoCard remito={remito} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('debe mostrar barra verde para confianza >= 80', () => {
      const remito = createMockRemito({ confianzaIA: 85 });
      const { container } = render(<RemitoCard remito={remito} />);

      const progressBar = container.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('debe mostrar barra amarilla para confianza >= 50 y < 80', () => {
      const remito = createMockRemito({ confianzaIA: 65 });
      const { container } = render(<RemitoCard remito={remito} />);

      const progressBar = container.querySelector('.bg-yellow-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('debe mostrar barra roja para confianza < 50', () => {
      const remito = createMockRemito({ confianzaIA: 30 });
      const { container } = render(<RemitoCard remito={remito} />);

      const progressBar = container.querySelector('.bg-red-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('no debe mostrar confianza si es null', () => {
      const remito = createMockRemito({ confianzaIA: null });
      render(<RemitoCard remito={remito} />);

      expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    });
  });

  describe('interacción', () => {
    it('debe llamar onClick al hacer click', () => {
      const handleClick = jest.fn();
      const remito = createMockRemito();
      render(<RemitoCard remito={remito} onClick={handleClick} />);

      const card = screen.getByText('REM-001').closest('div[class*="rounded-lg"]');
      fireEvent.click(card!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('no debe fallar si no hay onClick', () => {
      const remito = createMockRemito();
      const { container } = render(<RemitoCard remito={remito} />);

      const card = container.querySelector('.rounded-lg');
      expect(() => fireEvent.click(card!)).not.toThrow();
    });
  });

  describe('estilos', () => {
    it('debe tener clase cursor-pointer', () => {
      const remito = createMockRemito();
      const { container } = render(<RemitoCard remito={remito} />);

      const card = container.querySelector('.rounded-lg');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('debe tener estilos de hover', () => {
      const remito = createMockRemito();
      const { container } = render(<RemitoCard remito={remito} />);

      const card = container.querySelector('.rounded-lg');
      expect(card).toHaveClass('hover:shadow-md');
    });

    it('debe soportar dark mode', () => {
      const remito = createMockRemito();
      const { container } = render(<RemitoCard remito={remito} />);

      const card = container.querySelector('.rounded-lg');
      expect(card).toHaveClass('dark:bg-slate-900');
    });
  });

  describe('ancho de barra de progreso', () => {
    it('debe aplicar el ancho correcto a la barra de confianza', () => {
      const remito = createMockRemito({ confianzaIA: 42 });
      const { container } = render(<RemitoCard remito={remito} />);

      const progressBar = container.querySelector('.bg-red-500'); // < 50 es rojo
      expect(progressBar).toHaveStyle({ width: '42%' });
    });
  });
});

