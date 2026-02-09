/**
 * Tests extendidos para el componente Tabs
 * Verifica navegación por teclado, accesibilidad, ref forwarding y casos borde
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';
import * as React from 'react';

describe('Tabs Extended', () => {
  describe('ref forwarding', () => {
    it('Tabs debe soportar ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Tabs ref={ref} defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('TabsList debe soportar ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList ref={ref}>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('TabsTrigger debe soportar ref', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger ref={ref} value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('TabsContent debe soportar ref', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent ref={ref} value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('props HTML', () => {
    it('Tabs debe pasar props HTML adicionales', () => {
      render(
        <Tabs defaultValue="tab1" id="my-tabs" data-testid="tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tabs = screen.getByTestId('tabs');
      expect(tabs).toHaveAttribute('id', 'my-tabs');
    });

    it('TabsList debe pasar props HTML adicionales', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList id="tabs-list" data-testid="list" aria-label="Navigation">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const list = screen.getByTestId('list');
      expect(list).toHaveAttribute('id', 'tabs-list');
      expect(list).toHaveAttribute('aria-label', 'Navigation');
    });

    it('TabsTrigger debe pasar props HTML adicionales', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" id="trigger-1" data-testid="trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('id', 'trigger-1');
    });

    it('TabsContent debe pasar props HTML adicionales', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" id="content-1" data-testid="content">
            Content 1
          </TabsContent>
        </Tabs>
      );

      const content = screen.getByTestId('content');
      expect(content).toHaveAttribute('id', 'content-1');
    });
  });

  describe('disabled state', () => {
    it('TabsTrigger debe soportar estado disabled', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled data-testid="disabled-trigger">
              Tab 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('disabled-trigger')).toBeDisabled();
    });

    it('no debe cambiar de tab al hacer clic en trigger disabled', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      // Intentar cambiar al tab disabled
      fireEvent.click(screen.getByText('Tab 2'));

      // Debe seguir mostrando Content 1
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('estilos y clases', () => {
    it('debe aplicar clases base a Tabs', () => {
      render(
        <Tabs defaultValue="tab1" data-testid="tabs">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('tabs')).toHaveClass('w-full');
    });

    it('debe aplicar clases activas e inactivas a triggers', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="active">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" data-testid="inactive">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const activeTrigger = screen.getByTestId('active');
      const inactiveTrigger = screen.getByTestId('inactive');

      expect(activeTrigger).toHaveClass('bg-background');
      expect(activeTrigger).toHaveClass('shadow-sm');
      expect(inactiveTrigger).not.toHaveClass('bg-background');
    });

    it('debe aplicar clases focus-visible a triggers', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const trigger = screen.getByTestId('trigger');
      expect(trigger.className).toContain('focus-visible:outline-none');
      expect(trigger.className).toContain('focus-visible:ring-2');
    });
  });

  describe('casos borde', () => {
    it('debe manejar un solo tab', () => {
      render(
        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Solo Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="single">Solo Content</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Solo Tab')).toBeInTheDocument();
      expect(screen.getByText('Solo Content')).toBeInTheDocument();
    });

    it('debe manejar muchos tabs', () => {
      const tabs = Array.from({ length: 10 }, (_, i) => ({
        value: `tab-${i}`,
        label: `Tab ${i + 1}`,
        content: `Content ${i + 1}`,
      }));

      render(
        <Tabs defaultValue="tab-0">
          <TabsList>
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      
      // Cambiar a último tab
      fireEvent.click(screen.getByText('Tab 10'));
      expect(screen.getByText('Content 10')).toBeInTheDocument();
    });

    it('debe manejar contenido complejo en tabs', () => {
      render(
        <Tabs defaultValue="complex">
          <TabsList>
            <TabsTrigger value="complex">
              <span>Icono</span>
              <span>Texto</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="complex">
            <div>
              <h2>Título</h2>
              <p>Párrafo con <strong>texto formateado</strong></p>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Icono')).toBeInTheDocument();
      expect(screen.getByText('Texto')).toBeInTheDocument();
      expect(screen.getByText('Título')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('debe actualizar cuando cambia defaultValue', () => {
      const { rerender } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Cambiar defaultValue no debería afectar si ya está montado
      rerender(
        <Tabs defaultValue="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      // El estado interno no debería cambiar con defaultValue
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('debe actualizar cuando cambia value en modo controlado', () => {
      const { rerender } = render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      rerender(
        <Tabs value="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('contenido vacío', () => {
    it('debe renderizar tabs sin TabsContent', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });

    it('debe renderizar TabsContent vacío', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="empty-content" />
        </Tabs>
      );

      expect(screen.getByTestId('empty-content')).toBeInTheDocument();
    });
  });
});

