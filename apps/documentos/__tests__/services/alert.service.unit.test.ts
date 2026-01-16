import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/status.service', () => ({
  StatusService: {
    getEntitiesWithAlarms: jest.fn(),
  },
}));

import { AlertService } from '../../src/services/alert.service';
import { StatusService } from '../../src/services/status.service';
import { AppLogger } from '../../src/config/logger';

describe('AlertService', () => {
  beforeEach(() => {
    resetPrismaMock();
    // Important: AlertService is a singleton and some tests spyOn instance methods.
    // restoreAllMocks ensures spies/mocked implementations don't leak across tests.
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('getInstance: should be a singleton', () => {
    const a = AlertService.getInstance();
    const b = AlertService.getInstance();
    expect(a).toBe(b);
  });

  it('processDocumentRejected: should warn and return when document not found', async () => {
    prismaMock.document.findUnique.mockResolvedValue(null);
    const svc = AlertService.getInstance();
    const sendSpy = jest.spyOn(svc as any, 'sendAlert');

    await svc.processDocumentRejected(123);

    expect(AppLogger.warn).toHaveBeenCalled();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('processDocumentRejected: should build alert and call sendAlert when found', async () => {
    prismaMock.document.findUnique.mockResolvedValue({
      id: 1,
      entityType: 'CHOFER',
      entityId: 10,
      dadorCargaId: 77,
      validationData: { errors: [{ code: 'X' }] },
      template: { name: 'DNI' },
    });
    const svc = AlertService.getInstance();
    const sendSpy = jest.spyOn(svc as any, 'sendAlert');

    await svc.processDocumentRejected(1);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'document_rejected',
        entityType: 'CHOFER',
        entityId: 10,
        empresaId: 77,
        priority: 'high',
        data: expect.objectContaining({ documentId: 1, templateName: 'DNI' }),
      })
    );
  });

  it('processExpiredDocuments: should update status to VENCIDO and send alerts per doc', async () => {
    prismaMock.document.findMany.mockResolvedValue([
      { id: 1, entityType: 'CAMION', entityId: 2, dadorCargaId: 10, expiresAt: new Date('2024-01-01'), template: { name: 'RTO' } },
      { id: 2, entityType: 'CHOFER', entityId: 3, dadorCargaId: 10, expiresAt: new Date('2024-01-01'), template: { name: 'DNI' } },
    ] as any);
    prismaMock.document.update.mockResolvedValue({} as any);

    const svc = AlertService.getInstance();
    const sendSpy = jest.spyOn(svc as any, 'sendAlert');

    await svc.processExpiredDocuments();

    expect(prismaMock.document.update).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledTimes(2);
    expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('documentos marcados como vencidos'));
  });

  it('processRedStatusEntities: should query empresas and alert entities with alarms', async () => {
    prismaMock.document.findMany.mockResolvedValue([{ dadorCargaId: 10 }, { dadorCargaId: 11 }] as any);
    (StatusService as any).getEntitiesWithAlarms
      .mockResolvedValueOnce([{ entityType: 'CHOFER', entityId: 1, status: 'ROJO', documentCount: 3 }])
      .mockResolvedValueOnce([]);

    const svc = AlertService.getInstance();
    const sendSpy = jest.spyOn(svc as any, 'sendAlert');

    await svc.processRedStatusEntities();

    expect((StatusService as any).getEntitiesWithAlarms).toHaveBeenCalledWith(10);
    expect((StatusService as any).getEntitiesWithAlarms).toHaveBeenCalledWith(11);
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'entity_red_status', empresaId: 10 }));
  });

  it('runScheduledChecks: should call expired + red checks in parallel', async () => {
    const svc = AlertService.getInstance();
    const expiredSpy = jest.spyOn(svc, 'processExpiredDocuments' as any).mockResolvedValue(undefined);
    const redSpy = jest.spyOn(svc, 'processRedStatusEntities' as any).mockResolvedValue(undefined);

    await svc.runScheduledChecks();

    expect(expiredSpy).toHaveBeenCalled();
    expect(redSpy).toHaveBeenCalled();
    expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('Verificaciones programadas completadas'));
  });

  it('sendAlert: should return early when config disabled (default)', async () => {
    const svc = AlertService.getInstance();
    const logSpy = jest.spyOn(svc as any, 'logAlert');

    await (svc as any).sendAlert({
      type: 'document_expired',
      entityType: 'CHOFER',
      entityId: 1,
      empresaId: 1,
      message: 'x',
      priority: 'low',
      data: {},
    });

    expect(AppLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Alertas deshabilitadas'));
    expect(logSpy).not.toHaveBeenCalled();
  });
  it('sendAlert: should log and call logAlert when config is enabled', async () => {
    const svc = AlertService.getInstance();
    // Spy on private method getAlertConfig to return enabled: true
    jest.spyOn(svc as any, 'getAlertConfig').mockResolvedValue({ enabled: true, empresaId: 1 });
    const logSpy = jest.spyOn(svc as any, 'logAlert');

    await (svc as any).sendAlert({
      type: 'document_expired',
      entityType: 'CHOFER',
      entityId: 1,
      empresaId: 1,
      message: 'test',
      priority: 'low',
      data: {},
    });

    expect(AppLogger.info).toHaveBeenCalledWith(expect.stringContaining('ALERTA: test'), expect.any(Object));
    expect(logSpy).toHaveBeenCalled();
  });

  describe('Error handling', () => {
    it('processDocumentRejected: should catch errors', async () => {
      prismaMock.document.findUnique.mockRejectedValue(new Error('DB Error'));
      const svc = AlertService.getInstance();
      await svc.processDocumentRejected(1);
      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error procesando alerta'), expect.any(Error));
    });

    it('processExpiredDocuments: should catch errors', async () => {
      prismaMock.document.findMany.mockRejectedValue(new Error('DB Error'));
      const svc = AlertService.getInstance();
      await svc.processExpiredDocuments();
      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error procesando documentos vencidos'), expect.any(Error));
    });

    it('processRedStatusEntities: should catch errors', async () => {
      prismaMock.document.findMany.mockRejectedValue(new Error('DB Error'));
      const svc = AlertService.getInstance();
      await svc.processRedStatusEntities();
      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error procesando entidades'), expect.any(Error));
    });

    it('runScheduledChecks: should catch errors', async () => {
      const svc = AlertService.getInstance();
      jest.spyOn(svc, 'processExpiredDocuments').mockRejectedValue(new Error('Fail'));

      await svc.runScheduledChecks();
      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error en verificaciones programadas'), expect.any(Error));
    });

    it('sendAlert: should catch errors', async () => {
      const svc = AlertService.getInstance();
      jest.spyOn(svc as any, 'getAlertConfig').mockRejectedValue(new Error('Config Error'));

      await (svc as any).sendAlert({} as any);
      expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error enviando alerta'), expect.any(Error));
    });
  });
});


