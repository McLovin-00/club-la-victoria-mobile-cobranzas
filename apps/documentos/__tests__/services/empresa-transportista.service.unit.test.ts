import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn() },
}));

import { EmpresaTransportistaService } from '../../src/services/empresa-transportista.service';

describe('EmpresaTransportistaService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('list returns data + pagination', async () => {
    prismaMock.empresaTransportista.findMany.mockResolvedValueOnce([{ id: 1 }]);
    prismaMock.empresaTransportista.count.mockResolvedValueOnce(11);
    const out = await EmpresaTransportistaService.list(1, 2, { q: 'x', page: 2, limit: 10 });
    expect(out.data).toHaveLength(1);
    expect(out.pagination.pages).toBe(2);
  });

  it('create validates dador exists', async () => {
    prismaMock.dadorCarga.findFirst.mockResolvedValueOnce(null);
    await expect(EmpresaTransportistaService.create({ dadorCargaId: 1, tenantEmpresaId: 1, razonSocial: 'x', cuit: '30', activo: true })).rejects.toThrow('Dador');
  });

  it('update throws when nothing updated; delete enforces asset checks', async () => {
    prismaMock.empresaTransportista.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(EmpresaTransportistaService.update(1, 1, { razonSocial: 'x' })).rejects.toThrow('no encontrada');

    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce(null);
    await expect(EmpresaTransportistaService.delete(1, 1)).rejects.toThrow('no encontrada');

    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ _count: { choferes: 1, camiones: 0, acoplados: 0, equipos: 0 } });
    await expect(EmpresaTransportistaService.delete(1, 1)).rejects.toThrow('activos');
  });

  it('delete returns true when deleted', async () => {
    prismaMock.empresaTransportista.findFirst.mockResolvedValueOnce({ _count: { choferes: 0, camiones: 0, acoplados: 0, equipos: 0 } });
    prismaMock.empresaTransportista.deleteMany.mockResolvedValueOnce({ count: 1 });
    await expect(EmpresaTransportistaService.delete(1, 1)).resolves.toBe(true);
  });

  it('getChoferes/getEquipos proxy to prisma', async () => {
    prismaMock.chofer.findMany.mockResolvedValueOnce([{ id: 1 }]);
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 2 }]);
    await expect(EmpresaTransportistaService.getChoferes(1, 1)).resolves.toHaveLength(1);
    await expect(EmpresaTransportistaService.getEquipos(1, 1)).resolves.toHaveLength(1);
  });
});


