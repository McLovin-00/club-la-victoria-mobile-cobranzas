/**
 * Tests para AlertasUrgentes
 * Verifica renderizado de alertas urgentes del transportista
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertasUrgentes } from '../AlertasUrgentes';

describe('AlertasUrgentes', () => {
  const mockAlertas = [
    {
      id: '1',
      equipoId: 101,
      documentoTipo: 'Licencia de Conducir',
      diasVencimiento: 5,
      prioridad: 'alta' as const,
      mensaje: 'El documento vence pronto',
    },
    {
      id: '2',
      equipoId: 102,
      documentoTipo: 'Seguro',
      diasVencimiento: 15,
      prioridad: 'media' as const,
      mensaje: 'Renovar seguro',
    },
    {
      id: '3',
      equipoId: 103,
      documentoTipo: 'VTV',
      diasVencimiento: 30,
      prioridad: 'baja' as const,
      mensaje: 'VTV próximo a vencer',
    },
  ];

  describe('sin alertas', () => {
    it('debe mostrar mensaje de todo al día cuando no hay alertas', () => {
      render(<AlertasUrgentes alertas={[]} />);
      
      expect(screen.getByText('¡Todo al día!')).toBeInTheDocument();
      expect(screen.getByText('No tienes alertas urgentes por el momento')).toBeInTheDocument();
    });

    it('debe mostrar icono de check', () => {
      render(<AlertasUrgentes alertas={[]} />);
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  describe('con alertas', () => {
    it('debe mostrar el título', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      expect(screen.getByText('Alertas Urgentes')).toBeInTheDocument();
    });

    it('debe mostrar el conteo de alertas', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/3 documentos requieren atención/)).toBeInTheDocument();
    });

    it('debe mostrar tipos de documento', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      
      expect(screen.getByText('Licencia de Conducir')).toBeInTheDocument();
      expect(screen.getByText('Seguro')).toBeInTheDocument();
      expect(screen.getByText('VTV')).toBeInTheDocument();
    });

    it('debe mostrar días de vencimiento', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      
      expect(screen.getByText('5d')).toBeInTheDocument();
      expect(screen.getByText('15d')).toBeInTheDocument();
      expect(screen.getByText('30d')).toBeInTheDocument();
    });

    it('debe mostrar mensajes de alerta', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      
      expect(screen.getByText('El documento vence pronto')).toBeInTheDocument();
      expect(screen.getByText('Renovar seguro')).toBeInTheDocument();
    });

    it('debe mostrar ID de equipo', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      
      expect(screen.getByText('Equipo #101')).toBeInTheDocument();
      expect(screen.getByText('Equipo #102')).toBeInTheDocument();
    });
  });

  describe('documento vencido', () => {
    it('debe mostrar VENCIDO cuando diasVencimiento <= 0', () => {
      const alertasVencidas = [
        {
          id: '1',
          equipoId: 101,
          documentoTipo: 'Licencia',
          diasVencimiento: 0,
          prioridad: 'alta' as const,
          mensaje: 'Documento vencido',
        },
      ];

      render(<AlertasUrgentes alertas={alertasVencidas} />);
      expect(screen.getByText('VENCIDO')).toBeInTheDocument();
    });
  });

  describe('expandir/colapsar', () => {
    it('debe mostrar solo 3 alertas inicialmente cuando hay más', () => {
      const muchasAlertas = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        equipoId: 100 + i,
        documentoTipo: `Documento ${i}`,
        diasVencimiento: i + 1,
        prioridad: 'media' as const,
        mensaje: `Mensaje ${i}`,
      }));

      render(<AlertasUrgentes alertas={muchasAlertas} />);
      
      // Debe mostrar "Ver 2 más" porque hay 5 alertas y se muestran 3
      expect(screen.getByText('Ver 2 más')).toBeInTheDocument();
    });

    it('debe expandir al hacer clic', () => {
      const muchasAlertas = Array.from({ length: 5 }, (_, i) => ({
        id: `${i}`,
        equipoId: 100 + i,
        documentoTipo: `Documento ${i}`,
        diasVencimiento: i + 1,
        prioridad: 'media' as const,
        mensaje: `Mensaje ${i}`,
      }));

      render(<AlertasUrgentes alertas={muchasAlertas} />);
      
      // Hacer clic sobre el texto del header para expandir (evento burbujea hasta TouchFeedback)
      const header = screen.getByText('Alertas Urgentes');
      fireEvent.mouseDown(header);
      fireEvent.mouseUp(header);
      
      // Ahora debe mostrar "Ver menos"
      expect(screen.getByText('Ver menos')).toBeInTheDocument();
    });
  });

  describe('botones de acción', () => {
    it('debe mostrar botón Subir', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      
      const subirButtons = screen.getAllByText('Subir');
      expect(subirButtons.length).toBeGreaterThan(0);
    });

    it('debe mostrar botón Recordar', () => {
      render(<AlertasUrgentes alertas={mockAlertas} />);
      
      const recordarButtons = screen.getAllByText('Recordar');
      expect(recordarButtons.length).toBeGreaterThan(0);
    });
  });

  describe('ordenamiento por prioridad', () => {
    it('debe ordenar alertas por prioridad y días', () => {
      const alertasDesordenadas = [
        { id: '1', equipoId: 1, documentoTipo: 'Baja', diasVencimiento: 5, prioridad: 'baja' as const, mensaje: '' },
        { id: '2', equipoId: 2, documentoTipo: 'Alta', diasVencimiento: 10, prioridad: 'alta' as const, mensaje: '' },
        { id: '3', equipoId: 3, documentoTipo: 'Media', diasVencimiento: 3, prioridad: 'media' as const, mensaje: '' },
      ];

      render(<AlertasUrgentes alertas={alertasDesordenadas} />);
      
      // La primera alerta debe ser la de prioridad alta
      const documentoTipos = screen.getAllByText(/Alta|Media|Baja/);
      expect(documentoTipos[0]).toHaveTextContent('Alta');
    });
  });

  describe('estilos por prioridad', () => {
    it('debe aplicar estilos de prioridad alta', () => {
      const alertaAlta = [{
        id: '1',
        equipoId: 1,
        documentoTipo: 'Doc Alta',
        diasVencimiento: 1,
        prioridad: 'alta' as const,
        mensaje: 'Urgente',
      }];

      const { container } = render(<AlertasUrgentes alertas={alertaAlta} />);
      
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
      expect(container.querySelector('.border-red-200')).toBeInTheDocument();
    });

    it('debe aplicar estilos de prioridad media', () => {
      const alertaMedia = [{
        id: '1',
        equipoId: 1,
        documentoTipo: 'Doc Media',
        diasVencimiento: 10,
        prioridad: 'media' as const,
        mensaje: 'Atención',
      }];

      const { container } = render(<AlertasUrgentes alertas={alertaMedia} />);
      
      expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
    });
  });

  describe('singular/plural', () => {
    it('debe usar singular para una alerta', () => {
      const unaAlerta = [{
        id: '1',
        equipoId: 1,
        documentoTipo: 'Doc',
        diasVencimiento: 5,
        prioridad: 'alta' as const,
        mensaje: 'Test',
      }];

      render(<AlertasUrgentes alertas={unaAlerta} />);
      expect(screen.getByText(/1 documento requiere atención/)).toBeInTheDocument();
    });
  });
});

