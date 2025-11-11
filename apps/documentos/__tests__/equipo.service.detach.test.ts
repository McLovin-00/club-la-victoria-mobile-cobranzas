// Unit test for EquipoService.detachComponents (trailer branch)
jest.mock('../src/config/database', () => ({
  prisma: {
    equipo: {
      findUnique: jest.fn().mockResolvedValue({ id: 123, tenantEmpresaId: 1 }),
      update: jest.fn().mockResolvedValue({ id: 123, trailerId: null }),
    },
  },
}));

// Avoid background queue side-effects
jest.mock('../src/services/queue.service', () => ({
  queueService: { addMissingCheckForEquipo: jest.fn().mockResolvedValue(undefined) },
}));

import { prisma } from '../src/config/database';
import { EquipoService } from '../src/services/equipo.service';

describe('EquipoService.detachComponents', () => {
  beforeEach(() => {
    (prisma.equipo.findUnique as any).mockClear();
    (prisma.equipo.update as any).mockClear();
  });

  it('detaches trailer and enqueues missing-check', async () => {
    const updated = await EquipoService.detachComponents(1, 123, { trailer: true });
    expect(prisma.equipo.findUnique).toHaveBeenCalledWith({ where: { id: 123 }, select: { id: true, tenantEmpresaId: true } });
    expect(prisma.equipo.update).toHaveBeenCalledWith({ where: { id: 123 }, data: { trailerId: null, trailerPlateNorm: null } });
    expect(updated).toEqual({ id: 123, trailerId: null });
  });
});


