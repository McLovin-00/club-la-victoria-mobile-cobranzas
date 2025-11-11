jest.mock('../src/services/system-config.service', () => ({
  SystemConfigService: {
    getConfig: jest.fn().mockImplementation((key: string) => {
      if (String(key).includes('notifications.enabled')) return Promise.resolve('true');
      if (String(key).includes('notifications.windows')) {
        return Promise.resolve(JSON.stringify({
          aviso: { enabled: true, unit: 'days', value: 30 },
          alerta: { enabled: true, unit: 'days', value: 14 },
          alarma: { enabled: true, unit: 'days', value: 3 },
        }));
      }
      if (String(key).includes('notifications.templates')) return Promise.resolve(null);
      return Promise.resolve(null);
    }),
  },
}));
const { NotificationService } = require('../src/services/notification.service');

jest.mock('../src/config/database', () => ({
  prisma: {
    document: { findMany: jest.fn().mockResolvedValue([]) },
    dadorCarga: { findUnique: jest.fn().mockResolvedValue({ phones: [], notifyDadorEnabled: false, notifyDriverEnabled: false }) },
    equipo: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ id:1, dadorCargaId:1, tenantEmpresaId:1 }) },
    equipoCliente: { findMany: jest.fn().mockResolvedValue([]) },
  }
}));

jest.mock('../src/services/compliance.service', () => ({
  ComplianceService: { evaluateEquipoCliente: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../src/services/evolution-client.service', () => ({
  EvolutionClient: { sendText: jest.fn().mockResolvedValue({ ok: true }) },
}));

describe('NotificationService flows', () => {
  it('checkExpirations no-op with empty docs', async () => {
    const n = await NotificationService.checkExpirations(1);
    expect(typeof n).toBe('number');
  });

  it('checkMissingDocs no-op with empty equipos', async () => {
    const n = await NotificationService.checkMissingDocs(1);
    expect(typeof n).toBe('number');
  });
});
