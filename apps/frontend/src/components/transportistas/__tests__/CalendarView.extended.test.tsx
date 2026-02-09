/**
 * Tests extendidos para CalendarView refactorizados para ESM y robustez
 * Incrementa coverage cubriendo navegación y prioridades
 */
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { addMonths, subMonths, format, addDays, subDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// Mock de TouchFeedback
jest.unstable_mockModule('../../mobile/TouchFeedback', () => ({
  TouchFeedback: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick}>{children}</div>
  ),
}));

// Import dinámico de CalendarView
const { CalendarView } = await import('../CalendarView');

describe('CalendarView (extended)', () => {
  const today = new Date();
  // Usar un día que no sea hoy para probar estilos de prioridad (evitar el bloque isToday)
  const anotherDay = addDays(today, today.getDate() < 15 ? 2 : -2);

  const createEvent = (overrides: any = {}): any => ({
    id: '1',
    equipoId: 'equipo-1',
    equipoNombre: 'Camión Test',
    documentoTipo: 'VTV',
    fechaVencimiento: anotherDay,
    estado: 'proximo',
    prioridad: 'alta',
    diasRestantes: 5,
    ...overrides,
  });

  const mockOnDateSelect = jest.fn();
  const mockOnEventClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('navegación de meses', () => {
    it('debe ir al mes anterior', () => {
      render(
        <CalendarView
          events={[]}
          selectedDate={today}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      const buttons = screen.getAllByRole('button');
      // En el componente los botones de navegación tienen iconos
      const prevButton = buttons[0];

      fireEvent.click(prevButton);

      const prevMonth = subMonths(today, 1);
      expect(screen.getByText(format(prevMonth, 'MMMM yyyy', { locale: es }))).toBeInTheDocument();
    });

    it('debe ir a hoy al hacer clic en el botón', () => {
      render(
        <CalendarView
          events={[]}
          selectedDate={subMonths(today, 1)}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      fireEvent.click(screen.getByText('Ir a hoy'));
      expect(mockOnDateSelect).toHaveBeenCalled();
    });
  });

  describe('prioridades de día', () => {
    it('debe aplicar estilo rojo para prioridad alta en un día que no es hoy', () => {
      const events = [createEvent({ prioridad: 'alta', fechaVencimiento: anotherDay })];

      const { container } = render(
        <CalendarView
          events={events}
          selectedDate={null}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
    });

    it('debe aplicar estilo amarillo para prioridad media en un día que no es hoy', () => {
      const events = [createEvent({ prioridad: 'media', fechaVencimiento: anotherDay })];

      const { container } = render(
        <CalendarView
          events={events}
          selectedDate={null}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      expect(container.querySelector('.bg-yellow-100')).toBeInTheDocument();
    });
  });

  describe('eventos del día seleccionado', () => {
    it('debe mostrar icono de advertencia para vencido en la lista inferior', () => {
      const events = [createEvent({ estado: 'vencido', fechaVencimiento: anotherDay })];

      const { container } = render(
        <CalendarView
          events={events}
          selectedDate={anotherDay}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
        />
      );

      // Icono de error (ExclamationTriangleIcon) suele tener clase text-red-500
      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });
  });
});
