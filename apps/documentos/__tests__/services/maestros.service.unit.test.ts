import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

jest.mock('../../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn(async () => undefined) },
}));

import { MaestrosService } from '../../src/services/maestros.service';

describe('MaestrosService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
  });

  it('listEmpresas returns pagination', async () => {
    prismaMock.dadorCarga.findMany.mockResolvedValueOnce([{ id: 1 }]);
    prismaMock.dadorCarga.count.mockResolvedValueOnce(2);
    const out = await MaestrosService.listEmpresas(true, 'x', 2, 10);
    expect(out.page).toBe(2);
    expect(out.total).toBe(2);
  });

  it('createChofer: updates existing chofer from another dador, throws if same dador', async () => {
    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, dniNorm: '123', dadorCargaId: 10, nombre: 'A', apellido: 'B', phones: [], activo: true });
    prismaMock.chofer.update.mockResolvedValueOnce({ id: 1 });
    await expect(MaestrosService.createChofer({ tenantEmpresaId: 1, dadorCargaId: 20, dni: '12.3', nombre: 'N' })).resolves.toBeTruthy();

    prismaMock.chofer.findFirst.mockResolvedValueOnce({ id: 2, tenantEmpresaId: 1, dniNorm: '123', dadorCargaId: 20, nombre: 'A', apellido: 'B', phones: [], activo: true });
    await expect(MaestrosService.createChofer({ tenantEmpresaId: 1, dadorCargaId: 20, dni: '12.3' })).rejects.toThrow('Unique constraint failed');
  });

  it('deleteChofer detaches from equipos inside transaction', async () => {
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }]);
    prismaMock.equipo.update.mockResolvedValueOnce({ id: 1 });
    prismaMock.equipoHistory.create.mockResolvedValueOnce({ id: 1 });
    prismaMock.chofer.delete.mockResolvedValueOnce({ id: 9 });

    await MaestrosService.deleteChofer(1, 9);
    expect(prismaMock.equipo.update).toHaveBeenCalled();
    expect(prismaMock.chofer.delete).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it('createCamion/createAcoplado handle existing other dador -> update', async () => {
    prismaMock.camion.findFirst.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, patenteNorm: 'AB', dadorCargaId: 10, marca: 'M', modelo: 'X', activo: true });
    prismaMock.camion.update.mockResolvedValueOnce({ id: 1 });
    await expect(MaestrosService.createCamion({ tenantEmpresaId: 1, dadorCargaId: 20, patente: 'AB', marca: 'N' })).resolves.toBeTruthy();

    prismaMock.acoplado.findFirst.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 1, patenteNorm: 'AA', dadorCargaId: 10, tipo: 'T', activo: true });
    prismaMock.acoplado.update.mockResolvedValueOnce({ id: 1 });
    await expect(MaestrosService.createAcoplado({ tenantEmpresaId: 1, dadorCargaId: 20, patente: 'AA', tipo: 'Z' })).resolves.toBeTruthy();
  });
});


