import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

const queueServiceMock = {
  addMissingCheckForEquipo: jest.fn(),
};
const systemConfigMock = {
  getConfig: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: queueServiceMock,
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: systemConfigMock,
}));

import { EquipoService } from '../../src/services/equipo.service';

type EquipoUpdatePayload = {
  id: number;
  estado?: string | null;
  validTo?: Date | null;
  driverId?: number | null;
  truckId?: number | null;
};

describe('EquipoService attach + ensure helpers', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    queueServiceMock.addMissingCheckForEquipo.mockResolvedValue(undefined);
    systemConfigMock.getConfig.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    });
  });

  it('attachComponents throws when equipo missing or no changes', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce(null);

    await expect(EquipoService.attachComponents(1, 1, {})).rejects.toThrow('Equipo no encontrado');

    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2 });

    await expect(EquipoService.attachComponents(1, 1, {})).rejects.toThrow('Sin cambios');
  });

  it('attachComponents resolves driver/truck by identifiers, records history swaps, and reopens equipo', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dadorCargaId: 2 });
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 10 });
    prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 20 });

    prismaMock.equipo.findFirst
      .mockResolvedValueOnce({ id: 7 })
      .mockResolvedValueOnce({ id: 8 });

    prismaMock.equipo.update
      .mockResolvedValueOnce({ id: 7 } as EquipoUpdatePayload)
      .mockResolvedValueOnce({ id: 8 } as EquipoUpdatePayload)
      .mockResolvedValueOnce({ id: 1, estado: 'finalizada', validTo: new Date(), driverId: 10, truckId: 20 })
      .mockResolvedValueOnce({ id: 1, estado: 'activa', validTo: new Date(), driverId: 10, truckId: 20 })
      .mockResolvedValueOnce({ id: 1, estado: 'activa', validTo: null, driverId: 10, truckId: 20 });

    prismaMock.equipoHistory.create.mockResolvedValue({ id: 1 } as Record<string, unknown>);

    const updated = await EquipoService.attachComponents(1, 1, {
      driverDni: '12.345.678',
      truckPlate: 'AA-123-BB',
    });

    expect(updated.estado).toBe('activa');
    expect(prismaMock.equipoHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'swap', component: 'driver' }),
      })
    );
    expect(prismaMock.equipoHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'swap', component: 'truck' }),
      })
    );
  });

  it('attachComponents tolerates history/queue failures', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 2, tenantEmpresaId: 1, dadorCargaId: 3 });
    prismaMock.equipo.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prismaMock.equipo.update.mockResolvedValueOnce({ id: 2, estado: 'activa', validTo: null, driverId: 4, truckId: 5 });

    prismaMock.equipoHistory.create.mockRejectedValueOnce(new Error('fail'));
    queueServiceMock.addMissingCheckForEquipo.mockRejectedValueOnce(new Error('queue'));

    const updated = await EquipoService.attachComponents(1, 2, { driverId: 4, truckId: 5 });

    expect(updated.id).toBe(2);
  });

  it('attachComponents throws when truck plate not found', async () => {
    prismaMock.equipo.findUnique.mockResolvedValueOnce({ id: 3, tenantEmpresaId: 1, dadorCargaId: 4 });
    prismaMock.camion.findFirst.mockResolvedValueOnce(null);

    await expect(
      EquipoService.attachComponents(1, 3, { truckPlate: 'ZZZ999' })
    ).rejects.toThrow('Camión no encontrado');
  });

  it('ensure helpers return existing ids and create when missing', async () => {
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 10 });
    prismaMock.chofer.update.mockResolvedValueOnce({ id: 10 } as Record<string, unknown>);

    const existingChofer = await EquipoService.ensureChofer(1, 2, '12.345.678', ['1']);
    expect(existingChofer).toBe(10);
    expect(prismaMock.chofer.update).toHaveBeenCalled();

    prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
    prismaMock.chofer.create.mockResolvedValueOnce({ id: 11 } as Record<string, unknown>);
    const createdChofer = await EquipoService.ensureChofer(1, 2, '12.345.679');
    expect(createdChofer).toBe(11);

    prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 20 });
    const existingCamion = await EquipoService.ensureCamion(1, 2, 'AA-111-AA');
    expect(existingCamion).toBe(20);

    prismaMock.camion.findFirst.mockResolvedValueOnce(null);
    prismaMock.camion.create.mockResolvedValueOnce({ id: 21 } as Record<string, unknown>);
    const createdCamion = await EquipoService.ensureCamion(1, 2, 'AA-111-AB');
    expect(createdCamion).toBe(21);

    const noAcoplado = await EquipoService.ensureAcoplado(1, 2, null);
    expect(noAcoplado).toBeNull();

    prismaMock.acoplado.findFirst.mockResolvedValueOnce(null);
    prismaMock.acoplado.create.mockResolvedValueOnce({ id: 30 } as Record<string, unknown>);
    const createdAcoplado = await EquipoService.ensureAcoplado(1, 2, 'BB-222-BB');
    expect(createdAcoplado).toBe(30);

    const noEmpresa = await EquipoService.ensureEmpresaTransportista(1, 2, null, null);
    expect(noEmpresa).toBeNull();

    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ id: 40 } as Record<string, unknown>);
    const existingEmpresa = await EquipoService.ensureEmpresaTransportista(1, 2, '20-30405060-7', '');
    expect(existingEmpresa).toBe(40);

    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce(null);
    prismaMock.empresaTransportista.create.mockResolvedValueOnce({ id: 41 } as Record<string, unknown>);
    const createdEmpresa = await EquipoService.ensureEmpresaTransportista(1, 2, '20-30405060-8', ' ');
    expect(createdEmpresa).toBe(41);
  });

  it('createFromIdentifiers encola chequeo y asocia cliente por defecto', async () => {
    const ensureChofer = jest.spyOn(EquipoService, 'ensureChofer').mockResolvedValue(10);
    const ensureCamion = jest.spyOn(EquipoService, 'ensureCamion').mockResolvedValue(20);
    const ensureAcoplado = jest.spyOn(EquipoService, 'ensureAcoplado').mockResolvedValue(30);
    const ensureEmpresa = jest.spyOn(EquipoService, 'ensureEmpresaTransportista').mockResolvedValue(40);
    const createdEquipo = {
      id: 99,
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      driverId: 10,
      truckId: 20,
      trailerId: 30,
      empresaTransportistaId: 40,
      driverDniNorm: '12345678',
      truckPlateNorm: 'AA111AA',
      trailerPlateNorm: 'BB222BB',
      validFrom: new Date(),
      validTo: null,
      estado: 'activa',
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      externalId: null,
    } as unknown as Awaited<ReturnType<typeof EquipoService.create>>;

    const association = {
      equipoId: 99,
      clienteId: 7,
      asignadoDesde: new Date(),
      asignadoHasta: null,
    } as unknown as Awaited<ReturnType<typeof EquipoService.associateCliente>>;

    const createSpy = jest.spyOn(EquipoService, 'create').mockResolvedValue(createdEquipo);
    const associateSpy = jest.spyOn(EquipoService, 'associateCliente').mockResolvedValue(association);

    systemConfigMock.getConfig.mockResolvedValueOnce('7');

    const created = await EquipoService.createFromIdentifiers({
      tenantEmpresaId: 1,
      dadorCargaId: 2,
      dniChofer: '12345678',
      patenteTractor: 'AA111AA',
      patenteAcoplado: 'BB222BB',
      empresaTransportistaCuit: '20-30405060-7',
      empresaTransportistaNombre: 'Empresa',
    });

    expect(created.id).toBe(99);
    expect(queueServiceMock.addMissingCheckForEquipo).toHaveBeenCalled();
    expect(associateSpy).toHaveBeenCalled();
    expect(ensureChofer).toHaveBeenCalled();
    expect(ensureCamion).toHaveBeenCalled();
    expect(ensureAcoplado).toHaveBeenCalled();
    expect(ensureEmpresa).toHaveBeenCalled();

    ensureChofer.mockRestore();
    ensureCamion.mockRestore();
    ensureAcoplado.mockRestore();
    ensureEmpresa.mockRestore();
    createSpy.mockRestore();
    associateSpy.mockRestore();
  });
});
