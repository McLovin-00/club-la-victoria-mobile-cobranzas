const { NotificationService } = require('../dist/services/notification.service');

jest.mock('../dist/services/system-config.service', () => ({
  SystemConfigService: {
    getConfig: jest.fn().mockResolvedValue('true'),
  },
}));

jest.mock('../dist/config/database', () => ({
  prisma: {
    document: { findMany: jest.fn().mockResolvedValue([]) },
    dadorCarga: { findUnique: jest.fn().mockResolvedValue({ phones: [], notifyDadorEnabled: false, notifyDriverEnabled: false }) },
    equipo: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ id:1, dadorCargaId:1, tenantEmpresaId:1 }) },
    equipoCliente: { findMany: jest.fn().mockResolvedValue([]) },
  }
}));

jest.mock('../dist/services/compliance.service', () => ({
  ComplianceService: { evaluateEquipoCliente: jest.fn().mockResolvedValue([]) },
}));

jest.mock('../dist/services/evolution-client.service', () => ({
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
