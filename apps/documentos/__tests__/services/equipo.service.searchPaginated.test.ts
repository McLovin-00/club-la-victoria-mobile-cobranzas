/**
 * Propósito: Tests de `EquipoService.searchPaginated` enfocando filtros y branch coverage sin DB real.
 */

import { jest } from '@jest/globals';

const prismaMock = {
  equipoCliente: {
    findMany: jest.fn(),
  },
  equipo: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('../../src/config/database', () => ({
  prisma: prismaMock,
}));

import { EquipoService } from '../../src/services/equipo.service';

describe('EquipoService.searchPaginated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve vacío si clienteId no tiene equipos asignados', async () => {
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([]);

    const result = await EquipoService.searchPaginated(
      1,
      { clienteId: 10 },
      1,
      10
    );

    expect(result).toEqual({ equipos: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    expect(prismaMock.equipo.count).not.toHaveBeenCalled();
    expect(prismaMock.equipo.findMany).not.toHaveBeenCalled();
  });

  it('construye OR por search y aplica filtro activo', async () => {
    prismaMock.equipoCliente.findMany.mockResolvedValueOnce([{ equipoId: 1 }, { equipoId: 2 }]);
    prismaMock.equipo.count.mockResolvedValueOnce(2);
    prismaMock.equipo.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const result = await EquipoService.searchPaginated(
      1,
      {
        clienteId: 10,
        search: 'ab123cd|21039117',
        activo: true,
      },
      1,
      10
    );

    expect(result.total).toBe(2);
    expect(prismaMock.equipo.count).toHaveBeenCalledTimes(1);

    const whereArg = prismaMock.equipo.count.mock.calls[0]?.[0]?.where as unknown;
    expect(whereArg).toMatchObject({
      tenantEmpresaId: 1,
      activo: true,
      id: { in: [1, 2] },
      OR: [
        { driverDniNorm: { in: ['AB123CD', '21039117'] } },
        { truckPlateNorm: { in: ['AB123CD', '21039117'] } },
        { trailerPlateNorm: { in: ['AB123CD', '21039117'] } },
      ],
    });
  });
});


