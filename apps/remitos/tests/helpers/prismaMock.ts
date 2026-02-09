export function createPrismaMock(overrides: Partial<any> = {}) {
  const prisma: any = {
    remito: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    remitoImagen: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    remitoHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    remitoSystemConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  return { ...prisma, ...overrides };
}


