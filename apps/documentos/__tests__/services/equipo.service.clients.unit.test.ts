import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, statusCode = 500, code = 'ERR') => {
    const err: any = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    return err;
  },
}));

const auditMock = {
  logEquipoChange: jest.fn(async () => undefined),
};
jest.mock('../../src/services/audit.service', () => ({
  AuditService: auditMock,
}));

const archiveMock = {
  findDocumentsExclusiveToClient: jest.fn(async () => [] as number[]),
  archiveDocuments: jest.fn(async () => undefined),
};
jest.mock('../../src/services/document-archive.service', () => ({
  DocumentArchiveService: archiveMock,
}));

import { EquipoService } from '../../src/services/equipo.service';

describe('EquipoService (cliente management + requisitos + transfer)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
  });

  it('addClienteToEquipo: should create association and audit; validate not-found/duplicate', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);
    await expect(EquipoService.addClienteToEquipo({ equipoId: 1, clienteId: 2, usuarioId: 1, tenantEmpresaId: 1 })).rejects.toMatchObject({ code: 'EQUIPO_NOT_FOUND' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1 } as any);
    prismaMock.cliente.findUnique.mockResolvedValueOnce(null);
    await expect(EquipoService.addClienteToEquipo({ equipoId: 1, clienteId: 2, usuarioId: 1, tenantEmpresaId: 1 })).rejects.toMatchObject({ code: 'CLIENTE_NOT_FOUND' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1 } as any);
    prismaMock.cliente.findUnique.mockResolvedValueOnce({ id: 2, razonSocial: 'C' } as any);
    prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ equipoId: 1 } as any);
    await expect(EquipoService.addClienteToEquipo({ equipoId: 1, clienteId: 2, usuarioId: 1, tenantEmpresaId: 1 })).rejects.toMatchObject({ code: 'CLIENTE_YA_ASOCIADO' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1 } as any);
    prismaMock.cliente.findUnique.mockResolvedValueOnce({ id: 2, razonSocial: 'Cliente SA' } as any);
    prismaMock.equipoCliente.findFirst.mockResolvedValueOnce(null);
    prismaMock.equipoCliente.create.mockResolvedValueOnce({ id: 99 } as any);

    const assoc = await EquipoService.addClienteToEquipo({ equipoId: 1, clienteId: 2, usuarioId: 1, tenantEmpresaId: 1 });
    expect(assoc).toMatchObject({ id: 99 });
    expect(auditMock.logEquipoChange).toHaveBeenCalledWith(expect.objectContaining({ accion: 'AGREGAR_CLIENTE' }));
  });

  it('removeClienteFromEquipo: should enforce min client, archive exclusives, and close association', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1 } as any);
    prismaMock.equipoCliente.count.mockResolvedValueOnce(1);
    await expect(EquipoService.removeClienteFromEquipo({ equipoId: 1, clienteId: 2, usuarioId: 1, tenantEmpresaId: 1 })).rejects.toMatchObject({ code: 'MIN_CLIENTE_REQUIRED' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1 } as any);
    prismaMock.equipoCliente.count.mockResolvedValueOnce(2);
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ clienteId: 3 }] as any);
    archiveMock.findDocumentsExclusiveToClient.mockResolvedValueOnce([10, 11]);
    prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ asignadoDesde: new Date('2024-01-01') } as any);
    prismaMock.equipoCliente.update.mockResolvedValueOnce({} as any);

    const res = await EquipoService.removeClienteFromEquipo({ equipoId: 1, clienteId: 2, usuarioId: 1, tenantEmpresaId: 1 });
    expect(res).toEqual({ removed: true, archivedDocuments: 2 });
    expect(archiveMock.archiveDocuments).toHaveBeenCalledWith(expect.objectContaining({ documentIds: [10, 11], reason: 'CLIENTE_REMOVIDO' }));
    expect(auditMock.logEquipoChange).toHaveBeenCalledWith(expect.objectContaining({ accion: 'QUITAR_CLIENTE' }));
  });

  it('transferirEquipo: should validate and update + write history', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 5 } as any);
    await expect(EquipoService.transferirEquipo({ equipoId: 1, nuevoDadorCargaId: 5, usuarioId: 1, tenantEmpresaId: 1 })).rejects.toMatchObject({ code: 'MISMO_DADOR' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 5 } as any);
    prismaMock.dadorCarga.findUnique.mockResolvedValueOnce(null);
    await expect(EquipoService.transferirEquipo({ equipoId: 1, nuevoDadorCargaId: 6, usuarioId: 1, tenantEmpresaId: 1 })).rejects.toMatchObject({ code: 'DADOR_INVALIDO' });

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 5 } as any);
    prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ id: 6, tenantEmpresaId: 1 } as any);
    prismaMock.equipo.update.mockResolvedValueOnce({ id: 1, dadorCargaId: 6 } as any);
    prismaMock.equipoHistory.create.mockResolvedValueOnce({} as any);

    const out = await EquipoService.transferirEquipo({ equipoId: 1, nuevoDadorCargaId: 6, usuarioId: 1, tenantEmpresaId: 1, motivo: 'm' });
    expect(out).toMatchObject({ id: 1, dadorCargaId: 6 });
    expect(auditMock.logEquipoChange).toHaveBeenCalledWith(expect.objectContaining({ accion: 'TRANSFERIR' }));
    expect(prismaMock.equipoHistory.create).toHaveBeenCalled();
  });

  it('getRequisitosEquipo: should consolidate requirements and attach current document state', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      driverId: 10,
      truckId: 20,
      trailerId: null,
      empresaTransportistaId: null,
      clientes: [{ clienteId: 2 }, { clienteId: 3 }],
    } as any);

    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
      { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30, template: { name: 'DNI' }, cliente: { id: 2, razonSocial: 'C2' } },
      { templateId: 1, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 30, template: { name: 'DNI' }, cliente: { id: 3, razonSocial: 'C3' } },
    ] as any);

    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 99, status: 'APROBADO', expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) } as any);

    const out = await EquipoService.getRequisitosEquipo(1, 1);
    expect(out[0]).toEqual(expect.objectContaining({ templateId: 1, entityType: 'CHOFER', obligatorio: true, entityId: 10 }));
    expect(out[0].documentoActual).toEqual(expect.objectContaining({ id: 99, estado: expect.any(String) }));
  });
});


