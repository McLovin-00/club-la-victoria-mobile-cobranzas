/**
 * Tests para EstadoGeneral
 * Verifica renderizado del semáforo de cumplimiento
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EstadoGeneral } from '../EstadoGeneral';

describe('EstadoGeneral', () => {
  describe('renderizado básico', () => {
    it('debe mostrar el porcentaje de cumplimiento', () => {
      const stats = {
        cumplimiento: 85,
        vigentes: 17,
        vencidos: 2,
        proximos: 1,
        total: 20,
      };

      render(<EstadoGeneral stats={stats} />);
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Cumplimiento')).toBeInTheDocument();
    });

    it('debe mostrar documentos vigentes del total', () => {
      const stats = {
        cumplimiento: 75,
        vigentes: 15,
        vencidos: 3,
        proximos: 2,
        total: 20,
      };

      render(<EstadoGeneral stats={stats} />);
      expect(screen.getByText('15 de 20 documentos vigentes')).toBeInTheDocument();
    });
  });

  describe('estados de cumplimiento', () => {
    it('debe mostrar estado success cuando cumplimiento >= 90', () => {
      const stats = {
        cumplimiento: 95,
        vigentes: 19,
        vencidos: 0,
        proximos: 1,
        total: 20,
      };

      render(<EstadoGeneral stats={stats} />);
      expect(screen.getByText('✅ Excelente cumplimiento')).toBeInTheDocument();
    });

    it('debe mostrar estado warning cuando cumplimiento >= 70 y < 90', () => {
      const stats = {
        cumplimiento: 75,
        vigentes: 15,
        vencidos: 2,
        proximos: 3,
        total: 20,
      };

      render(<EstadoGeneral stats={stats} />);
      expect(screen.getByText('⚠️ Requiere atención')).toBeInTheDocument();
    });

    it('debe mostrar estado error cuando cumplimiento < 70', () => {
      const stats = {
        cumplimiento: 50,
        vigentes: 10,
        vencidos: 8,
        proximos: 2,
        total: 20,
      };

      render(<EstadoGeneral stats={stats} />);
      expect(screen.getByText('❌ Acción inmediata')).toBeInTheDocument();
    });
  });

  describe('expandir/colapsar', () => {
    const stats = {
      cumplimiento: 80,
      vigentes: 16,
      vencidos: 2,
      proximos: 2,
      total: 20,
    };

    it('debe mostrar "Ver detalles" cuando está colapsado', () => {
      render(<EstadoGeneral stats={stats} />);
      expect(screen.getByText('Ver detalles')).toBeInTheDocument();
    });

    it('debe expandir al hacer clic', () => {
      render(<EstadoGeneral stats={stats} />);
      
      const target = screen.getByText('Cumplimiento');
      fireEvent.mouseDown(target);
      fireEvent.mouseUp(target);
      
      expect(screen.getByText('Ver menos')).toBeInTheDocument();
    });

    it('debe mostrar detalles cuando está expandido', () => {
      render(<EstadoGeneral stats={stats} />);
      
      const target = screen.getByText('Cumplimiento');
      fireEvent.mouseDown(target);
      fireEvent.mouseUp(target);
      
      // Verificar que muestra los contadores detallados
      expect(screen.getByText('Vigentes')).toBeInTheDocument();
      expect(screen.getByText('Próximos')).toBeInTheDocument();
      expect(screen.getByText('Vencidos')).toBeInTheDocument();
    });

    it('debe mostrar valores correctos en detalles', () => {
      render(<EstadoGeneral stats={stats} />);
      
      const target = screen.getByText('Cumplimiento');
      fireEvent.mouseDown(target);
      fireEvent.mouseUp(target);
      
      // Los valores numéricos (en este caso '2' aparece 2 veces: Próximos y Vencidos).
      expect(screen.getByText('16')).toBeInTheDocument(); // vigentes

      const proximosBlock = screen.getByText('Próximos').parentElement as HTMLElement;
      const vencidosBlock = screen.getByText('Vencidos').parentElement as HTMLElement;

      expect(within(proximosBlock).getByText('2')).toBeInTheDocument();
      expect(within(vencidosBlock).getByText('2')).toBeInTheDocument();
    });

    it('debe mostrar botones de acción cuando está expandido', () => {
      render(<EstadoGeneral stats={stats} />);
      
      const target = screen.getByText('Cumplimiento');
      fireEvent.mouseDown(target);
      fireEvent.mouseUp(target);
      
      expect(screen.getByText('📄 Subir Documento')).toBeInTheDocument();
      expect(screen.getByText('📊 Ver Reporte')).toBeInTheDocument();
    });
  });

  describe('valores por defecto', () => {
    it('debe manejar stats undefined', () => {
      render(<EstadoGeneral stats={undefined as never} />);
      
      // Debe renderizar sin errores con valores 0
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 de 0 documentos vigentes')).toBeInTheDocument();
    });

    it('debe manejar stats parciales', () => {
      const statsPartial = {
        cumplimiento: 50,
        vigentes: 5,
      } as never;

      render(<EstadoGeneral stats={statsPartial} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('círculo de progreso', () => {
    it('debe renderizar SVG con círculo de progreso', () => {
      const stats = {
        cumplimiento: 75,
        vigentes: 15,
        vencidos: 3,
        proximos: 2,
        total: 20,
      };

      const { container } = render(<EstadoGeneral stats={stats} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('estilos', () => {
    it('debe aplicar estilos verdes para success', () => {
      const stats = {
        cumplimiento: 95,
        vigentes: 19,
        vencidos: 0,
        proximos: 1,
        total: 20,
      };

      const { container } = render(<EstadoGeneral stats={stats} />);
      
      expect(container.querySelector('.text-green-700')).toBeInTheDocument();
    });

    it('debe aplicar estilos naranjas para warning', () => {
      const stats = {
        cumplimiento: 75,
        vigentes: 15,
        vencidos: 3,
        proximos: 2,
        total: 20,
      };

      const { container } = render(<EstadoGeneral stats={stats} />);
      
      expect(container.querySelector('.text-orange-700')).toBeInTheDocument();
    });

    it('debe aplicar estilos rojos para error', () => {
      const stats = {
        cumplimiento: 40,
        vigentes: 8,
        vencidos: 10,
        proximos: 2,
        total: 20,
      };

      const { container } = render(<EstadoGeneral stats={stats} />);
      
      expect(container.querySelector('.text-red-700')).toBeInTheDocument();
    });
  });

  describe('iconos expandir/colapsar', () => {
    it('debe mostrar ChevronDown cuando está colapsado', () => {
      const stats = {
        cumplimiento: 80,
        vigentes: 16,
        vencidos: 2,
        proximos: 2,
        total: 20,
      };

      const { container } = render(<EstadoGeneral stats={stats} />);
      
      const chevronDown = container.querySelector('.w-4.h-4');
      expect(chevronDown).toBeInTheDocument();
    });
  });
});

