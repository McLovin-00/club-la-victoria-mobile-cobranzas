import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, statusCode = 500, code = 'ERR') => {
    const err: any = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    return err;
  },
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn(async () => undefined) },
}));

jest.mock('../../src/services/system-config.service', () => ({
  SystemConfigService: { getConfig: jest.fn(async () => null) },
}));

import { EquipoService } from '../../src/services/equipo.service';

describe('EquipoService (more)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    });
  });

  describe('create', () => {
    it('should throw EMPRESA_MISMATCH when empresaTransportista does not belong to dador', async () => {
      prismaMock.empresaTransportista.findFirst.mockResolvedValue({ dadorCargaId: 5 } as any);

      await expect(
        EquipoService.create({
          tenantEmpresaId: 1,
          dadorCargaId: 6,
          empresaTransportistaId: 10,
          driverId: 1,
          truckId: 2,
          trailerId: null,
          driverDni: '12345678',
          truckPlate: 'AA111AA',
          trailerPlate: null,
          validFrom: new Date(),
          validTo: null,
        })
      ).rejects.toMatchObject({ code: 'EMPRESA_MISMATCH' });
    });

    it('should throw EQUIPO_DUPLICATE when same dni/patentes overlap', async () => {
      prismaMock.empresaTransportista.findFirst.mockResolvedValue({ dadorCargaId: 6 } as any);
      prismaMock.equipo.findFirst.mockResolvedValueOnce({ id: 99 } as any); // duplicate check

      await expect(
        EquipoService.create({
          tenantEmpresaId: 1,
          dadorCargaId: 6,
          empresaTransportistaId: 10,
          driverId: 1,
          truckId: 2,
          trailerId: null,
          driverDni: '12345678',
          truckPlate: 'AA111AA',
          trailerPlate: null,
          validFrom: new Date(),
          validTo: null,
        })
      ).rejects.toMatchObject({ code: 'EQUIPO_DUPLICATE' });
    });

    it('should throw COMPONENT_IN_USE when conflicts exist and forceMove=false', async () => {
      prismaMock.equipo.findFirst
        .mockResolvedValueOnce(null) // duplicate check
        .mockResolvedValueOnce({ id: 1 } as any) // driverInUse
        .mockResolvedValueOnce({ id: 2 } as any); // truckInUse

      await expect(
        EquipoService.create({
          tenantEmpresaId: 1,
          dadorCargaId: 6,
          driverId: 1,
          truckId: 2,
          trailerId: null,
          driverDni: '12345678',
          truckPlate: 'AA111AA',
          trailerPlate: null,
          validFrom: new Date(),
          validTo: null,
        })
      ).rejects.toMatchObject({ code: 'COMPONENT_IN_USE' });
    });

    it('should forceMove: close conflicting equipos, detach trailer, then create new equipo', async () => {
      // Sequence of equipo.findFirst calls:
      // - duplicate check -> null
      // - driverInUse -> {id:1}
      // - truckInUse -> {id:2}
      // - trailerInUse (conflict check) -> {id:3}
      // - inside forceMove re-fetch driverInUse -> {id:1}
      // - re-fetch truckInUse -> {id:2}
      // - re-fetch trailerInUse -> {id:3}
      prismaMock.equipo.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce({ id: 2 } as any)
        .mockResolvedValueOnce({ id: 3 } as any)
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce({ id: 2 } as any)
        .mockResolvedValueOnce({ id: 3 } as any);

      prismaMock.equipo.create.mockResolvedValue({ id: 100, validFrom: new Date(), validTo: null, estado: 'activa', createdAt: new Date() } as any);
      prismaMock.equipo.update.mockResolvedValue({} as any);
      prismaMock.equipoHistory.create.mockResolvedValue({} as any);
      prismaMock.equipoCliente.findFirst.mockResolvedValue(null);
      prismaMock.equipoCliente.create.mockResolvedValue({} as any);

      const created = await EquipoService.create({
        tenantEmpresaId: 1,
        dadorCargaId: 6,
        driverId: 1,
        truckId: 2,
        trailerId: 3,
        driverDni: '12345678',
        truckPlate: 'AA111AA',
        trailerPlate: 'BB222BB',
        validFrom: new Date(),
        validTo: null,
        forceMove: true,
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.equipo.create).toHaveBeenCalled();
      expect(created).toMatchObject({ id: 100 });
    });
  });

  describe('associateCliente/removeCliente/delete/update', () => {
    it('associateCliente should throw EQUIPO_CLIENTE_DUPLICATE when open association exists', async () => {
      prismaMock.equipoCliente.findFirst.mockResolvedValue({ equipoId: 1 } as any);
      await expect(EquipoService.associateCliente(1, 1, 2, new Date())).rejects.toMatchObject({ code: 'EQUIPO_CLIENTE_DUPLICATE' });
    });

    it('removeCliente should enforce MIN_CLIENTE_REQUIRED', async () => {
      prismaMock.equipoCliente.count.mockResolvedValue(1);
      await expect(EquipoService.removeCliente(1, 1, 2)).rejects.toMatchObject({ code: 'MIN_CLIENTE_REQUIRED' });
    });

    it('removeCliente should close association if found, otherwise return null', async () => {
      prismaMock.equipoCliente.count.mockResolvedValue(2);
      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce(null);
      const res1 = await EquipoService.removeCliente(1, 1, 2);
      expect(res1).toBeNull();

      prismaMock.equipoCliente.findFirst.mockResolvedValueOnce({ asignadoDesde: new Date('2024-01-01') } as any);
      prismaMock.equipoCliente.update.mockResolvedValue({ ok: true } as any);
      const res2 = await EquipoService.removeCliente(1, 1, 2);
      expect(res2).toEqual({ ok: true });
    });

    it('delete should delete equipo, history and cliente relations inside transaction', async () => {
      prismaMock.equipoCliente.deleteMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.equipoHistory.deleteMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.equipo.delete.mockResolvedValue({ id: 1 } as any);
      prismaMock.equipoHistory.create.mockResolvedValue({} as any);

      const res = await EquipoService.delete(1);

      expect(prismaMock.equipoCliente.deleteMany).toHaveBeenCalled();
      expect(prismaMock.equipoHistory.deleteMany).toHaveBeenCalled();
      expect(prismaMock.equipo.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(res).toEqual({ id: 1 });
    });

    it('update should validate empresaTransportistaId mismatch and normalize 0 -> null', async () => {
      prismaMock.equipo.findUnique.mockResolvedValue({ dadorCargaId: 1, tenantEmpresaId: 1 } as any);
      prismaMock.empresaTransportista.findFirst.mockResolvedValue({ dadorCargaId: 999 } as any);

      await expect(EquipoService.update(1, { empresaTransportistaId: 10 })).rejects.toMatchObject({ code: 'EMPRESA_MISMATCH' });

      prismaMock.empresaTransportista.findFirst.mockResolvedValue({ dadorCargaId: 1 } as any);
      prismaMock.equipo.update.mockResolvedValue({ id: 1, empresaTransportistaId: null } as any);
      const ok = await EquipoService.update(1, { empresaTransportistaId: 0 });
      expect(ok).toMatchObject({ id: 1 });
      expect(prismaMock.equipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ empresaTransportistaId: null }),
        })
      );
    });
  });
});


