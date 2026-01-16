/**
 * Tests para los componentes Card
 * Verifica renderizado y variantes de Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
 */
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('debe renderizar correctamente con children', () => {
      render(<Card>Contenido de la card</Card>);
      expect(screen.getByText('Contenido de la card')).toBeInTheDocument();
    });

    it('debe aplicar className adicional', () => {
      render(<Card data-testid="card" className="custom-class">Test</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-lg');
    });

    it('debe pasar props HTML adicionales', () => {
      render(<Card data-testid="card" id="my-card" title="Card tooltip">Props Test</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('id', 'my-card');
      expect(card).toHaveAttribute('title', 'Card tooltip');
    });

    it('debe renderizarse como div', () => {
      render(<Card data-testid="card">Test</Card>);
      expect(screen.getByTestId('card').tagName).toBe('DIV');
    });
  });

  describe('CardHeader', () => {
    it('debe renderizar correctamente', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('debe aplicar clases base y custom className', () => {
      render(<CardHeader data-testid="header" className="test-class">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('test-class');
    });
  });

  describe('CardTitle', () => {
    it('debe renderizar como h3', () => {
      render(<CardTitle data-testid="title">Mi Título</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title.tagName).toBe('H3');
      expect(title).toHaveTextContent('Mi Título');
    });

    it('debe aplicar estilos de tipografía', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-2xl');
      expect(title).toHaveClass('font-semibold');
    });

    it('debe aceptar className adicional', () => {
      render(<CardTitle data-testid="title" className="custom-title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('debe renderizar como p', () => {
      render(<CardDescription data-testid="desc">Descripción</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc.tagName).toBe('P');
      expect(desc).toHaveTextContent('Descripción');
    });

    it('debe aplicar estilos de texto muted', () => {
      render(<CardDescription data-testid="desc">Desc</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
      expect(desc).toHaveClass('text-muted-foreground');
    });
  });

  describe('CardContent', () => {
    it('debe renderizar children correctamente', () => {
      render(<CardContent>Contenido principal</CardContent>);
      expect(screen.getByText('Contenido principal')).toBeInTheDocument();
    });

    it('debe aplicar padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      const content = screen.getByTestId('content');
      expect(content).toHaveClass('p-6');
      expect(content).toHaveClass('pt-0');
    });
  });

  describe('CardFooter', () => {
    it('debe renderizar children correctamente', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('debe aplicar estilos de flexbox', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
    });
  });

  describe('Card compuesto', () => {
    it('debe renderizar estructura completa de Card con todos los subcomponentes', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Título de prueba</CardTitle>
            <CardDescription>Descripción de prueba</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Contenido de la tarjeta</p>
          </CardContent>
          <CardFooter>
            <button>Acción</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByText('Título de prueba')).toBeInTheDocument();
      expect(screen.getByText('Descripción de prueba')).toBeInTheDocument();
      expect(screen.getByText('Contenido de la tarjeta')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
    });
  });
});

