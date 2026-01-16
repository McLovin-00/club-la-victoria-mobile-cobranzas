import { describe, it, expect } from '@jest/globals';

describe('WhatsAppNotificationManager (smoke)', () => {
  it('importa WhatsAppNotificationManager sin errores', async () => {
    const module = await import('../WhatsAppNotificationManager');
    expect(module.default || module.WhatsAppNotificationManager).toBeDefined();
  });
});

