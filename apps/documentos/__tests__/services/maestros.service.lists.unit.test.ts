import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn(async () => undefined) },
}));

import { MaestrosService } from '../../src/services/maestros.service';

describe('MaestrosService (lists + updates + deletes)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
  });

  it('listChoferes/listCamiones/listAcoplados return pagination', async () => {
    prismaMock.chofer.findMany.mockResolvedValueOnce([{ id: 1 }]);
    prismaMock.chofer.count.mockResolvedValueOnce(5);
    const choferes = await MaestrosService.listChoferes(1, 2, 'q', true, 2, 10);
    expect(choferes.total).toBe(5);
    expect(choferes.page).toBe(2);

    prismaMock.camion.findMany.mockResolvedValueOnce([{ id: 1 }]);
    prismaMock.camion.count.mockResolvedValueOnce(6);
    const camiones = await MaestrosService.listCamiones(1, undefined, 'q', false, 1, 10);
    expect(camiones.total).toBe(6);

    prismaMock.acoplado.findMany.mockResolvedValueOnce([{ id: 1 }]);
    prismaMock.acoplado.count.mockResolvedValueOnce(7);
    const acoplados = await MaestrosService.listAcoplados(1, 3, 'q', undefined, 1, 10);
    expect(acoplados.total).toBe(7);
  });

  it('createEmpresa/updateEmpresa/deleteEmpresa should call prisma dadorCarga', async () => {
    prismaMock.dadorCarga.create.mockResolvedValueOnce({ id: 1 } as any);
    prismaMock.dadorCarga.update.mockResolvedValueOnce({ id: 1 } as any);
    prismaMock.dadorCarga.delete.mockResolvedValueOnce({ id: 1 } as any);

    await expect(MaestrosService.createEmpresa({ razonSocial: 'X', cuit: '20', activo: true })).resolves.toMatchObject({ id: 1 });
    await expect(MaestrosService.updateEmpresa(1, { razonSocial: 'Y' })).resolves.toMatchObject({ id: 1 });
    await expect(MaestrosService.deleteEmpresa(1)).resolves.toMatchObject({ id: 1 });
  });

  it('updateChofer/updateCamion/updateAcoplado should normalize fields', async () => {
    prismaMock.chofer.update.mockResolvedValueOnce({ id: 1 } as any);
    await MaestrosService.updateChofer(1, 1, { dni: '12.345.678', nombre: 'A' });
    expect(prismaMock.chofer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dniNorm: '12345678' }) })
    );

    prismaMock.camion.update.mockResolvedValueOnce({ id: 2 } as any);
    await MaestrosService.updateCamion(1, 2, { patente: 'aa-123-bb' });
    expect(prismaMock.camion.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patenteNorm: 'AA123BB' }) })
    );

    prismaMock.acoplado.update.mockResolvedValueOnce({ id: 3 } as any);
    await MaestrosService.updateAcoplado(1, 3, { patente: 'bb-999' });
    expect(prismaMock.acoplado.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ patenteNorm: 'BB999' }) })
    );
  });

  it('deleteCamion/deleteAcoplado should detach from equipos and delete even if history fails', async () => {
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 10 }] as any);
    prismaMock.equipo.update.mockResolvedValueOnce({} as any);
    prismaMock.equipoHistory.create.mockRejectedValueOnce(new Error('ignore'));
    prismaMock.camion.delete.mockResolvedValueOnce({ id: 1 } as any);

    await expect(MaestrosService.deleteCamion(1, 1)).resolves.toMatchObject({ id: 1 });
    expect(prismaMock.equipo.update).toHaveBeenCalled();

    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 11 }] as any);
    prismaMock.equipo.update.mockResolvedValueOnce({} as any);
    prismaMock.equipoHistory.create.mockRejectedValueOnce(new Error('ignore'));
    prismaMock.acoplado.delete.mockResolvedValueOnce({ id: 2 } as any);

    await expect(MaestrosService.deleteAcoplado(1, 2)).resolves.toMatchObject({ id: 2 });
    expect(prismaMock.acoplado.delete).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});


