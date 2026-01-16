/**
 * Mock global de Prisma para tests unitarios
 * Proporciona implementaciones mockeadas de todos los modelos de Prisma con todos los métodos necesarios
 */

// Mock factory para crear modelos con métodos comunes
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
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

// Mock completo de Prisma Client
export const prismaMock = {
  // Models
  document: createModelMock(),
  documentTemplate: createModelMock(),
  documentClassification: createModelMock(),
  entityExtractionLog: createModelMock(),
  entityExtractedData: createModelMock(),
  chofer: createModelMock(),
  camion: createModelMock(),
  acoplado: createModelMock(),
  empresaTransportista: createModelMock(),
  empresa: createModelMock(),
  dadorCarga: createModelMock(),
  cliente: createModelMock(),
  equipo: createModelMock(),
  equipoHistory: createModelMock(),
  equipoCliente: createModelMock(),
  clienteRequisito: createModelMock(),
  clienteDocumentRequirement: createModelMock(),
  auditLog: createModelMock(),
  systemConfig: createModelMock(),
  notification: createModelMock(),
  notificationLog: createModelMock(),
  alertRule: createModelMock(),
  user: createModelMock(),
  
  // Transaction and raw queries
  $transaction: jest.fn((fn) => {
    console.log('Transaction mock called');
    const result = fn(prismaMock);
    console.log('Transaction result from fn:', result);
    return result;
  }),
  $queryRaw: jest.fn(),
  $queryRawUnsafe: jest.fn(),
  $executeRaw: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Reset all mocks
export const resetPrismaMock = () => {
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    } else if (jest.isMockFunction(model)) {
      model.mockReset();
    }
  });
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        method.mockResolvedValue(undefined);
      });
    }
  });
  prismaMock.$transaction.mockImplementation((fn) => fn(prismaMock));
  prismaMock.$queryRaw.mockClear();
  prismaMock.$queryRawUnsafe.mockClear();
  prismaMock.$executeRaw.mockClear();
  prismaMock.$executeRawUnsafe.mockClear();
  prismaMock.$connect.mockClear();
  prismaMock.$disconnect.mockClear();
};

// Mock del módulo database
export const dbMock = {
  getClient: jest.fn(() => prismaMock),
  isConnected: jest.fn(() => true),
  connect: jest.fn(),
  disconnect: jest.fn(),
};
