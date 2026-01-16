import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn() },
}));

jest.mock('../../src/services/evolution-client.service', () => ({
  EvolutionClient: { sendText: jest.fn(async () => ({ ok: true, status: 200 })) },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: { evaluateEquipoCliente: jest.fn(async () => []) },
}));

import { SystemConfigService } from '../../src/services/system-config.service';
import { EvolutionClient } from '../../src/services/evolution-client.service';
import { ComplianceService } from '../../src/services/compliance.service';
import { NotificationService } from '../../src/services/notification.service';

describe('NotificationService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('render interpolates params and shouldDeduplicate uses today window', async () => {
    expect(NotificationService.render('Hola {{a}}', { a: 'x' })).toBe('Hola x');
    prismaMock.notificationLog.findFirst.mockResolvedValueOnce(null);
    await expect(NotificationService.shouldDeduplicate({ documentId: 1, type: 'aviso', audience: 'CHOFER' as any })).resolves.toBe(false);
    prismaMock.notificationLog.findFirst.mockResolvedValueOnce({ id: 1 } as any);
    await expect(NotificationService.shouldDeduplicate({ documentId: 1, type: 'aviso', audience: 'CHOFER' as any })).resolves.toBe(true);
  });

  it('send skips when deduplicated and logs when sent', async () => {
    prismaMock.notificationLog.findFirst.mockResolvedValueOnce({ id: 1 } as any);
    await NotificationService.send('1', 'x', { tenantId: 1, audience: 'CHOFER', type: 'aviso', templateKey: 'k', documentId: 1 });
    expect(EvolutionClient.sendText).not.toHaveBeenCalled();

    prismaMock.notificationLog.findFirst.mockResolvedValueOnce(null);
    prismaMock.notificationLog.create.mockResolvedValueOnce({} as any);
    await NotificationService.send('1', 'x', { tenantId: 1, dadorId: 2, audience: 'CHOFER', type: 'aviso', templateKey: 'k', documentId: 1 });
    expect(EvolutionClient.sendText).toHaveBeenCalled();
    expect(prismaMock.notificationLog.create).toHaveBeenCalled();
  });

  it('checkExpirations processes docs and sends to chofer/dador based on config + phones', async () => {
    (SystemConfigService.getConfig as jest.Mock)
      .mockResolvedValueOnce('true') // tenant enabled
      .mockResolvedValueOnce(JSON.stringify({ aviso: { enabled: true, unit: 'days', value: 30 }, alerta: { enabled: false, unit: 'days', value: 14 }, alarma: { enabled: false, unit: 'days', value: 3 } })) // windows
      .mockResolvedValueOnce(null) // templates tenant
      .mockResolvedValueOnce(null); // templates global

    const exp = new Date(Date.now() + 10 * 24 * 3600 * 1000);
    prismaMock.document.findMany.mockResolvedValueOnce([
      { id: 1, tenantEmpresaId: 1, dadorCargaId: 2, entityType: 'CHOFER', entityId: 10, expiresAt: exp, template: { name: 'LICENCIA' } },
    ] as any);

    prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ razonSocial: 'D', phones: ['d1'], notifyDadorEnabled: true, notifyDriverEnabled: true } as any);
    prismaMock.chofer.findUnique.mockResolvedValueOnce({ nombre: 'N', apellido: 'A', dni: '123', phones: ['c1', 'c2'] } as any);

    prismaMock.notificationLog.findFirst.mockResolvedValue(null as any);
    prismaMock.notificationLog.create.mockResolvedValue({} as any);

    const sent = await NotificationService.checkExpirations(1);
    expect(sent).toBeGreaterThan(0);
    expect(EvolutionClient.sendText).toHaveBeenCalled();
  });

  it('checkMissingForEquipo uses ComplianceService and sends to dador when there are missing requirements', async () => {
    (SystemConfigService.getConfig as jest.Mock).mockResolvedValueOnce('true'); // enabled
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, dadorCargaId: 2, tenantEmpresaId: 1 } as any);
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ clienteId: 7 }] as any);
    (ComplianceService.evaluateEquipoCliente as jest.Mock).mockResolvedValueOnce([{ state: 'FALTANTE' }] as any);
    prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ phones: ['d1'], notifyDadorEnabled: true, notifyDriverEnabled: true } as any);

    const spy = jest.spyOn(NotificationService, 'send').mockResolvedValueOnce(undefined);
    const sent = await NotificationService.checkMissingForEquipo(1, 1);
    expect(sent).toBe(1);
    expect(spy).toHaveBeenCalled();
  });
});


