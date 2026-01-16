// Tests de `useWhatsAppNotifications`: carga inicial (3 fetch) + updateConfig con error.
import React, { useState } from 'react';
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('useWhatsAppNotifications', () => {
  let state: any = {};

  let useWhatsAppNotifications: typeof import('../useWhatsAppNotifications').useWhatsAppNotifications;

  beforeAll(async () => {
    await jest.unstable_mockModule('react-redux', () => ({
      useSelector: (sel: any) => sel(state),
    }));
    ({ useWhatsAppNotifications } = await import('../useWhatsAppNotifications'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    state = { auth: { token: 'tkn', user: { empresaId: 7 } } };
  });

  const TestComp = () => {
    const hook = useWhatsAppNotifications();
    const [updateResult, setUpdateResult] = useState<string>('');
    return (
      <div>
        <div data-testid="loading">{String(hook.isLoading)}</div>
        <div data-testid="enabled">{String(hook.config?.enabled)}</div>
        <div data-testid="instances">{String(hook.instances.length)}</div>
        <div data-testid="templates">{String(hook.templates.length)}</div>
        <div data-testid="error">{hook.error || ''}</div>
        <div data-testid="updateResult">{updateResult}</div>

        <button
          onClick={() =>
            hook
              .updateConfig({ enabled: true })
              .then(() => setUpdateResult('ok'))
              .catch(() => setUpdateResult('err'))
          }
        >
          update
        </button>
      </div>
    );
  };

  it('carga config/instances/templates cuando hay token', async () => {
    (globalThis as any).fetch = jest.fn(async (url: string) => {
      if (url.includes('/notifications/whatsapp/config')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              enabled: true,
              instanceId: 'i1',
              phoneNumber: '+54911',
              templates: { documentExpiry: 'a', urgentAlert: 'b', equipmentUpdate: 'c', general: 'd' },
            },
          }),
        };
      }
      if (url.includes('/evolution/instances')) {
        return { ok: true, status: 200, json: async () => ({ data: [{ id: 'i1', name: 'x', serverUrl: 's', apiKey: 'k', status: 'connected' }] }) };
      }
      if (url.includes('/notifications/whatsapp/templates')) {
        return { ok: true, status: 200, json: async () => ({ data: [{ id: 't1', name: 'Tpl', message: 'm', variables: [], type: 'general' }] }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: {} }) };
    });

    render(<TestComp />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('enabled').textContent).toBe('true');
    expect(screen.getByTestId('instances').textContent).toBe('1');
    expect(screen.getByTestId('templates').textContent).toBe('1');
  });

  it('updateConfig setea error cuando el backend responde ok=false', async () => {
    (globalThis as any).fetch = jest.fn(async (url: string, init?: any) => {
      if (url.includes('/notifications/whatsapp/config') && init?.method === 'PUT') {
        return {
          ok: false,
          status: 400,
          json: async () => ({ message: 'bad' }),
        };
      }
      // carga inicial mínima para tener `config` y habilitar updateConfig
      if (url.includes('/notifications/whatsapp/config')) {
        return { ok: true, status: 200, json: async () => ({ data: { enabled: false, instanceId: '', phoneNumber: '', templates: { documentExpiry: '', urgentAlert: '', equipmentUpdate: '', general: '' } } }) };
      }
      if (url.includes('/evolution/instances')) return { ok: true, status: 200, json: async () => ({ data: [] }) };
      if (url.includes('/notifications/whatsapp/templates')) return { ok: true, status: 200, json: async () => ({ data: [] }) };
      return { ok: true, status: 200, json: async () => ({ data: {} }) };
    });

    render(<TestComp />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    fireEvent.click(screen.getByText('update'));

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('bad');
      expect(screen.getByTestId('updateResult').textContent).toBe('err');
    });
  });
});


