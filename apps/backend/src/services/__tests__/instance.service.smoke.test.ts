/**
 * Propósito: Smoke test de `InstanceService` con prisma mockeado (sin DB real).
 */

const prismaMock = {
  instance: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 1, nombre: 'i', serviceId: 1, empresaId: 1 }),
  },
  service: {
    findUnique: jest.fn().mockResolvedValue({ id: 1, estado: 'activo' }),
  },
  empresa: {
    findUnique: jest.fn().mockResolvedValue({ id: 1 }),
  },
};

jest.mock('../../config/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    // Usado por BaseService para paths de error
    logError: jest.fn(),
    // Usado por BaseService para trazas de operaciones
    logDatabaseOperation: jest.fn(),
  },
}));

import { InstanceService } from '../instance.service';

describe('InstanceService (smoke)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create valida service/empresa y crea instancia', async () => {
    const svc = InstanceService.getInstance();
    const created = await svc.create({ nombre: 'inst', serviceId: 1, empresaId: 1 });
    expect(created).toEqual(expect.objectContaining({ id: 1 }));
  });
});


