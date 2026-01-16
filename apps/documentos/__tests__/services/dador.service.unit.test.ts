import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

import { DadorService } from '../../src/services/dador.service';

describe('DadorService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (arg: any) => arg(prismaMock));
  });

  it('list/create/update proxy to prisma', async () => {
    prismaMock.dadorCarga.findMany.mockResolvedValueOnce([{ id: 1 }] as any);
    await expect(DadorService.list(true, 1)).resolves.toHaveLength(1);

    prismaMock.dadorCarga.create.mockResolvedValueOnce({ id: 2 } as any);
    await expect(DadorService.create({ tenantEmpresaId: 1, razonSocial: 'x', cuit: '30' })).resolves.toMatchObject({ id: 2 });

    prismaMock.dadorCarga.update.mockResolvedValueOnce({ id: 3 } as any);
    await expect(DadorService.update(3, { razonSocial: 'y' })).resolves.toMatchObject({ id: 3 });
  });

  it('remove deletes related entities and then the dador', async () => {
    prismaMock.equipo.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.chofer.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.camion.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.acoplado.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.empresaTransportista.deleteMany.mockResolvedValueOnce({} as any);
    prismaMock.dadorCarga.delete.mockResolvedValueOnce({ id: 9 } as any);

    const out = await DadorService.remove(9);
    expect(out.id).toBe(9);
    expect(prismaMock.equipo.deleteMany).toHaveBeenCalled();
  });
});


