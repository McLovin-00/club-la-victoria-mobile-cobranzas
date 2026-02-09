/**
 * Tests para los componentes Select de Radix UI (select-advanced.tsx)
 * Verifica renderizado, estilos y props de los componentes Select avanzados
 * 
 * NOTA: Los tests de interacción están limitados debido a incompatibilidades
 * entre Radix UI Select y jsdom (hasPointerCapture, portales, etc.)
 */
import { render, screen } from '@testing-library/react';
import {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from '../select-advanced';

describe('SelectAdvanced Components', () => {
  describe('Select (Root)', () => {
    it('debe renderizar el componente Select correctamente', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('debe mostrar el placeholder cuando no hay valor seleccionado', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione una opción" />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByText('Seleccione una opción')).toBeInTheDocument();
    });

    it('debe soportar valor controlado', () => {
      render(
        <Select value="2">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Opción 1</SelectItem>
            <SelectItem value="2">Opción 2</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Opción 2')).toBeInTheDocument();
    });

    it('debe aceptar onValueChange callback', () => {
      const handleChange = jest.fn();

      render(
        <Select onValueChange={handleChange}>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Seleccione" />
          </SelectTrigger>
        </Select>
      );

      // Verificar que el componente se renderiza correctamente con el callback
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('debe soportar defaultValue', () => {
      render(
        <Select defaultValue="preset">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="preset">Valor Preestablecido</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Valor Preestablecido')).toBeInTheDocument();
    });
  });

  describe('SelectTrigger', () => {
    it('debe aplicar clases base correctamente', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveClass('flex');
      expect(trigger).toHaveClass('items-center');
      expect(trigger).toHaveClass('rounded-md');
    });

    it('debe aplicar className adicional', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger" className="custom-trigger-class">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger-class');
    });

    it('debe soportar estado disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toBeDisabled();
    });

    it('debe renderizar icono ChevronDown', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      const svg = trigger.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('debe renderizar children correctamente', () => {
      render(
        <Select>
          <SelectTrigger>
            <span data-testid="custom-child">Contenido personalizado</span>
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('custom-child')).toBeInTheDocument();
    });

    it('debe tener role combobox', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('role', 'combobox');
    });

    it('debe tener aria-expanded false cuando está cerrado', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('SelectValue', () => {
    it('debe mostrar placeholder cuando no hay valor', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Elige una opción" />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByText('Elige una opción')).toBeInTheDocument();
    });

    it('debe mostrar el valor seleccionado', () => {
      render(
        <Select value="opcion1">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opcion1">Primera Opción</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Primera Opción')).toBeInTheDocument();
    });

    it('debe mostrar placeholder largo', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Por favor seleccione una de las opciones disponibles en la lista" />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByText('Por favor seleccione una de las opciones disponibles en la lista')).toBeInTheDocument();
    });
  });

  describe('Props HTML', () => {
    it('SelectTrigger debe pasar props HTML adicionales', () => {
      render(
        <Select>
          <SelectTrigger 
            data-testid="trigger" 
            id="my-select"
            aria-label="Selector de opciones"
          >
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('id', 'my-select');
      expect(trigger).toHaveAttribute('aria-label', 'Selector de opciones');
    });

    it('debe soportar data-* attributes', () => {
      render(
        <Select>
          <SelectTrigger 
            data-testid="trigger" 
            data-custom="valor-custom"
          >
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveAttribute('data-custom', 'valor-custom');
    });
  });

  describe('Casos borde', () => {
    it('debe manejar lista vacía de items', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Sin opciones" />
          </SelectTrigger>
          <SelectContent>
            {/* Sin items */}
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Sin opciones')).toBeInTheDocument();
    });

    it('debe manejar cambio de valor programático', () => {
      const { rerender } = render(
        <Select value="1">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Opción 1</SelectItem>
            <SelectItem value="2">Opción 2</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Opción 1')).toBeInTheDocument();

      rerender(
        <Select value="2">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Opción 1</SelectItem>
            <SelectItem value="2">Opción 2</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Opción 2')).toBeInTheDocument();
    });

    it('debe manejar items con valores numéricos como strings', () => {
      render(
        <Select value="123">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="123">Número 123</SelectItem>
            <SelectItem value="456">Número 456</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Número 123')).toBeInTheDocument();
    });

    it('debe manejar rerender sin valor', () => {
      const { rerender } = render(
        <Select value="1">
          <SelectTrigger>
            <SelectValue placeholder="Placeholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Opción 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByText('Opción 1')).toBeInTheDocument();

      rerender(
        <Select value="">
          <SelectTrigger>
            <SelectValue placeholder="Placeholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Opción 1</SelectItem>
          </SelectContent>
        </Select>
      );

      // Cuando el valor está vacío debería mostrar placeholder
      expect(screen.getByText('Placeholder')).toBeInTheDocument();
    });
  });

  describe('Exportaciones', () => {
    it('debe exportar todos los componentes necesarios', () => {
      expect(Select).toBeDefined();
      expect(SelectGroup).toBeDefined();
      expect(SelectValue).toBeDefined();
      expect(SelectTrigger).toBeDefined();
      expect(SelectContent).toBeDefined();
      expect(SelectLabel).toBeDefined();
      expect(SelectItem).toBeDefined();
      expect(SelectSeparator).toBeDefined();
    });
  });

  describe('Estilos del Trigger', () => {
    it('debe tener altura h-10', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('h-10');
    });

    it('debe tener ancho w-full', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('w-full');
    });

    it('debe tener estilos de borde', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('border');
      expect(screen.getByTestId('trigger')).toHaveClass('border-input');
    });

    it('debe tener estilos de fondo', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('bg-background');
    });

    it('debe tener estilos de focus', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger.className).toContain('focus:outline-none');
      expect(trigger.className).toContain('focus:ring-2');
    });

    it('debe tener estilos de disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger.className).toContain('disabled:cursor-not-allowed');
      expect(trigger.className).toContain('disabled:opacity-50');
    });
  });
});
