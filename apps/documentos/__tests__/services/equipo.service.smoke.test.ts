/**
 * Propósito: Smoke tests de `EquipoService` para subir coverage (sin DB real).
 * Estrategia: ejecutar paths principales (create completo + ensure*) con mocks de Prisma.
 */

import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/audit.service', () => ({
  AuditService: { log: jest.fn() },
}));

jest.mock('../../src/services/document-archive.service', () => ({
  DocumentArchiveService: { archiveEquipoDocuments: jest.fn() },
}));

jest.mock('../../src/services/compliance.service', () => ({
  ComplianceService: {
    evaluateBatchEquiposCliente: jest.fn().mockResolvedValue(new Map()),
    evaluateEquipoClienteDetailed: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn().mockResolvedValue(null) },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn().mockResolvedValue(undefined) },
}));

import { EquipoService } from '../../src/services/equipo.service';

describe('EquipoService (smoke)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    // Prisma mock por defecto: evitar nulls inesperados
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
  });

  it('ensure* crea entidades cuando no existen', async () => {
    prismaMock.chofer.findFirst.mockResolvedValue(null);
    prismaMock.chofer.create.mockResolvedValue({ id: 10 });

    prismaMock.camion.findFirst.mockResolvedValue(null);
    prismaMock.camion.create.mockResolvedValue({ id: 20 });

    prismaMock.acoplado.findFirst.mockResolvedValue(null);
    prismaMock.acoplado.create.mockResolvedValue({ id: 30 });

    prismaMock.empresaTransportista.findFirst.mockResolvedValue(null);
    prismaMock.empresaTransportista.create.mockResolvedValue({ id: 40 });

    await expect(EquipoService.ensureChofer(1, 1, '12.345.678', ['+5491111111111'])).resolves.toBe(10);
    await expect(EquipoService.ensureCamion(1, 1, 'AB-123-CD')).resolves.toBe(20);
    await expect(EquipoService.ensureAcoplado(1, 1, 'AA 001 BB')).resolves.toBe(30);
    await expect(EquipoService.ensureEmpresaTransportista(1, 1, '30-71234567-8', 'Transporte SA')).resolves.toBe(40);
  });

  it('createEquipoCompleto crea empresa/chofer/camion/acoplado y el equipo', async () => {
    // Empresa por CUIT: no existe => create
    prismaMock.empresaTransportista.findFirst.mockResolvedValue(null);
    prismaMock.empresaTransportista.create.mockResolvedValue({ id: 401, cuit: '30712345678', razonSocial: 'Transp X' });

    // Chofer/camión/acoplado: no existen => create
    prismaMock.chofer.findFirst.mockResolvedValue(null);
    prismaMock.chofer.create.mockResolvedValue({ id: 101, dni: '12345678', nombre: 'Juan', apellido: 'Perez' });

    prismaMock.camion.findFirst.mockResolvedValue(null);
    prismaMock.camion.create.mockResolvedValue({ id: 201, patente: 'AB123CD', marca: 'Scania', modelo: 'R450' });

    prismaMock.acoplado.findFirst.mockResolvedValue(null);
    prismaMock.acoplado.create.mockResolvedValue({ id: 301, patente: 'AA001BB', tipo: 'Semi' });

    prismaMock.equipo.create.mockResolvedValue({
      id: 1,
      validFrom: new Date(),
      validTo: null,
      estado: 'activa',
      createdAt: new Date(),
    });
    prismaMock.equipoHistory.create.mockResolvedValue({ id: 1 });
    prismaMock.equipoCliente.create.mockResolvedValue({ id: 1 });

    const result = await EquipoService.createEquipoCompleto({
      tenantEmpresaId: 1,
      dadorCargaId: 1,
      empresaTransportistaCuit: '30-71234567-8',
      empresaTransportistaNombre: 'Transp X',
      choferDni: '12.345.678',
      choferNombre: 'Juan',
      choferApellido: 'Perez',
      choferPhones: ['+5491111111111'],
      camionPatente: 'AB-123-CD',
      camionMarca: 'Scania',
      camionModelo: 'R450',
      acopladoPatente: 'AA 001 BB',
      acopladoTipo: 'Semi',
      clienteIds: [1],
    });

    expect(result).toEqual(expect.objectContaining({ id: 1, dadorCargaId: 1, tenantEmpresaId: 1 }));
  });

  it('rollbackAltaCompleta retorna error si el equipo no existe', async () => {
    prismaMock.equipo.findUnique.mockResolvedValue(null);
    await expect(
      EquipoService.rollbackAltaCompleta({ tenantEmpresaId: 1, equipoId: 999, deleteChofer: true })
    ).rejects.toBeDefined();
  });

  it('create lanza error si el equipo ya existe (duplicado)', async () => {
    // No validamos empresaTransportistaId
    prismaMock.equipo.findFirst.mockResolvedValueOnce({ id: 99 });

    await expect(
      EquipoService.create({
        tenantEmpresaId: 1,
        dadorCargaId: 1,
        driverId: 10,
        truckId: 20,
        trailerId: null,
        driverDni: '12345678',
        truckPlate: 'AB123CD',
        trailerPlate: null,
        validFrom: new Date(),
      })
    ).rejects.toBeDefined();
  });

  it('createFromIdentifiers invoca create y retorna el equipo creado', async () => {
    // ensure* con existentes
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 10 });
    prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 20 });
    prismaMock.acoplado.findFirst.mockResolvedValueOnce({ id: 30 });
    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ id: 40 });

    const createSpy = jest.spyOn(EquipoService, 'create').mockResolvedValueOnce({ id: 1 } as any);

    const result = await EquipoService.createFromIdentifiers({
      tenantEmpresaId: 1,
      dadorCargaId: 1,
      dniChofer: '12345678',
      patenteTractor: 'AB123CD',
      patenteAcoplado: 'AA001BB',
      empresaTransportistaCuit: '30712345678',
      empresaTransportistaNombre: 'Transp X',
    });

    expect(result).toEqual(expect.objectContaining({ id: 1 }));
    expect(createSpy).toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it('attachComponents actualiza componentes y reabre equipo si estaba cerrado', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 1 });
    // closeOriginEquipo/detachTrailerFromOrigin: no hay origen
    prismaMock.equipo.findFirst.mockResolvedValue(null);

    // 1er update: aplica updates, devolvemos equipo "cerrado" para disparar reopen
    prismaMock.equipo.update
      .mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, estado: 'finalizada', driverId: 10, truckId: 20, validTo: new Date() } as any)
      // 2do update: reopen
      .mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, estado: 'activa', driverId: 10, truckId: 20, validTo: null } as any);

    prismaMock.equipoHistory.create.mockResolvedValue({ id: 1 });

    const result = await EquipoService.attachComponents(1, 1, { driverId: 10, truckId: 20, trailerId: 30 });

    expect(result).toEqual(expect.objectContaining({ id: 1, estado: 'activa' }));
    expect(prismaMock.equipo.update).toHaveBeenCalled();
    expect(prismaMock.equipoHistory.create).toHaveBeenCalled();
  });

  it('detachComponents permite desasociar trailer y actualiza equipo', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1 });
    prismaMock.equipo.update.mockResolvedValueOnce({ id: 1, trailerId: null, trailerPlateNorm: null } as any);

    const result = await EquipoService.detachComponents(1, 1, { trailer: true });

    expect(result).toEqual(expect.objectContaining({ id: 1, trailerId: null }));
    expect(prismaMock.equipo.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { trailerId: null, trailerPlateNorm: null } })
    );
  });
});


