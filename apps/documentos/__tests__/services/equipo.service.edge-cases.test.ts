/**
 * Tests adicionales para EquipoService
 * Propósito: Cubrir branches de edge cases no cubiertos en tests anteriores
 */

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

describe('EquipoService - edge cases y branches adicionales', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prismaMock);
    });
  });

  // ============================================================================
  // TESTS DE update - edge cases
  // ============================================================================
  describe('update - edge cases', () => {
    it('debe setear empresaTransportistaId a null cuando es 0', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: 1,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        empresaTransportistaId: 100,
      } as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: 1,
        empresaTransportistaId: null, // Debe ser null, no 0
      } as any);

      await EquipoService.update(1, {
        empresaTransportistaId: 0, // Pasamos 0
      } as any);

      const updateCall = (prismaMock.equipo.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.empresaTransportistaId).toBeNull();
    });

    it('debe manejar trailerPlate undefined', async () => {
      prismaMock.equipo.findUnique.mockResolvedValueOnce({
        id: 1,
        driverId: 10,
        truckId: 20,
        trailerId: 30,
        trailerPlateNorm: 'BB222BB',
      } as any);

      prismaMock.equipo.update.mockResolvedValueOnce({
        id: 1,
        trailerPlateNorm: null,
      } as any);

      await EquipoService.update(1, {
        trailerPlate: undefined, // Pasamos undefined
      } as any);

      // Verificar que el update se llamó
      expect(prismaMock.equipo.update).toHaveBeenCalled();
    });
  });
});
