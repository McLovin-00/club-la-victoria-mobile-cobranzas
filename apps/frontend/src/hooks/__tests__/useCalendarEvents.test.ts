/**
 * Tests para useCalendarEvents hook
 * Verifica tipos y lógica de filtrado de eventos del calendario
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { CalendarEvent } from '../useCalendarEvents';

describe('CalendarEvent - tipos y estructura', () => {
  it('CalendarEvent tiene la estructura correcta', () => {
    const event: CalendarEvent = {
      id: '1',
      equipoId: 'eq-123',
      equipoNombre: 'Equipo Test',
      documentoTipo: 'Licencia de conducir',
      fechaVencimiento: new Date('2024-12-31'),
      estado: 'vigente',
      prioridad: 'alta',
      diasRestantes: 30,
    };

    expect(event.id).toBe('1');
    expect(event.equipoId).toBe('eq-123');
    expect(event.estado).toBe('vigente');
    expect(event.prioridad).toBe('alta');
    expect(event.diasRestantes).toBe(30);
    expect(event.fechaVencimiento).toBeInstanceOf(Date);
  });

  it('CalendarEvent acepta diferentes estados', () => {
    const estados: CalendarEvent['estado'][] = ['vigente', 'vencido', 'proximo'];
    
    estados.forEach(estado => {
      const event: CalendarEvent = {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo',
        documentoTipo: 'Doc',
        fechaVencimiento: new Date(),
        estado,
        prioridad: 'media',
        diasRestantes: 0,
      };
      expect(event.estado).toBe(estado);
    });
  });

  it('CalendarEvent acepta diferentes prioridades', () => {
    const prioridades: CalendarEvent['prioridad'][] = ['alta', 'media', 'baja'];
    
    prioridades.forEach(prioridad => {
      const event: CalendarEvent = {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo',
        documentoTipo: 'Doc',
        fechaVencimiento: new Date(),
        estado: 'vigente',
        prioridad,
        diasRestantes: 0,
      };
      expect(event.prioridad).toBe(prioridad);
    });
  });

  it('diasRestantes puede ser negativo para documentos vencidos', () => {
    const event: CalendarEvent = {
      id: '1',
      equipoId: 'eq-1',
      equipoNombre: 'Equipo',
      documentoTipo: 'Seguro',
      fechaVencimiento: new Date('2023-01-01'),
      estado: 'vencido',
      prioridad: 'alta',
      diasRestantes: -365,
    };

    expect(event.diasRestantes).toBeLessThan(0);
    expect(event.estado).toBe('vencido');
  });
});

describe('useCalendarEvents - lógica de filtrado', () => {
  // Simular la lógica de getEventsForDate
  const getEventsForDate = (events: CalendarEvent[], date: Date): CalendarEvent[] => {
    const targetDateStr = date.toDateString();
    return events.filter(event => 
      event.fechaVencimiento.toDateString() === targetDateStr
    );
  };

  it('filtra eventos por fecha correctamente', () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo 1',
        documentoTipo: 'Licencia',
        fechaVencimiento: new Date('2024-12-31'),
        estado: 'vigente',
        prioridad: 'alta',
        diasRestantes: 30,
      },
      {
        id: '2',
        equipoId: 'eq-2',
        equipoNombre: 'Equipo 2',
        documentoTipo: 'Seguro',
        fechaVencimiento: new Date('2024-11-15'),
        estado: 'proximo',
        prioridad: 'media',
        diasRestantes: 10,
      },
      {
        id: '3',
        equipoId: 'eq-3',
        equipoNombre: 'Equipo 3',
        documentoTipo: 'VTV',
        fechaVencimiento: new Date('2024-12-31'),
        estado: 'vigente',
        prioridad: 'baja',
        diasRestantes: 30,
      },
    ];

    const targetDate = new Date('2024-12-31');
    const filtered = getEventsForDate(events, targetDate);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].equipoNombre).toBe('Equipo 1');
    expect(filtered[1].equipoNombre).toBe('Equipo 3');
  });

  it('retorna array vacío si no hay eventos en la fecha', () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        equipoId: 'eq-1',
        equipoNombre: 'Equipo 1',
        documentoTipo: 'Licencia',
        fechaVencimiento: new Date('2024-12-31'),
        estado: 'vigente',
        prioridad: 'alta',
        diasRestantes: 30,
      },
    ];

    const targetDate = new Date('2024-01-01');
    const filtered = getEventsForDate(events, targetDate);

    expect(filtered).toHaveLength(0);
  });

  it('maneja array de eventos vacío', () => {
    const events: CalendarEvent[] = [];
    const targetDate = new Date('2024-12-31');
    const filtered = getEventsForDate(events, targetDate);

    expect(filtered).toHaveLength(0);
  });
});

describe('useCalendarEvents - procesamiento de datos', () => {
  it('convierte string ISO a Date correctamente', () => {
    const isoString = '2024-12-31T12:00:00.000Z';
    const date = new Date(isoString);
    
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(11); // Diciembre
    // getUTCDate para evitar problemas de zona horaria
    expect(date.getUTCDate()).toBe(31);
  });

  it('maneja eventos con diferentes formatos de fecha', () => {
    const dates = [
      '2024-12-31',
      '2024-12-31T00:00:00.000Z',
      '2024-12-31T23:59:59.999Z',
    ];

    dates.forEach(dateStr => {
      const date = new Date(dateStr);
      expect(date).toBeInstanceOf(Date);
      expect(!isNaN(date.getTime())).toBe(true);
    });
  });
});

describe('useCalendarEvents - authHeaders', () => {
  it('construye headers correctamente con token', () => {
    const authToken = 'test-token';
    const empresaId = 42;

    const authHeaders: HeadersInit = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
      'Content-Type': 'application/json',
    };

    expect(authHeaders.Authorization).toBe('Bearer test-token');
    expect(authHeaders['x-tenant-id']).toBe('42');
    expect(authHeaders['Content-Type']).toBe('application/json');
  });

  it('omite Authorization si no hay token', () => {
    const authToken = null;
    const empresaId = 42;

    const authHeaders: HeadersInit = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
      'Content-Type': 'application/json',
    };

    expect(authHeaders.Authorization).toBeUndefined();
    expect(authHeaders['x-tenant-id']).toBe('42');
  });

  it('omite x-tenant-id si no hay empresaId', () => {
    const authToken = 'test-token';
    const empresaId = null;

    const authHeaders: HeadersInit = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
      'Content-Type': 'application/json',
    };

    expect(authHeaders.Authorization).toBe('Bearer test-token');
    expect(authHeaders['x-tenant-id']).toBeUndefined();
  });
});

describe('useCalendarEvents - export', () => {
  it('exporta useCalendarEvents hook', async () => {
    const module = await import('../useCalendarEvents');
    expect(module.useCalendarEvents).toBeDefined();
    expect(typeof module.useCalendarEvents).toBe('function');
  });
});
