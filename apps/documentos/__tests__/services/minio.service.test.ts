/**
 * Tests unitarios para MinIOService
 */
jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(undefined),
    putObject: jest.fn().mockResolvedValue({ etag: 'test-etag' }),
    getObject: jest.fn().mockResolvedValue({
      pipe: jest.fn(),
      on: jest.fn((event, cb) => {
        if (event === 'data') cb(Buffer.from('test'));
        if (event === 'end') cb();
        return { on: jest.fn() };
      }),
    }),
    statObject: jest.fn().mockResolvedValue({ size: 1 }),
    removeObject: jest.fn().mockResolvedValue(undefined),
    presignedGetObject: jest.fn().mockResolvedValue('http://presigned-url'),
    listBuckets: jest.fn().mockResolvedValue([]),
    listObjects: jest.fn().mockImplementation(() => ({
      on: jest.fn((event: string, cb: any) => {
        if (event === 'end') cb();
        return undefined;
      }),
    })),
    copyObject: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Ojo: el servicio es singleton con constructor privado.
function getService() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MinIOService } = require('../../src/services/minio.service');
  return MinIOService.getInstance();
}

describe('MinioService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('sube un documento y retorna bucket/objectPath', async () => {
      const minioService = getService();
      const buffer = Buffer.from('test content');
      const fileName = 'test.pdf';
      const contentType = 'application/pdf';

      const result = await minioService.uploadDocument(1, 'CHOFER', 10, 'DNI', fileName, buffer, contentType);

      expect(result).toBeDefined();
      expect(result.bucketName).toContain('-t1');
      expect(result.objectPath).toContain('chofer/10/');
    });
  });

  describe('getSignedUrl', () => {
    it('genera URL firmada (presigned)', async () => {
      const minioService = getService();
      const result = await minioService.getSignedUrl('bucket', 'path/file.pdf');

      expect(result).toContain('http');
    });
  });

  describe('deleteDocument', () => {
    it('elimina un documento', async () => {
      const minioService = getService();
      await expect(minioService.deleteDocument('bucket', 'path/file.pdf')).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('retorna true si listBuckets funciona', async () => {
      const minioService = getService();
      await expect(minioService.healthCheck()).resolves.toBe(true);
    });
  });
});
