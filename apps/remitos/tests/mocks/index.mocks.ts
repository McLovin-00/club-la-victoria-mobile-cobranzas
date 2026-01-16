// Mocks para index.ts
// Este archivo mockea todas las dependencias externas de index.ts

// Mock de express
const mockApp = {
  use: jest.fn(),
  set: jest.fn(),
  listen: jest.fn().mockReturnThis(),
};
const mockExpress = jest.fn(() => mockApp);
mockExpress.json = jest.fn().mockReturnThis();
mockExpress.urlencoded = jest.fn().mockReturnThis();
mockExpress.Router = jest.fn(() => ({ use: jest.fn() }));

// Mock de http
const mockHttpServer = {
  listen: jest.fn().mockReturnThis(),
  close: jest.fn((cb) => { if (cb) cb(); return mockHttpServer; }),
};
const mockCreateServer = jest.fn(() => mockHttpServer);

// Mock de cors
const mockCors = jest.fn(() => (req: any, res: any, next: any) => next());

// Mock de dotenv
const mockDotenv = {
  config: jest.fn(),
};

// Mock de path
const mockPath = {
  resolve: jest.fn(() => '/mocked/path/.env'),
};

// Mock de AppLogger
export const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock de ConfigService
export const mockConfigService = {
  initializeDefaults: jest.fn().mockResolvedValue(undefined),
};

// Mock de queueService
export const mockQueueService = {
  close: jest.fn().mockResolvedValue(undefined),
};

// Mock de startAnalysisWorker y stopAnalysisWorker
export const mockStartAnalysisWorker = jest.fn(() => ({}));
export const mockStopAnalysisWorker = jest.fn().mockResolvedValue(undefined);

// Mock de db
export const mockDb = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getClient: jest.fn(),
};

// Mock de routes
const mockRoutes = { use: jest.fn() };

// Mock de notFoundHandler
export const mockNotFoundHandler = jest.fn((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});

// Mock de errorHandler
export const mockErrorHandler = jest.fn((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ error: err.message });
});

// Configurar mocks de módulos
jest.mock('express', () => mockExpress);
jest.mock('http', () => ({
  createServer: mockCreateServer,
}));
jest.mock('cors', () => mockCors);
jest.mock('dotenv', () => mockDotenv);
jest.mock('path', () => mockPath);
jest.mock('./src/config/logger', () => ({
  AppLogger: mockAppLogger,
}));
jest.mock('./src/config/database', () => ({
  db: mockDb,
}));
jest.mock('./src/services/config.service', () => ({
  ConfigService: mockConfigService,
}));
jest.mock('./src/services/queue.service', () => ({
  queueService: mockQueueService,
}));
jest.mock('./src/workers/analysis.worker', () => ({
  startAnalysisWorker: mockStartAnalysisWorker,
  stopAnalysisWorker: mockStopAnalysisWorker,
}));
jest.mock('./src/routes', () => mockRoutes);
jest.mock('./src/middlewares/error.middleware', () => ({
  errorHandler: mockErrorHandler,
  notFoundHandler: mockNotFoundHandler,
  createError: jest.fn((msg, code, status) => new Error(msg)),
}));

// Re-exportar mocks para uso en tests
export {
  mockApp,
  mockHttpServer,
  mockExpress,
  mockCreateServer,
  mockCors,
  mockDotenv,
  mockPath,
  mockRoutes,
};
