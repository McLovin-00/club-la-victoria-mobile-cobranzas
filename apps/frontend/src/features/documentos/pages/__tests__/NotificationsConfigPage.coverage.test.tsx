/**
 * Coverage test para NotificationsConfigPage
 */
import { render, screen, waitFor } from '@testing-library/react';
import { AllProviders } from '../../../../test-utils/testWrappers';

const { default: NotificationsConfigPage } = await import('../NotificationsConfigPage');

describe('NotificationsConfigPage - Coverage', () => {
  beforeEach(() => {
    const mockFetch = jest.fn().mockResolvedValue({
      json: async () => ({
        data: {
          enabled: false,
          windows: {
            aviso: { enabled: true, unit: 'days', value: 30 },
            alerta: { enabled: true, unit: 'days', value: 14 },
            alarma: { enabled: true, unit: 'days', value: 3 },
          },
          templates: {
            aviso: { chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
            alerta: { chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
            alarma: { chofer: { enabled: true, text: '' }, dador: { enabled: true, text: '' } },
          },
        },
      }),
    });

    Object.defineProperty(globalThis, 'fetch', {
      value: mockFetch,
      writable: true,
    });
  });

  it('debería importar el componente', async () => {
    expect(NotificationsConfigPage).toBeDefined();
  });

  it('debería renderizar la página', async () => {
    render(<NotificationsConfigPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Configuración de Notificaciones/i })).not.toBeNull();
    });
  });
});
