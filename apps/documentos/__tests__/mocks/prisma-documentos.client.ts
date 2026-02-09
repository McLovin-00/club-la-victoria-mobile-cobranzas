/**
 * Propósito: Mock del Prisma Client de Documentos para tests (evita importar cliente generado).
 * Incluye los modelos y métodos mínimos para que imports con side-effects no rompan la suite.
 */

// Factory simple para mocks de modelos Prisma.
const createModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
});

export const prismaMock = {
  document: createModelMock(),
  documentTemplate: createModelMock(),
  documentClassification: createModelMock(),
  entityExtractionLog: createModelMock(),
  entityExtractedData: createModelMock(),
  equipo: createModelMock(),
  equipoCliente: createModelMock(),
  chofer: createModelMock(),
  camion: createModelMock(),
  acoplado: createModelMock(),
  empresaTransportista: createModelMock(),
  dadorCarga: createModelMock(),
  systemConfig: createModelMock(),
  notificationLog: createModelMock(),

  $transaction: jest.fn((fn: any) => fn(prismaMock)),
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn().mockResolvedValue([{ exists: false }]),
  $executeRaw: jest.fn(),
  $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $on: jest.fn(),
};

export class PrismaClient {
  constructor() {
    // PrismaClient real expone modelos y métodos; devolvemos el mock para que el resto del código funcione.
    return prismaMock as any;
  }
}


