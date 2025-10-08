const { NotificationService } = require('../dist/services/notification.service');

jest.mock('../dist/services/system-config.service', () => ({
  SystemConfigService: {
    getConfig: jest.fn().mockImplementation(async (k) => {
      if (k.endsWith('notifications.enabled')) return 'true';
      if (k.endsWith('notifications.windows')) return JSON.stringify({ aviso: {enabled:true,unit:'days',value:30}, alerta:{enabled:true,unit:'days',value:14}, alarma:{enabled:true,unit:'days',value:3} });
      return null;
    }),
  },
}));

describe('NotificationService', () => {
  it('getGlobalEnabled true by default', async () => {
    const en = await NotificationService.getGlobalEnabled(1);
    expect(en).toBe(true);
  });
});
