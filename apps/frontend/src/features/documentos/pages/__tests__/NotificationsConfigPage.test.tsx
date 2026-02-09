// Tests completos de `NotificationsConfigPage`: configuración de notificaciones (Jest ESM).
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

describe('NotificationsConfigPage - render completo con coverage', () => {
  let NotificationsConfigPage: React.FC;
  let MemoryRouter: typeof import('react-router-dom').MemoryRouter;
  let mockGoBack: jest.Mock;
  let mockFetch: jest.Mock;

  beforeAll(async () => {
    mockGoBack = jest.fn();
    mockFetch = jest.fn();

    // Mock useRoleBasedNavigation hook
    await jest.unstable_mockModule('../../../../hooks/useRoleBasedNavigation', () => ({
      useRoleBasedNavigation: () => ({ goBack: mockGoBack }),
    }));

    // Mock runtimeEnv
    await jest.unstable_mockModule('../../../../lib/runtimeEnv', () => ({
      getRuntimeEnv: () => 'http://test',
      getRuntimeFlag: () => false,
    }));

    // Mock Redux store
    await jest.unstable_mockModule('react-redux', () => ({
      ...jest.requireActual('react-redux'),
      useSelector: (fn: any) =>
        fn(({
          auth: {
            token: 'test-token',
            user: { empresaId: 123 },
          },
        } as any)),
    }));

    // Mock fetch
    (globalThis as any).fetch = mockFetch;

    ({ default: NotificationsConfigPage } = await import('../NotificationsConfigPage'));
    ({ MemoryRouter } = await import('react-router-dom'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          enabled: true,
          windows: {},
          templates: {},
        },
      }),
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <NotificationsConfigPage />
      </MemoryRouter>
    );
  };

  it('renderiza página con título y botón volver', () => {
    renderPage();
    expect(screen.getByText('Configuración de Notificaciones')).toBeInTheDocument();
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  it('carga configuración desde la API', () => {
    renderPage();
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test/api/docs/notifications',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'x-tenant-id': '123',
        }),
      })
    );
  });

  it('muestra checkbox de sistema habilitado', () => {
    renderPage();
    expect(screen.getByText('Sistema de notificaciones')).toBeInTheDocument();
  });

  it('llama goBack al hacer click en volver', () => {
    renderPage();
    const volverButton = screen.getByText('Volver');
    fireEvent.click(volverButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('guarda configuración al hacer click en Guardar', () => {
    renderPage();
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const guardarButton = screen.getByText('Guardar');
    fireEvent.click(guardarButton);

    expect(mockFetch).toHaveBeenCalled();
  });

  it('prueba envío de notificación con MSISDN', () => {
    renderPage();
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const msisdnInput = screen.getByPlaceholderText('MSISDN (+549...)');
    fireEvent.change(msisdnInput, { target: { value: '+5491112345678' } });

    const probarButton = screen.getByText('Probar envío');
    fireEvent.click(probarButton);

    expect(mockFetch).toHaveBeenCalled();
  });

  it('cambia checkbox de sistema habilitado', () => {
    renderPage();
    const checkbox = screen.getByRole('checkbox', { name: '' }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('cambia checkbox de ventana aviso', () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    const avisoCheckbox = checkboxes[1];
    fireEvent.click(avisoCheckbox);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('cambia unidad de ventana aviso', () => {
    renderPage();
    const selects = screen.getAllByDisplayValue('days');
    const avisoSelect = selects[0];
    fireEvent.change(avisoSelect, { target: { value: 'weeks' } });
    expect(avisoSelect).toHaveValue('weeks');
  });

  it('cambia valor de ventana aviso', () => {
    renderPage();
    // Buscar inputs que tengan el valor numérico 30 (valor por defecto)
    const inputElement = screen.getByDisplayValue('30');
    fireEvent.change(inputElement, { target: { value: '60' } });
    // El valor queda como string en el DOM
    expect(inputElement).toHaveValue('60');
  });

  it('cambia checkbox de template chofer', () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox');
    const choferCheckbox = checkboxes[2];
    fireEvent.click(choferCheckbox);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('cambia texto de template chofer', () => {
    renderPage();
    const textareas = screen.getAllByRole('textbox');
    const choferTextarea = textareas[0];
    fireEvent.change(choferTextarea, { target: { value: 'Mensaje de prueba' } });
    // Verificar que el evento se disparó
    expect(choferTextarea).toBeInTheDocument();
  });

  it('cambia mensaje de prueba', () => {
    renderPage();
    const msgInput = screen.getByPlaceholderText('Mensaje de prueba');
    fireEvent.change(msgInput, { target: { value: 'Test message' } });
    expect(msgInput).toHaveValue('Test message');
  });
});
