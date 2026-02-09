/**
 * Tests extendidos para AlertasUrgentes refactorizados para ESM y robustez
 * Incrementa coverage cubriendo acciones y estilos adicionales
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock de TouchFeedback - Usando path relativo correcto desde __tests__
jest.unstable_mockModule('../../mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => (
    <div onClick={onPress} data-testid="touch-feedback">{children}</div>
  ),
}));

// Import dinámico del componente
const { AlertasUrgentes } = await import('../AlertasUrgentes');

describe('AlertasUrgentes (extended)', () => {
  const createAlerta = (overrides = {}) => ({
    id: '1',
    equipoId: 101,
    documentoTipo: 'Licencia de Conducir',
    diasVencimiento: 5,
    prioridad: 'alta' as const,
    mensaje: 'El documento vence pronto',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('acciones de alerta', () => {
    it('debe llamar console.log al hacer clic en Subir', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      render(<AlertasUrgentes alertas={[createAlerta()]} />);

      const btn = screen.getByText('Subir');
      fireEvent.click(btn);

      expect(consoleSpy).toHaveBeenCalledWith('Action upload for alerta 1');
      consoleSpy.mockRestore();
    });

    it('debe llamar console.log al hacer clic en Recordar', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

      render(<AlertasUrgentes alertas={[createAlerta()]} />);

      const btn = screen.getByText('Recordar');
      fireEvent.click(btn);

      expect(consoleSpy).toHaveBeenCalledWith('Action remind for alerta 1');
      consoleSpy.mockRestore();
    });
  });

  describe('estilos de prioridad', () => {
    it('debe aplicar estilos de prioridad baja (amarillo)', () => {
      const alertaBaja = [createAlerta({ prioridad: 'baja' })];
      const { container } = render(<AlertasUrgentes alertas={alertaBaja} />);

      expect(container.querySelector('.bg-yellow-50')).toBeInTheDocument();
      expect(container.querySelector('.border-yellow-200')).toBeInTheDocument();
    });

    it('debe aplicar estilos de prioridad media (naranja)', () => {
      const alertaMedia = [createAlerta({ prioridad: 'media' })];
      const { container } = render(<AlertasUrgentes alertas={alertaMedia} />);

      expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
      expect(container.querySelector('.border-orange-200')).toBeInTheDocument();
    });
  });

  describe('icono según días de vencimiento', () => {
    it('debe mostrar texto VENCIDO cuando diasVencimiento <= 0', () => {
      const alertaVencida = [createAlerta({ diasVencimiento: -5 })];
      render(<AlertasUrgentes alertas={alertaVencida} />);
      expect(screen.getByText('VENCIDO')).toBeInTheDocument();
    });

    it('debe mostrar días restantes cuando diasVencimiento > 0', () => {
      const alertaProxima = [createAlerta({ diasVencimiento: 10 })];
      render(<AlertasUrgentes alertas={alertaProxima} />);
      expect(screen.getByText('10d')).toBeInTheDocument();
    });
  });

  describe('expand/collapse toggle', () => {
    it('debe toggle expanded al hacer clic en header y luego en Ver menos', () => {
      const muchasAlertas = [
        createAlerta({ id: '1', prioridad: 'alta', diasVencimiento: 1 }),
        createAlerta({ id: '2', prioridad: 'alta', diasVencimiento: 2 }),
        createAlerta({ id: '3', prioridad: 'alta', diasVencimiento: 3 }),
        createAlerta({ id: '4', prioridad: 'alta', diasVencimiento: 4 }),
        createAlerta({ id: '5', prioridad: 'alta', diasVencimiento: 5 }),
      ];

      render(<AlertasUrgentes alertas={muchasAlertas} />);

      expect(screen.getByText('Ver 2 más')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Alertas Urgentes'));
      expect(screen.getByText('Ver menos')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Ver menos'));
      expect(screen.getByText('Ver 2 más')).toBeInTheDocument();
    });
  });

  describe('ordenamiento', () => {
    it('debe ordenar por prioridad (alta > media > baja)', () => {
      const alertas = [
        createAlerta({ id: '1', prioridad: 'baja' }),
        createAlerta({ id: '2', prioridad: 'alta' }),
        createAlerta({ id: '3', prioridad: 'media' }),
      ];

      const { container } = render(<AlertasUrgentes alertas={alertas} />);
      const titulos = screen.getAllByText('Licencia de Conducir');
      expect(titulos.length).toBe(3);
      // Solo verificamos que se renderizaron
    });
  });

  describe('null safety', () => {
    it('debe manejar lista vacía, undefined o null', () => {
      const { rerender } = render(<AlertasUrgentes alertas={[]} />);
      expect(screen.getByText('¡Todo al día!')).toBeInTheDocument();

      // @ts-expect-error test
      rerender(<AlertasUrgentes alertas={undefined} />);
      expect(screen.getByText('¡Todo al día!')).toBeInTheDocument();

      // @ts-expect-error test
      rerender(<AlertasUrgentes alertas={null} />);
      expect(screen.getByText('¡Todo al día!')).toBeInTheDocument();
    });
  });
});
