/**
 * Tests extendidos para el componente FloatingActionButton
 * Verifica renderizado, posiciones, tamaños y acciones
 */
import { describe, it, expect, beforeEach, jest, beforeAll } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('FloatingActionButton', () => {
  let FloatingActionButton: React.FC<{
    actions?: any[];
    className?: string;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    size?: 'normal' | 'large';
  }>;

  beforeAll(async () => {
    await jest.unstable_mockModule('../TouchFeedback', () => ({
      TouchFeedback: ({ children, onPress }: any) => (
        <div onClick={onPress}>{children}</div>
      ),
    }));

    await jest.unstable_mockModule('../../../utils/logger', () => ({
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      },
    }));

    ({ FloatingActionButton } = await import('../FloatingActionButton'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renderizado básico', () => {
    it('debe renderizar el FAB principal', () => {
      render(<FloatingActionButton />);
      // El FAB tiene un icono de Plus
      const fabContainer = document.querySelector('.fixed.z-50');
      expect(fabContainer).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      render(<FloatingActionButton className="custom-fab" />);
      const fabContainer = document.querySelector('.fixed.z-50.custom-fab');
      expect(fabContainer).toBeInTheDocument();
    });
  });

  describe('posiciones', () => {
    it('debe aplicar posición bottom-right por defecto', () => {
      render(<FloatingActionButton />);
      const fabContainer = document.querySelector('.fixed.z-50');
      expect(fabContainer).toHaveClass('bottom-6');
      expect(fabContainer).toHaveClass('right-6');
    });

    it('debe aplicar posición bottom-left', () => {
      render(<FloatingActionButton position="bottom-left" />);
      const fabContainer = document.querySelector('.fixed.z-50');
      expect(fabContainer).toHaveClass('bottom-6');
      expect(fabContainer).toHaveClass('left-6');
    });

    it('debe aplicar posición bottom-center', () => {
      render(<FloatingActionButton position="bottom-center" />);
      const fabContainer = document.querySelector('.fixed.z-50');
      expect(fabContainer).toHaveClass('bottom-6');
      expect(fabContainer).toHaveClass('left-1/2');
    });
  });

  describe('tamaños', () => {
    it('debe aplicar tamaño normal por defecto', () => {
      render(<FloatingActionButton />);
      const mainButton = document.querySelector('.rounded-full.bg-gradient-to-r');
      expect(mainButton).toHaveClass('w-14');
      expect(mainButton).toHaveClass('h-14');
    });

    it('debe aplicar tamaño large', () => {
      render(<FloatingActionButton size="large" />);
      const mainButton = document.querySelector('.rounded-full.bg-gradient-to-r');
      expect(mainButton).toHaveClass('w-16');
      expect(mainButton).toHaveClass('h-16');
    });
  });

  describe('expansión y acciones', () => {
    const mockActions = [
      {
        id: 'action1',
        icon: () => <span>Icon1</span>,
        label: 'Acción 1',
        color: 'bg-green-500',
        onClick: jest.fn(),
      },
      {
        id: 'action2',
        icon: () => <span>Icon2</span>,
        label: 'Acción 2',
        color: 'bg-blue-500',
        onClick: jest.fn(),
      },
    ];

    it('debe expandir al hacer clic en el FAB principal', () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      // Hacer clic en el FAB principal
      const mainFab = document.querySelector('.rounded-full.bg-gradient-to-r');
      fireEvent.click(mainFab!.parentElement!);
      
      // Las acciones deben ser visibles
      expect(screen.getByText('Acción 1')).toBeInTheDocument();
      expect(screen.getByText('Acción 2')).toBeInTheDocument();
    });

    it('debe mostrar backdrop cuando está expandido', () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      const mainFab = document.querySelector('.rounded-full.bg-gradient-to-r');
      fireEvent.click(mainFab!.parentElement!);
      
      // Debe haber un backdrop
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/20');
      expect(backdrop).toBeInTheDocument();
    });

    it('debe colapsar al hacer clic en el backdrop', () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      // Expandir
      const mainFab = document.querySelector('.rounded-full.bg-gradient-to-r');
      fireEvent.click(mainFab!.parentElement!);
      
      expect(screen.getByText('Acción 1')).toBeInTheDocument();
      
      // Colapsar haciendo clic en el backdrop
      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/20');
      fireEvent.click(backdrop!);
      
      expect(screen.queryByText('Acción 1')).not.toBeInTheDocument();
    });

    it('debe llamar onClick de la acción y colapsar', () => {
      const mockOnClick = jest.fn();
      const actions = [
        {
          id: 'test',
          icon: () => <span>TestIcon</span>,
          label: 'Test Action',
          onClick: mockOnClick,
        },
      ];

      render(<FloatingActionButton actions={actions} />);
      
      // Expandir
      const mainFab = document.querySelector('.rounded-full.bg-gradient-to-r');
      fireEvent.click(mainFab!.parentElement!);
      
      // Hacer clic en la acción
      const actionButton = screen.getByText('TestIcon').closest('div[class*="rounded-full"]');
      fireEvent.click(actionButton!.parentElement!);
      
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('debe cambiar icono a X cuando está expandido', () => {
      render(<FloatingActionButton actions={mockActions} />);
      
      // Expandir
      const mainFab = document.querySelector('.rounded-full.bg-gradient-to-r');
      fireEvent.click(mainFab!.parentElement!);
      
      // Debe mostrar icono X (XMarkIcon)
      const svgs = mainFab!.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('acciones por defecto', () => {
    it('debe usar acciones por defecto si no se proporcionan', () => {
      render(<FloatingActionButton />);
      
      // Expandir
      const mainFab = document.querySelector('.rounded-full.bg-gradient-to-r');
      fireEvent.click(mainFab!.parentElement!);
      
      // Las acciones por defecto son "Tomar Foto" y "Subir Archivo"
      expect(screen.getByText('Tomar Foto')).toBeInTheDocument();
      expect(screen.getByText('Subir Archivo')).toBeInTheDocument();
    });
  });
});

