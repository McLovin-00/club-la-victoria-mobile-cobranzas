import { describe, it, expect } from '@jest/globals';

describe('Transportistas Components (smoke)', () => {
  it('importa WhatsAppNotificationManager sin errores', async () => {
    await expect(import('../WhatsAppNotificationManager')).resolves.toBeDefined();
  });

  it('importa CalendarioInteligente sin errores', async () => {
    await expect(import('../CalendarioInteligente')).resolves.toBeDefined();
  });

  it('importa CalendarView sin errores', async () => {
    await expect(import('../CalendarView')).resolves.toBeDefined();
  });

  it('importa PreferenciasApp sin errores', async () => {
    await expect(import('../PreferenciasApp')).resolves.toBeDefined();
  });
});
