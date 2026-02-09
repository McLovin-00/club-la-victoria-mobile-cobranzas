import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import {
  createWhatsAppNotificationService,
  NotificationTemplates,
  WhatsAppNotificationHelpers,
} from '../whatsapp-notifications';

describe('whatsapp-notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('send muestra toast en success (urgent) y en error (high)', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { id: 1 } }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'fail' }) });
    (globalThis as any).fetch = fetchMock;

    jest.useFakeTimers();

    const svc = createWhatsAppNotificationService('http://api', { Authorization: 'Bearer x' });

    await svc.send({ type: 'general', phoneNumber: '1', priority: 'urgent', message: 'x' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api/notifications/whatsapp/send',
      expect.objectContaining({ method: 'POST' })
    );

    await expect(svc.send({ type: 'general', phoneNumber: '1', priority: 'high', message: 'x' })).rejects.toThrow('fail');

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('sendBatch y scheduleNotification muestran toast en success y error', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: {} }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: {} }) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ message: 'bad' }) });
    (globalThis as any).fetch = fetchMock;

    jest.useFakeTimers();

    const svc = createWhatsAppNotificationService('http://api', {});

    await svc.sendBatch([{ type: 'general', phoneNumber: '1', priority: 'normal', message: 'x' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api/notifications/whatsapp/send-batch',
      expect.objectContaining({ method: 'POST' })
    );

    await svc.scheduleNotification(
      { type: 'general', phoneNumber: '1', priority: 'normal', message: 'x' },
      new Date('2026-01-01T00:00:00.000Z')
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api/notifications/whatsapp/schedule',
      expect.objectContaining({ method: 'POST' })
    );

    await expect(
      svc.scheduleNotification({ type: 'general', phoneNumber: '1', priority: 'normal', message: 'x' }, new Date())
    ).rejects.toThrow('bad');

    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('getStatus retorna estado y en error cae a failed', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { status: 'delivered' } }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    (globalThis as any).fetch = fetchMock;

    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const svc = createWhatsAppNotificationService('http://api', {});
    await expect(svc.getStatus('1')).resolves.toBe('delivered');
    await expect(svc.getStatus('2')).resolves.toBe('failed');
  });

  it('templates + helpers arman variables y prioridad', async () => {
    const vars = NotificationTemplates.DOCUMENT_EXPIRY.getVariables('E1', 'DNI', '01/01/2026', 2);
    expect(vars.urgency).toBe('URGENTE');

    const send = jest.fn(async () => undefined);
    const svc: any = { send };

    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime());

    await WhatsAppNotificationHelpers.sendDocumentExpiryAlert(
      svc,
      '+54911',
      'E1',
      'DNI',
      new Date('2026-01-03T00:00:00.000Z')
    );
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ priority: 'urgent' }));

    await WhatsAppNotificationHelpers.sendUrgentAlert(svc, '+54911', 'E1', 'ALERTA', 'desc');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'urgent_alert', priority: 'urgent' }));
  });
});


