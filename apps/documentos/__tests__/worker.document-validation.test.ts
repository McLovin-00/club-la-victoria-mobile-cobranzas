jest.mock('ioredis', () => ({ Redis: class { quit() { return Promise.resolve(); } } }));

const workerModule = require('../src/workers/document-validation.worker');

jest.mock('../src/config/environment', () => ({ getEnvironment: () => ({ REDIS_URL: 'redis://localhost:6379' }) }));

jest.mock('../src/config/database', () => ({
  db: { getClient: () => ({ document: { findUnique: jest.fn().mockResolvedValue({ id:1, status:'PENDIENTE', filePath:'b/o', entityType:'CHOFER', template: { name:'Licencia' } }), update: jest.fn().mockResolvedValue({}) } }) }
}));

jest.mock('../src/services/minio.service', () => ({ minioService: { getSignedUrl: jest.fn().mockResolvedValue('http://signed') } }));

jest.mock('../src/services/flowise.service', () => ({ flowiseService: { validateDocument: jest.fn().mockResolvedValue({ isValid: true, confidence: 0.9, extractedData: {} }) } }));

jest.mock('../src/services/websocket.service', () => ({ webSocketService: { notifyDocumentStatusChange: jest.fn(), notifyDashboardUpdate: jest.fn() } }));

describe('DocumentValidationWorker', () => {
  it('module loads and exposes controls', () => {
    expect(typeof workerModule.getDocumentValidationWorker).toBe('function');
    expect(typeof workerModule.closeDocumentValidationWorker).toBe('function');
  });
});
