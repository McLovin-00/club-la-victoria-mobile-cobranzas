import { describe, it, expect } from '@jest/globals';

describe('useWhatsAppNotifications (smoke)', () => {
  it('importa useWhatsAppNotifications sin errores', async () => {
    const module = await import('../useWhatsAppNotifications');
    expect(module.useWhatsAppNotifications).toBeDefined();
    expect(typeof module.useWhatsAppNotifications).toBe('function');
  });
});

