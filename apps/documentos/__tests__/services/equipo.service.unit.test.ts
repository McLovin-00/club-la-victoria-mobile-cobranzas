import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number, code: string) => {
    const e: any = new Error(message);
    e.code = code;
    return e;
  },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { logEquipoChange: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/document-archive.service', () => ({
  DocumentArchiveService: {
    findDocumentsExclusiveToClient: jest.fn(async () => []),
    archiveDocuments: jest.fn(async () => undefined),
  },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: { getEquipoCompliance: jest.fn(async () => ({}) ) },
}));

import { DocumentArchiveService } from '../../src/services/document-archive.service';
import { EquipoService } from '../../src/services/equipo.service';

describe('EquipoService (high coverage)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();

    // default: support both $transaction(fn) and $transaction([ops])
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    });
  });

  it('createEquipoCompleto creates all entities and associates clientes', async () => {
    // EmpresaTransportista: not found -> create
    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce(null);
    prismaMock.empresaTransportista.create.mockResolvedValueOnce({ id: 10, cuit: '20304050607', razonSocial: 'ET' } as any);

    // Chofer/camion/acoplado: not found -> create
    prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
    prismaMock.chofer.create.mockResolvedValueOnce({ id: 20, dni: '12345678', dniNorm: '12345678', nombre: 'A', apellido: 'B', dadorCargaId: 2 } as any);

    prismaMock.camion.findFirst.mockResolvedValueOnce(null);
    prismaMock.camion.create.mockResolvedValueOnce({ id: 30, patente: 'AAA123', patenteNorm: 'AAA123', marca: 'M', modelo: 'X', dadorCargaId: 2 } as any);

    prismaMock.acoplado.findFirst.mockResolvedValueOnce(null);
    prismaMock.acoplado.create.mockResolvedValueOnce({ id: 40, patente: 'BBB234', patenteNorm: 'BBB234', tipo: 'T', dadorCargaId: 2 } as any);

    prismaMock.equipo.create.mockResolvedValueOnce({ id: 99, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() } as any);
    prismaMock.equipoHistory.create.mockResolvedValue({} as any);
    prismaMock.equipoCliente.create.mockResolvedValue({} as any);

    const out = await EquipoService.createEquipoCompleto({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      empresaTransportistaCuit: '20-30405060-7',
      empresaTransportistaNombre: 'ET',
      choferDni: '12.345.678',
      choferNombre: 'A',
      choferApellido: 'B',
      choferPhones: ['1'],
      camionPatente: 'AAA-123',
      camionMarca: 'M',
      camionModelo: 'X',
      acopladoPatente: 'BBB-234',
      acopladoTipo: 'T',
      clienteIds: [7, 8],
    });

    expect(out.id).toBe(99);
    expect(prismaMock.equipoCliente.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.equipoHistory.create).toHaveBeenCalled();
  });

  it('createEquipoCompleto throws on invalid CUIT and duplicated chofer', async () => {
    await expect(EquipoService.createEquipoCompleto({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      empresaTransportistaCuit: '123',
      empresaTransportistaNombre: 'ET',
      choferDni: '12345678',
      camionPatente: 'AAA123',
    } as any)).rejects.toMatchObject({ code: 'CUIT_INVALIDO' });

    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ id: 1 } as any);
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 22 } as any);
    await expect(EquipoService.createEquipoCompleto({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      empresaTransportistaCuit: '20-30405060-7',
      empresaTransportistaNombre: 'ET',
      choferDni: '12345678',
      camionPatente: 'AAA123',
    } as any)).rejects.toMatchObject({ code: 'CHOFER_DUPLICADO' });
  });

  it('rollbackAltaCompleta validates tenant and optionally deletes empresa when no other equipos', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, driverId: 2, truckId: 3, trailerId: 4, empresaTransportistaId: 5 } as any);
    prismaMock.equipoCliente.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.equipoHistory.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.document.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.equipo.delete.mockResolvedValueOnce({} as any);
    prismaMock.chofer.delete.mockResolvedValueOnce({} as any);
    prismaMock.camion.delete.mockResolvedValueOnce({} as any);
    prismaMock.acoplado.delete.mockResolvedValueOnce({} as any);
    prismaMock.equipo.count.mockResolvedValueOnce(0);
    prismaMock.empresaTransportista.delete.mockResolvedValueOnce({} as any);

    const out = await EquipoService.rollbackAltaCompleta({
      tenantEmpresaId: 1,
      equipoId: 1,
      deleteChofer: true,
      deleteCamion: true,
      deleteAcoplado: true,
      deleteEmpresa: true,
    });
    expect(out.success).toBe(true);
    expect(prismaMock.empresaTransportista.delete).toHaveBeenCalled();
  });

  it('create() enforces empresa mismatch, duplicate equipos and component conflicts', async () => {
    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ dadorCargaId: 999 } as any);
    await expect(EquipoService.create({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 1,
      truckId: 2,
      driverDni: '12345678',
      truckPlate: 'AAA123',
      validFrom: new Date(),
      empresaTransportistaId: 10,
    } as any)).rejects.toMatchObject({ code: 'EMPRESA_MISMATCH' });

    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ dadorCargaId: 2 } as any);
    prismaMock.equipo.findFirst.mockResolvedValueOnce({ id: 1 } as any); // existing equipo duplicate check
    await expect(EquipoService.create({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 1,
      truckId: 2,
      driverDni: '12345678',
      truckPlate: 'AAA123',
      trailerPlate: null,
      validFrom: new Date(),
    } as any)).rejects.toMatchObject({ code: 'EQUIPO_DUPLICATE' });

    prismaMock.equipo.findFirst
      .mockResolvedValueOnce(null) // existing duplicate
      .mockResolvedValueOnce({ id: 10 }) // driver in use
      .mockResolvedValueOnce({ id: 11 }) // truck in use
      .mockResolvedValueOnce(null); // trailer in use

    await expect(EquipoService.create({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 1,
      truckId: 2,
      driverDni: '12345678',
      truckPlate: 'AAA123',
      trailerPlate: null,
      validFrom: new Date(),
      forceMove: false,
    } as any)).rejects.toMatchObject({ code: 'COMPONENT_IN_USE' });
  });

  it('updateEquipo applies changes and logs audit/history', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 10,
      truckId: 20,
      trailerId: null,
      empresaTransportistaId: null,
      clientes: [],
    } as any);

    prismaMock.chofer.findUnique.mockResolvedValueOnce({ id: 11, dadorCargaId: 2, dniNorm: '111' } as any);
    prismaMock.camion.findUnique.mockResolvedValueOnce({ id: 21, dadorCargaId: 2, patenteNorm: 'AAA123' } as any);
    prismaMock.acoplado.findUnique.mockResolvedValueOnce({ id: 31, dadorCargaId: 2, patenteNorm: 'BBB234' } as any);
    prismaMock.empresaTransportista.findUnique.mockResolvedValueOnce({ id: 41, dadorCargaId: 2 } as any);

    prismaMock.equipo.update.mockResolvedValueOnce({ id: 1 } as any);
    prismaMock.equipoHistory.create.mockResolvedValueOnce({} as any);

    const out = await EquipoService.updateEquipo({
      equipoId: 1,
      usuarioId: 9,
      tenantEmpresaId: 1,
      choferId: 11,
      camionId: 21,
      acopladoId: 31,
      empresaTransportistaId: 41,
    });
    expect(out.id).toBe(1);
    expect(prismaMock.equipoHistory.create).toHaveBeenCalled();
  });

  it('removeClienteFromEquipo archives exclusive docs and closes association', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1 } as any);
    prismaMock.equipoCliente.count.mockResolvedValueOnce(2);
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ clienteId: 99 }] as any);
    (DocumentArchiveService.findDocumentsExclusiveToClient as jest.Mock).mockResolvedValueOnce([100, 101]);

    prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ asignadoDesde: new Date('2025-01-01') } as any);
    prismaMock.equipoCliente.update.mockResolvedValueOnce({} as any);

    const out = await EquipoService.removeClienteFromEquipo({ equipoId: 1, clienteId: 2, usuarioId: 9, tenantEmpresaId: 1 });
    expect(out.removed).toBe(true);
    expect(DocumentArchiveService.archiveDocuments).toHaveBeenCalled();
  });

  it('transferirEquipo validates dador and writes history', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2 } as any);
    prismaMock.dadorCarga.findUnique.mockResolvedValueOnce({ id: 3, tenantEmpresaId: 1 } as any);
    prismaMock.equipo.update.mockResolvedValueOnce({ id: 1, dadorCargaId: 3 } as any);
    prismaMock.equipoHistory.create.mockResolvedValueOnce({} as any);

    const out = await EquipoService.transferirEquipo({ equipoId: 1, nuevoDadorCargaId: 3, usuarioId: 9, tenantEmpresaId: 1, motivo: 'x' });
    expect(out.dadorCargaId).toBe(3);
    expect(prismaMock.equipoHistory.create).toHaveBeenCalled();
  });

  it('getRequisitosEquipo consolidates requirements and maps current doc status', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({
      id: 1,
      tenantEmpresaId: 1,
      driverId: 10,
      truckId: 20,
      trailerId: null,
      empresaTransportistaId: 40,
      clientes: [{ clienteId: 7, cliente: { id: 7, razonSocial: 'C1' } }],
    } as any);

    prismaMock.clienteDocumentRequirement.findMany.mockResolvedValueOnce([
      { templateId: 1, entityType: 'CHOFER', obligatorio: true, diasAnticipacion: 30, template: { name: 'T1' }, cliente: { id: 7, razonSocial: 'C1' } },
      { templateId: 1, entityType: 'CHOFER', obligatorio: false, diasAnticipacion: 30, template: { name: 'T1' }, cliente: { id: 7, razonSocial: 'C1' } },
    ] as any);

    prismaMock.document.findFirst.mockResolvedValueOnce({ id: 55, status: 'APROBADO', expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000) } as any);

    const out = await EquipoService.getRequisitosEquipo(1, 1);
    expect(out[0].templateName).toBe('T1');
    expect(out[0].documentoActual.id).toBe(55);
  });
});


