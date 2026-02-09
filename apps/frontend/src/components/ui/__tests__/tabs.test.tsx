/**
 * Tests para los componentes Tabs
 * Verifica renderizado y comportamiento de Tabs, TabsList, TabsTrigger, TabsContent
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs Components', () => {
  describe('Tabs controlado', () => {
    it('debe renderizar el tab activo correctamente', () => {
      render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Contenido 1</TabsContent>
          <TabsContent value="tab2">Contenido 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Contenido 1')).toBeInTheDocument();
      expect(screen.queryByText('Contenido 2')).not.toBeInTheDocument();
    });

    it('debe llamar onValueChange cuando se hace clic en otro tab', () => {
      const handleValueChange = jest.fn();
      
      render(
        <Tabs value="tab1" onValueChange={handleValueChange}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Contenido 1</TabsContent>
          <TabsContent value="tab2">Contenido 2</TabsContent>
        </Tabs>
      );

      fireEvent.click(screen.getByText('Tab 2'));
      expect(handleValueChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('Tabs no controlado', () => {
    it('debe usar defaultValue para mostrar el tab inicial', () => {
      render(
        <Tabs defaultValue="tab2">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Contenido 1</TabsContent>
          <TabsContent value="tab2">Contenido 2</TabsContent>
        </Tabs>
      );

      expect(screen.queryByText('Contenido 1')).not.toBeInTheDocument();
      expect(screen.getByText('Contenido 2')).toBeInTheDocument();
    });

    it('debe cambiar de tab al hacer clic', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Contenido 1</TabsContent>
          <TabsContent value="tab2">Contenido 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Contenido 1')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Tab 2'));
      
      expect(screen.queryByText('Contenido 1')).not.toBeInTheDocument();
      expect(screen.getByText('Contenido 2')).toBeInTheDocument();
    });
  });

  describe('TabsList', () => {
    it('debe renderizar los triggers dentro', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
    });

    it('debe aplicar estilos base', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const list = screen.getByTestId('tabs-list');
      expect(list).toHaveClass('inline-flex');
      expect(list).toHaveClass('rounded-md');
    });

    it('debe aceptar className adicional', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList data-testid="tabs-list" className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      expect(screen.getByTestId('tabs-list')).toHaveClass('custom-list');
    });
  });

  describe('TabsTrigger', () => {
    it('debe mostrar estilos activos cuando está seleccionado', () => {
      render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger-1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" data-testid="trigger-2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const activeTrigger = screen.getByTestId('trigger-1');
      expect(activeTrigger).toHaveClass('bg-background');
      expect(activeTrigger).toHaveClass('shadow-sm');
    });

    it('debe ser un botón', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );

      expect(screen.getByTestId('trigger').tagName).toBe('BUTTON');
    });

    it('debe aceptar className adicional', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" data-testid="trigger" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );

      expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger');
    });
  });

  describe('TabsContent', () => {
    it('debe renderizar contenido solo cuando está activo', () => {
      render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content-1">Contenido 1</TabsContent>
          <TabsContent value="tab2" data-testid="content-2">Contenido 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('content-1')).toBeInTheDocument();
      expect(screen.queryByTestId('content-2')).not.toBeInTheDocument();
    });

    it('debe aplicar estilos base cuando está activo', () => {
      render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content">Contenido</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('content')).toHaveClass('mt-2');
    });

    it('debe aceptar className adicional', () => {
      render(
        <Tabs value="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" data-testid="content" className="custom-content">
            Contenido
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('content')).toHaveClass('custom-content');
    });
  });

  describe('Tabs con múltiples tabs', () => {
    it('debe manejar navegación entre múltiples tabs', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Contenido 1</TabsContent>
          <TabsContent value="tab2">Contenido 2</TabsContent>
          <TabsContent value="tab3">Contenido 3</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Contenido 1')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Tab 3'));
      expect(screen.getByText('Contenido 3')).toBeInTheDocument();
      expect(screen.queryByText('Contenido 1')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Tab 2'));
      expect(screen.getByText('Contenido 2')).toBeInTheDocument();
      expect(screen.queryByText('Contenido 3')).not.toBeInTheDocument();
    });
  });
});

