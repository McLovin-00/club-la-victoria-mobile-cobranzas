jest.mock('ioredis', () => ({ Redis: class { quit() { return Promise.resolve(); } } }));

const workerModule = require('../dist/workers/document-validation.worker');

jest.mock('../dist/config/environment', () => ({ getEnvironment: () => ({ REDIS_URL: 'redis://localhost:6379' }) }));

jest.mock('../dist/config/database', () => ({
  db: { getClient: () => ({ document: { findUnique: jest.fn().mockResolvedValue({ id:1, status:'PENDIENTE', filePath:'b/o', entityType:'CHOFER', template: { name:'Licencia' } }), update: jest.fn().mockResolvedValue({}) } }) }
}));

jest.mock('../dist/services/minio.service', () => ({ minioService: { getSignedUrl: jest.fn().mockResolvedValue('http://signed') } }));

jest.mock('../dist/services/flowise.service', () => ({ flowiseService: { validateDocument: jest.fn().mockResolvedValue({ isValid: true, confidence: 0.9, extractedData: {} }) } }));

jest.mock('../dist/services/websocket.service', () => ({ webSocketService: { notifyDocumentStatusChange: jest.fn(), notifyDashboardUpdate: jest.fn() } }));

describe('DocumentValidationWorker', () => {
  it('module loads and exposes controls', () => {
    expect(typeof workerModule.getDocumentValidationWorker).toBe('function');
    expect(typeof workerModule.closeDocumentValidationWorker).toBe('function');
  });
});
