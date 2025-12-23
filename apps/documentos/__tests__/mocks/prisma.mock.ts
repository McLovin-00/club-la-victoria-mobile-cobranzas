/**
 * Mock global de Prisma para tests unitarios
 * Proporciona implementaciones mockeadas de todos los modelos de Prisma
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
  alertRule: createModelMock(),
  user: createModelMock(),
  
  // Transaction and raw queries
  $transaction: jest.fn((fn) => fn(prismaMock)),
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
};

// Mock del módulo database
export const dbMock = {
  getClient: jest.fn(() => prismaMock),
  isConnected: jest.fn(() => true),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

// Helper para configurar mocks comunes
export const setupCommonMocks = () => {
  // Default: retornar arrays vacíos para findMany
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === 'object' && model !== null && 'findMany' in model) {
      (model.findMany as jest.Mock).mockResolvedValue([]);
    }
    if (typeof model === 'object' && model !== null && 'count' in model) {
      (model.count as jest.Mock).mockResolvedValue(0);
    }
  });
};


