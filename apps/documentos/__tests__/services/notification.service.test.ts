/**
 * Tests unitarios para NotificationService
 * Alineados a la implementación actual (notificaciones vía Evolution + logs en DB).
 */

// Mock Prisma mínimo para este servicio.
const prismaMock = {
  notificationLog: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: {
    getConfig: jest.fn(),
  },
}));

jest.mock('../../src/services/evolution-client.service', () => ({
  EvolutionClient: {
    sendText: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

import { NotificationService } from '../../src/services/notification.service';
import { SystemConfigService } from '../../src/services/system-config.service';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SystemConfigService.getConfig as jest.Mock).mockReset();
  });

  describe('render', () => {
    it('reemplaza placeholders {{ }}', () => {
      const result = NotificationService.render('Hola {{nombre}} - {{n}}', { nombre: 'Juan', n: 3 });
      expect(result).toBe('Hola Juan - 3');
    });
  });

  describe('shouldDeduplicate', () => {
    it('retorna true si ya existe log hoy', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue({ id: 1 });
      await expect(NotificationService.shouldDeduplicate({ type: 'AVISO', audience: 'CHOFER', documentId: 1 })).resolves.toBe(true);
    });

    it('retorna false si no hay log', async () => {
      prismaMock.notificationLog.findFirst.mockResolvedValue(null);
      await expect(NotificationService.shouldDeduplicate({ type: 'AVISO', audience: 'CHOFER', documentId: 1 })).resolves.toBe(false);
    });
  });

  describe('getGlobalEnabled', () => {
    it('prioriza config por tenant si existe', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce('true')  // tenant override
        .mockResolvedValueOnce('false'); // fallback global

      await expect(NotificationService.getGlobalEnabled(1)).resolves.toBe(true);
    });

    it('usa fallback global si no hay override', async () => {
      (SystemConfigService.getConfig as jest.Mock)
        .mockResolvedValueOnce(null)   // tenant override
        .mockResolvedValueOnce('true'); // global

      const result = await NotificationService.getGlobalEnabled(1);
      expect(SystemConfigService.getConfig).toHaveBeenNthCalledWith(1, 'tenant:1:notifications.enabled');
      expect(SystemConfigService.getConfig).toHaveBeenNthCalledWith(2, 'notifications.enabled');
      expect(result).toBe(true);

      // Ya validado con `result` y las llamadas.
    });
  });
});



