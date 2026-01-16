/**
 * Tests para AccionesRapidas
 * Verifica renderizado de acciones rápidas del transportista
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { AccionesRapidas } from '../AccionesRapidas';

describe('AccionesRapidas', () => {
  describe('renderizado', () => {
    it('debe renderizar el título', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('Acciones Rápidas')).toBeInTheDocument();
    });

    it('debe renderizar las acciones rápidas', () => {
      render(<AccionesRapidas />);
      
      expect(screen.getByText('Registrar Equipo')).toBeInTheDocument();
      expect(screen.getByText('Calendario')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
    });

    it('debe renderizar el tip del día', () => {
      render(<AccionesRapidas />);
      
      expect(screen.getByText('Tip del día')).toBeInTheDocument();
      expect(screen.getByText(/Usa el botón flotante/)).toBeInTheDocument();
    });

    it('debe renderizar el FAB', () => {
      render(<AccionesRapidas />);
      const fabContainer = document.querySelector('.fixed.z-50');
      expect(fabContainer).toBeInTheDocument();
    });
  });

  describe('estructura', () => {
    it('debe tener 3 acciones rápidas', () => {
      render(<AccionesRapidas />);
      
      const actions = ['Registrar Equipo', 'Calendario', 'Configuración'];
      actions.forEach(action => {
        expect(screen.getByText(action)).toBeInTheDocument();
      });
    });

    it('debe tener grid de 3 columnas para acciones', () => {
      const { container } = render(<AccionesRapidas />);
      
      const grid = container.querySelector('.grid-cols-3');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('interacción', () => {
    it('debe llamar a logger al hacer clic en acción', async () => {
      const loggerModule = await import('../../../utils/logger');
      
      render(<AccionesRapidas />);
      
      const spy = jest.spyOn(loggerModule.logger, 'debug').mockImplementation(() => {});

      const target = screen.getByText('Registrar Equipo');
      fireEvent.mouseDown(target);
      fireEvent.mouseUp(target);
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('estilos', () => {
    it('debe tener estilos de tarjeta para cada acción', () => {
      const { container } = render(<AccionesRapidas />);
      
      const cards = container.querySelectorAll('.bg-white.rounded-xl.shadow-md');
      expect(cards.length).toBe(3);
    });

    it('debe tener iconos coloreados', () => {
      const { container } = render(<AccionesRapidas />);
      
      // Verificar que hay elementos con colores de fondo
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
      expect(container.querySelector('.bg-purple-500')).toBeInTheDocument();
      expect(container.querySelector('.bg-gray-500')).toBeInTheDocument();
    });
  });

  describe('tip del día', () => {
    it('debe tener estilo de caja azul', () => {
      const { container } = render(<AccionesRapidas />);
      
      const tipBox = container.querySelector('.bg-blue-50.border-blue-200');
      expect(tipBox).toBeInTheDocument();
    });

    it('debe contener emoji de bombilla', () => {
      render(<AccionesRapidas />);
      expect(screen.getByText('💡')).toBeInTheDocument();
    });
  });
});

