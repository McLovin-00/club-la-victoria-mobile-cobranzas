/**
 * Tests para los componentes de iconos
 * Verifica que los iconos se rendericen correctamente
 */
import { render, screen } from '@testing-library/react';
import {
  ArrowPathIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  ServerIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
} from '../index';

describe('Icon Components', () => {
  describe('ArrowPathIcon', () => {
    it('debe renderizar correctamente', () => {
      render(<ArrowPathIcon data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('debe ser un elemento SVG', () => {
      render(<ArrowPathIcon data-testid="icon" />);
      expect(screen.getByTestId('icon').tagName).toBe('svg');
    });

    it('debe pasar props al SVG', () => {
      render(<ArrowPathIcon data-testid="icon" className="custom-class" />);
      expect(screen.getByTestId('icon')).toHaveClass('custom-class');
    });
  });

  describe('UsersIcon', () => {
    it('debe renderizar correctamente', () => {
      render(<UsersIcon data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('debe ser un elemento SVG', () => {
      render(<UsersIcon data-testid="icon" />);
      expect(screen.getByTestId('icon').tagName).toBe('svg');
    });

    it('debe pasar props al SVG', () => {
      render(<UsersIcon data-testid="icon" className="h-6 w-6" />);
      const icon = screen.getByTestId('icon');
      expect(icon).toHaveClass('h-6');
      expect(icon).toHaveClass('w-6');
    });
  });

  describe('BuildingOfficeIcon', () => {
    it('debe renderizar correctamente', () => {
      render(<BuildingOfficeIcon data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('debe ser un elemento SVG', () => {
      render(<BuildingOfficeIcon data-testid="icon" />);
      expect(screen.getByTestId('icon').tagName).toBe('svg');
    });
  });

  describe('CpuChipIcon', () => {
    it('debe renderizar correctamente', () => {
      render(<CpuChipIcon data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('debe ser un elemento SVG', () => {
      render(<CpuChipIcon data-testid="icon" />);
      expect(screen.getByTestId('icon').tagName).toBe('svg');
    });
  });

  describe('ServerIcon', () => {
    it('debe renderizar correctamente', () => {
      render(<ServerIcon data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('debe ser un elemento SVG', () => {
      render(<ServerIcon data-testid="icon" />);
      expect(screen.getByTestId('icon').tagName).toBe('svg');
    });
  });

  describe('UserIcon', () => {
    it('debe renderizar correctamente', () => {
      render(<UserIcon data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('debe ser un elemento SVG', () => {
      render(<UserIcon data-testid="icon" />);
      expect(screen.getByTestId('icon').tagName).toBe('svg');
    });
  });

  describe('ChatBubbleLeftRightIcon', () => {
    it('debe renderizar correctamente', () => {
      render(<ChatBubbleLeftRightIcon data-testid="icon" />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('debe ser un elemento SVG', () => {
      render(<ChatBubbleLeftRightIcon data-testid="icon" />);
      expect(screen.getByTestId('icon').tagName).toBe('svg');
    });
  });

  describe('Estilos comunes', () => {
    it('todos los iconos deben aceptar className', () => {
      const icons = [
        ArrowPathIcon,
        UsersIcon,
        BuildingOfficeIcon,
        CpuChipIcon,
        ServerIcon,
        UserIcon,
        ChatBubbleLeftRightIcon,
      ];

      icons.forEach((Icon, index) => {
        const { unmount } = render(<Icon data-testid={`icon-${index}`} className="test-class" />);
        expect(screen.getByTestId(`icon-${index}`)).toHaveClass('test-class');
        unmount();
      });
    });

    it('todos los iconos deben aceptar style', () => {
      const icons = [
        ArrowPathIcon,
        UsersIcon,
        BuildingOfficeIcon,
      ];

      icons.forEach((Icon, index) => {
        const { unmount } = render(
          <Icon data-testid={`icon-${index}`} style={{ color: 'red' }} />
        );
        const icon = screen.getByTestId(`icon-${index}`);
        // Verificar que el style attribute contiene color
        const style = icon.getAttribute('style');
        expect(style).toContain('color');
        unmount();
      });
    });
  });
});
