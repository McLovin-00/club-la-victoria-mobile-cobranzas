import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn(async () => undefined) },
}));

import { queueService } from '../../src/services/queue.service';
import { MaestrosService } from '../../src/services/maestros.service';

describe('MaestrosService (extra branches)', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (arg: any) => arg(prismaMock));
  });

  it('createChofer updates existing when same dni but different dador; throws when same dador', async () => {
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 1, dadorCargaId: 2, nombre: 'n', apellido: 'a', phones: [], activo: true } as any);
    prismaMock.chofer.update.mockResolvedValueOnce({ id: 1, dadorCargaId: 3 } as any);
    await expect(MaestrosService.createChofer({ tenantEmpresaId: 1, dadorCargaId: 3, dni: '12.345.678', activo: true, phones: ['1'] })).resolves.toMatchObject({ dadorCargaId: 3 });

    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 2, dadorCargaId: 3 } as any);
    await expect(MaestrosService.createChofer({ tenantEmpresaId: 1, dadorCargaId: 3, dni: '12345678' } as any)).rejects.toThrow('Unique constraint');
  });

  it('createCamion/createAcoplado update existing when different dador; throw when same dador', async () => {
    prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 1, dadorCargaId: 2, marca: 'm', modelo: 'x', activo: true } as any);
    prismaMock.camion.update.mockResolvedValueOnce({ id: 1, dadorCargaId: 3 } as any);
    await expect(MaestrosService.createCamion({ tenantEmpresaId: 1, dadorCargaId: 3, patente: 'AAA-123' })).resolves.toMatchObject({ dadorCargaId: 3 });

    prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 2, dadorCargaId: 3 } as any);
    await expect(MaestrosService.createCamion({ tenantEmpresaId: 1, dadorCargaId: 3, patente: 'AAA123' } as any)).rejects.toThrow('Unique constraint');

    prismaMock.acoplado.findFirst.mockResolvedValueOnce({ id: 5, dadorCargaId: 2, tipo: 't', activo: true } as any);
    prismaMock.acoplado.update.mockResolvedValueOnce({ id: 5, dadorCargaId: 3 } as any);
    await expect(MaestrosService.createAcoplado({ tenantEmpresaId: 1, dadorCargaId: 3, patente: 'BBB-234' } as any)).resolves.toMatchObject({ dadorCargaId: 3 });

    prismaMock.acoplado.findFirst.mockResolvedValueOnce({ id: 6, dadorCargaId: 3 } as any);
    await expect(MaestrosService.createAcoplado({ tenantEmpresaId: 1, dadorCargaId: 3, patente: 'BBB234' } as any)).rejects.toThrow('Unique constraint');
  });

  it('createChofer/enqueueMissingCheck enqueues missing check when equipos exist', async () => {
    prismaMock.chofer.findFirst.mockResolvedValueOnce(null);
    prismaMock.chofer.create.mockResolvedValueOnce({ id: 10 } as any);
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 99 }] as any);
    await MaestrosService.createChofer({ tenantEmpresaId: 1, dadorCargaId: 2, dni: '12345678' } as any);
    expect(queueService.addMissingCheckForEquipo).toHaveBeenCalledWith(1, 99, expect.any(Number));
  });

  it('deleteChofer detaches from equipos and writes history (best effort)', async () => {
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }] as any);
    prismaMock.equipo.update.mockResolvedValueOnce({} as any);
    prismaMock.equipoHistory.create.mockResolvedValueOnce({} as any);
    prismaMock.chofer.delete.mockResolvedValueOnce({ id: 10 } as any);
    await expect(MaestrosService.deleteChofer(1, 10)).resolves.toMatchObject({ id: 10 });
    expect(prismaMock.equipo.update).toHaveBeenCalled();
  });
});


