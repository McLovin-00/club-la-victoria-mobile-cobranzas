/**
 * Tests extendidos para los componentes Dialog de Radix UI
 * Verifica renderizado, interacción y estilos de todos los componentes Dialog
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../dialog';

// Mock de Radix UI Portal
jest.mock('@radix-ui/react-dialog', () => {
  const actual = jest.requireActual('@radix-ui/react-dialog');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>,
  };
});

describe('Dialog Components', () => {
  describe('Dialog (Root)', () => {
    it('debe renderizar correctamente', () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        </Dialog>
      );

      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('debe controlar el estado open', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Contenido</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Título')).toBeInTheDocument();
    });

    it('debe llamar onOpenChange cuando cambia el estado', async () => {
      const handleOpenChange = jest.fn();
      const user = userEvent.setup();

      render(
        <Dialog onOpenChange={handleOpenChange}>
          <DialogTrigger data-testid="trigger">Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Contenido</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByTestId('trigger'));

      expect(handleOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('DialogTrigger', () => {
    it('debe renderizar como botón por defecto', () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Click me</DialogTrigger>
        </Dialog>
      );

      expect(screen.getByTestId('trigger')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('debe abrir el dialog al hacer clic', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      });
    });

    it('debe soportar asChild', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger asChild>
            <button data-testid="custom-button">Custom Button</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByTestId('custom-button'));

      await waitFor(() => {
        expect(screen.getByText('Título')).toBeInTheDocument();
      });
    });
  });

  describe('DialogContent', () => {
    it('debe renderizar el contenido', () => {
      render(
        <Dialog open>
          <DialogContent data-testid="content">
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Contenido del dialog</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Contenido del dialog')).toBeInTheDocument();
    });

    it('debe aplicar clases de estilo', () => {
      render(
        <Dialog open>
          <DialogContent data-testid="content">
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveClass('fixed');
      expect(content).toHaveClass('z-50');
    });

    it('debe aplicar className adicional', () => {
      render(
        <Dialog open>
          <DialogContent className="custom-dialog" data-testid="content">
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('content')).toHaveClass('custom-dialog');
    });

    it('debe incluir botón de cerrar', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('debe tener icono X en el botón de cerrar', () => {
      render(
        <Dialog open>
          <DialogContent data-testid="content">
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const closeButton = screen.getByText('Close').parentElement;
      const svg = closeButton?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    it('debe renderizar correctamente', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader data-testid="header">
              <DialogTitle>Título</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('debe aplicar clases de flexbox', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader data-testid="header">
              <DialogTitle>Título</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
    });

    it('debe aplicar className adicional', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader className="custom-header" data-testid="header">
              <DialogTitle>Título</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('DialogFooter', () => {
    it('debe renderizar correctamente', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
            <DialogFooter data-testid="footer">
              <button>Cancelar</button>
              <button>Guardar</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('debe aplicar clases de layout responsive', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
            <DialogFooter data-testid="footer">
              <button>Acción</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('flex-col-reverse');
      expect(footer).toHaveClass('sm:flex-row');
      expect(footer).toHaveClass('sm:justify-end');
    });

    it('debe aplicar className adicional', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
            <DialogFooter className="custom-footer" data-testid="footer">
              <button>Acción</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });

  describe('DialogTitle', () => {
    it('debe renderizar el título', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Mi título personalizado</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Mi título personalizado')).toBeInTheDocument();
    });

    it('debe aplicar clases de tipografía', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle data-testid="title">Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
    });

    it('debe aplicar className adicional', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle className="custom-title" data-testid="title">
              Título
            </DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('DialogDescription', () => {
    it('debe renderizar la descripción', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>
              Esta es la descripción del diálogo
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Esta es la descripción del diálogo')).toBeInTheDocument();
    });

    it('debe aplicar clases de texto', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription data-testid="desc">Descripción</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
      expect(desc).toHaveClass('text-muted-foreground');
    });

    it('debe aplicar className adicional', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription className="custom-desc" data-testid="desc">
              Descripción
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });

  describe('DialogClose', () => {
    it('debe cerrar el dialog al hacer clic', async () => {
      const handleOpenChange = jest.fn();
      const user = userEvent.setup();

      render(
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
            <DialogClose data-testid="close">Cerrar</DialogClose>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByTestId('close'));

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it('debe soportar asChild', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
            <DialogClose asChild>
              <button data-testid="custom-close">Custom Close</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('custom-close')).toBeInTheDocument();
    });
  });

  describe('DialogOverlay', () => {
    it('debe renderizar overlay cuando el dialog está abierto', () => {
      // El overlay se renderiza dentro del DialogContent
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      // El overlay tiene la clase fixed inset-0
      const overlay = document.querySelector('.fixed.inset-0.bg-black\\/80');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Dialog completo', () => {
    it('debe renderizar estructura completa', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar acción</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea continuar?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button>Cancelar</button>
              <button>Confirmar</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
      expect(screen.getByText('¿Está seguro que desea continuar?')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
      expect(screen.getByText('Confirmar')).toBeInTheDocument();
    });

    it('debe abrir y cerrar correctamente', async () => {
      const user = userEvent.setup();

      const ControlledDialog = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger data-testid="trigger">Open</DialogTrigger>
            <DialogContent>
              <DialogTitle>Título</DialogTitle>
              <DialogDescription>Contenido</DialogDescription>
              <DialogClose data-testid="close-btn">Cerrar</DialogClose>
            </DialogContent>
          </Dialog>
        );
      };

      render(<ControlledDialog />);

      // Abrir
      await user.click(screen.getByTestId('trigger'));

      await waitFor(() => {
        expect(screen.getByText('Título')).toBeInTheDocument();
      });

      // Cerrar
      await user.click(screen.getByTestId('close-btn'));

      await waitFor(() => {
        expect(screen.queryByText('Título')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accesibilidad', () => {
    it('debe tener role dialog', () => {
      render(
        <Dialog open>
          <DialogContent data-testid="content">
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('DialogClose debe tener texto accesible', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      // El botón de cerrar tiene sr-only con texto "Close"
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('props HTML', () => {
    it('DialogContent debe pasar props adicionales', () => {
      render(
        <Dialog open>
          <DialogContent 
            data-testid="content" 
            id="my-dialog"
            aria-labelledby="dialog-title"
          >
            <DialogTitle id="dialog-title">Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('id', 'my-dialog');
      expect(content).toHaveAttribute('aria-labelledby', 'dialog-title');
    });

    it('DialogHeader debe pasar props adicionales', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader 
              data-testid="header" 
              id="dialog-header"
            >
              <DialogTitle>Título</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('header')).toHaveAttribute('id', 'dialog-header');
    });

    it('DialogFooter debe pasar props adicionales', () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
            <DialogFooter 
              data-testid="footer" 
              id="dialog-footer"
            >
              <button>Acción</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('footer')).toHaveAttribute('id', 'dialog-footer');
    });
  });
});

// Import React for the ControlledDialog component
import * as React from 'react';

