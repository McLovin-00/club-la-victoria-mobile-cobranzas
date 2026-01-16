let clientMock: any = {};

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => clientMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { AuditService } from '../../src/services/audit.service';
import { AppLogger } from '../../src/config/logger';

describe('AuditService', () => {
  beforeEach(() => {
    clientMock = {};
    jest.clearAllMocks();
  });

  it('log: should attempt persistence when auditLog model exists', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    clientMock = { auditLog: { create } };

    await AuditService.log({
      tenantEmpresaId: 1,
      userId: 2,
      method: 'POST',
      path: '/x',
      statusCode: 200,
      action: 'A',
      entityType: 'E',
      entityId: 3,
      details: { ok: true },
    });

    expect(AppLogger.info).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantEmpresaId: 1,
          accion: 'A',
          userId: 2,
          entityId: 3,
          statusCode: 200,
        }),
      })
    );
  });

  it('log: should not throw if persistence fails (warn only)', async () => {
    clientMock = { auditLog: { create: jest.fn().mockRejectedValue(new Error('db down')) } };

    await expect(
      AuditService.log({ method: 'GET', path: '/x', statusCode: 200 })
    ).resolves.toBeUndefined();

    expect(AppLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Audit persistence failed'), expect.any(Object));
  });

  it('logEquipoChange: should persist when equipoAuditLog exists and stringify values', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    clientMock = { equipoAuditLog: { create } };

    await AuditService.logEquipoChange({
      equipoId: 1,
      usuarioId: 2,
      accion: 'EDITAR',
      valorAnterior: { a: 1 },
      valorNuevo: { a: 2 },
      motivo: 'm',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          equipoId: 1,
          usuarioId: 2,
          accion: 'EDITAR',
          valorAnterior: JSON.stringify({ a: 1 }),
          valorNuevo: JSON.stringify({ a: 2 }),
          motivo: 'm',
        }),
      })
    );
  });

  it('logEquipoChange: should catch and log error on failure', async () => {
    clientMock = { equipoAuditLog: { create: jest.fn().mockRejectedValue(new Error('boom')) } };
    await AuditService.logEquipoChange({ equipoId: 1, usuarioId: 1, accion: 'ELIMINAR' });
    expect(AppLogger.error).toHaveBeenCalled();
  });

  it('getEquipoHistory: should return history when available, otherwise []', async () => {
    clientMock = { equipoAuditLog: { findMany: jest.fn().mockResolvedValue([{ id: 1 }]) } };
    await expect(AuditService.getEquipoHistory(1)).resolves.toEqual([{ id: 1 }]);

    clientMock = {};
    await expect(AuditService.getEquipoHistory(1)).resolves.toEqual([]);
  });
});


