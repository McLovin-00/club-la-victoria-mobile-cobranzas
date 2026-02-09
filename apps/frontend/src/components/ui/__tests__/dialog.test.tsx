/**
 * Tests para los componentes Dialog
 * Verifica renderizado de Dialog, DialogHeader, DialogFooter, DialogTitle, DialogDescription, etc.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../dialog';

describe('Dialog Components', () => {
  describe('Dialog básico', () => {
    it('debe renderizar el trigger correctamente', () => {
      render(
        <Dialog>
          <DialogTrigger>Abrir dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Abrir dialog')).toBeInTheDocument();
    });

    it('debe abrir el dialog al hacer clic en el trigger', () => {
      render(
        <Dialog>
          <DialogTrigger>Abrir dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Título del dialog</DialogTitle>
            <DialogDescription>Descripción del dialog</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      fireEvent.click(screen.getByText('Abrir dialog'));

      expect(screen.getByText('Título del dialog')).toBeInTheDocument();
      expect(screen.getByText('Descripción del dialog')).toBeInTheDocument();
    });

    it('debe tener botón de cerrar en el contenido', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  describe('DialogHeader', () => {
    it('debe renderizar correctamente', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="header">
              <DialogTitle>Título</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('debe aplicar estilos de flexbox', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="header">
              <DialogTitle>Título</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('header')).toHaveClass('flex');
      expect(screen.getByTestId('header')).toHaveClass('flex-col');
    });

    it('debe aceptar className adicional', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="header" className="custom-header">
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
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogFooter data-testid="footer">
              <button>Cancelar</button>
              <button>Aceptar</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
    });

    it('debe aplicar estilos responsivos', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogFooter data-testid="footer">
              <button>OK</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('flex-col-reverse');
    });
  });

  describe('DialogTitle', () => {
    it('debe renderizar el título', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Mi título personalizado</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Mi título personalizado')).toBeInTheDocument();
    });

    it('debe aplicar estilos de tipografía', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle data-testid="title">Título</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
    });
  });

  describe('DialogDescription', () => {
    it('debe renderizar la descripción', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogDescription>Descripción detallada del dialog</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Descripción detallada del dialog')).toBeInTheDocument();
    });

    it('debe aplicar estilos de texto secundario', () => {
      render(
        <Dialog defaultOpen>
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
  });

  describe('DialogClose', () => {
    it('debe cerrar el dialog al hacer clic', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
            <DialogClose asChild>
              <button>Cerrar</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Título')).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
      
      // El dialog debería cerrarse
      expect(screen.queryByText('Título')).not.toBeInTheDocument();
    });
  });

  describe('Dialog controlado', () => {
    it('debe respetar el estado open', () => {
      const { rerender } = render(
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Dialog cerrado</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Dialog cerrado')).not.toBeInTheDocument();

      rerender(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Dialog abierto</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Dialog abierto')).toBeInTheDocument();
    });

    it('debe llamar onOpenChange al cambiar estado', () => {
      const handleOpenChange = jest.fn();
      
      render(
        <Dialog open={true} onOpenChange={handleOpenChange}>
          <DialogContent>
            <DialogTitle>Título</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      // Al hacer clic en el botón de cerrar
      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Dialog completo', () => {
    it('debe renderizar estructura completa del dialog', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar acción</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas realizar esta acción?
              </DialogDescription>
            </DialogHeader>
            <div>Contenido del dialog</div>
            <DialogFooter>
              <DialogClose asChild>
                <button>Cancelar</button>
              </DialogClose>
              <button>Confirmar</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
      expect(screen.getByText('¿Estás seguro de que deseas realizar esta acción?')).toBeInTheDocument();
      expect(screen.getByText('Contenido del dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    });
  });
});

