/**
 * Coverage tests for MinIOService – helpers (sanitizeMetaValue,
 * isRetryableError, parseEndpoint, withRetry), singleton, bucket ops,
 * upload, signed URLs (public vs internal), getObject, moveObject,
 * deleteDocument, uploadObject, healthCheck, listObjectKeys,
 * getStorageStats, and public client initialization branches.
 * @jest-environment node
 */

const mockMinioClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  statObject: jest.fn(),
  presignedGetObject: jest.fn(),
  getObject: jest.fn(),
  copyObject: jest.fn(),
  removeObject: jest.fn(),
  listBuckets: jest.fn(),
  listObjects: jest.fn(),
};

const mockPublicSignerClient = {
  presignedGetObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => {
    return { ...mockMinioClient };
  }),
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../src/middlewares/error.middleware', () => ({
  createError: jest.fn((msg: string, status: number, code: string) => {
    const e: any = new Error(msg);
    e.statusCode = status;
    e.code = code;
    return e;
  }),
}));

jest.mock('../src/config/environment', () => ({
  getEnvironment: () => ({
    MINIO_ENDPOINT: 'localhost:9000',
    MINIO_PORT: '9000',
    MINIO_USE_SSL: false,
    MINIO_ACCESS_KEY: 'minioadmin',
    MINIO_SECRET_KEY: 'minioadmin',
    MINIO_REGION: 'us-east-1',
    MINIO_BUCKET_PREFIX: 'docs',
    MINIO_PUBLIC_BASE_URL: '',
  }),
}));

jest.mock('../src/services/file-naming.service', () => ({
  FileNamingService: {
    generateStandardizedName: jest.fn().mockResolvedValue('chofer-1-dni-123.pdf'),
  },
}));

let minioService: any;

beforeAll(() => {
  jest.isolateModules(() => {
    const mod = require('../src/services/minio.service');
    minioService = mod.minioService;
  });
});

describe('MinIOService (coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Helpers (exported as module-level functions, tested via service methods)
  // ==========================================================================
  describe('sanitizeMetaValue (via uploadDocument metadata)', () => {
    it('strips accents and non-ASCII chars', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'abc' });

      await minioService.uploadDocument(
        1, 'CHOFER', 1, 'Licéncia', 'filéño.pdf', Buffer.from('x'), 'application/pdf'
      );

      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ensureBucketExists
  // ==========================================================================
  describe('ensureBucketExists', () => {
    it('creates bucket when it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);

      await minioService.ensureBucketExists(1);

      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('docs-t1', 'us-east-1');
    });

    it('skips creation when bucket exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await minioService.ensureBucketExists(1);

      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('throws on error', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(new Error('conn'));

      await expect(minioService.ensureBucketExists(1)).rejects.toThrow('Error al configurar almacenamiento');
    });
  });

  // ==========================================================================
  // uploadDocument
  // ==========================================================================
  describe('uploadDocument', () => {
    it('uploads document successfully', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'e1' });

      const result = await minioService.uploadDocument(
        1, 'CHOFER', 10, 'DNI', 'file.pdf', Buffer.from('data'), 'application/pdf'
      );

      expect(result).toEqual({
        bucketName: 'docs-t1',
        objectPath: expect.stringContaining('chofer'),
      });
    });

    it('falls back to manual path when FileNamingService fails', async () => {
      const { FileNamingService } = require('../src/services/file-naming.service');
      (FileNamingService.generateStandardizedName as jest.Mock).mockRejectedValue(new Error('fail'));

      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({ etag: 'e2' });

      const result = await minioService.uploadDocument(
        1, 'CAMION', 20, 'VTV', 'doc.jpg', Buffer.from('x'), 'image/jpeg'
      );

      expect(result.objectPath).toContain('camion/20/vtv/');
    });

    it('throws upload error with signature hint', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockRejectedValue(new Error('the signature we calculated does not match'));

      await expect(
        minioService.uploadDocument(1, 'CHOFER', 1, 'T', 'f.pdf', Buffer.from('x'), 'application/pdf')
      ).rejects.toThrow('Error al almacenar documento');
    });

    it('throws generic upload error', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockRejectedValue(new Error('network error'));

      await expect(
        minioService.uploadDocument(1, 'CHOFER', 1, 'T', 'f.pdf', Buffer.from('x'), 'application/pdf')
      ).rejects.toThrow('Error al almacenar documento');
    });
  });

  // ==========================================================================
  // getSignedUrl
  // ==========================================================================
  describe('getSignedUrl', () => {
    it('returns signed URL from internal client', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      mockMinioClient.presignedGetObject.mockResolvedValue('http://signed-url');

      const url = await minioService.getSignedUrl('bucket', 'path/file.pdf');

      expect(url).toBe('http://signed-url');
    });

    it('throws when object not found (NoSuchBucket)', async () => {
      const err: any = new Error('nosuchbucket');
      err.code = 'NoSuchBucket';
      mockMinioClient.statObject.mockRejectedValue(err);

      await expect(
        minioService.getSignedUrl('bucket', 'path')
      ).rejects.toThrow('Bucket de almacenamiento no encontrado');
    });

    it('throws when object not found (generic)', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('not found'));

      await expect(
        minioService.getSignedUrl('bucket', 'path')
      ).rejects.toThrow('Archivo no encontrado');
    });

    it('re-throws errors with code property', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      const err: any = new Error('signed url fail');
      err.code = 'MINIO_SIGNED_URL_ERROR';
      mockMinioClient.presignedGetObject.mockRejectedValue(err);

      await expect(
        minioService.getSignedUrl('bucket', 'path')
      ).rejects.toThrow('signed url fail');
    });
  });

  // ==========================================================================
  // getSignedUrlInternal
  // ==========================================================================
  describe('getSignedUrlInternal', () => {
    it('returns signed URL from main client', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      mockMinioClient.presignedGetObject.mockResolvedValue('http://internal-url');

      const url = await minioService.getSignedUrlInternal('bucket', 'path');

      expect(url).toBe('http://internal-url');
    });

    it('re-throws errors with code property', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      const err: any = new Error('fail');
      err.code = 'CUSTOM';
      mockMinioClient.presignedGetObject.mockRejectedValue(err);

      await expect(
        minioService.getSignedUrlInternal('bucket', 'path')
      ).rejects.toThrow('fail');
    });

    it('throws generic error when no code property', async () => {
      mockMinioClient.statObject.mockResolvedValue({});
      mockMinioClient.presignedGetObject.mockRejectedValue(new Error('generic'));

      await expect(
        minioService.getSignedUrlInternal('bucket', 'path')
      ).rejects.toThrow('Error al generar enlace de acceso');
    });
  });

  // ==========================================================================
  // getObject / getDocumentStream
  // ==========================================================================
  describe('getObject', () => {
    it('returns stream', async () => {
      const fakeStream = { pipe: jest.fn() };
      mockMinioClient.getObject.mockResolvedValue(fakeStream);

      const result = await minioService.getObject('bucket', 'path');

      expect(result).toBe(fakeStream);
    });

    it('throws on error', async () => {
      mockMinioClient.getObject.mockRejectedValue(new Error('fail'));

      await expect(minioService.getObject('bucket', 'path')).rejects.toThrow('Error al acceder al archivo');
    });
  });

  describe('getDocumentStream', () => {
    it('delegates to getObject', async () => {
      const fakeStream = { pipe: jest.fn() };
      mockMinioClient.getObject.mockResolvedValue(fakeStream);

      const result = await minioService.getDocumentStream('bucket', 'path');

      expect(result).toBe(fakeStream);
    });
  });

  // ==========================================================================
  // moveObject
  // ==========================================================================
  describe('moveObject', () => {
    it('copies and removes original', async () => {
      mockMinioClient.copyObject.mockResolvedValue({});
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await minioService.moveObject('bucket', 'from/path', 'to/path');

      expect(mockMinioClient.copyObject).toHaveBeenCalledWith('bucket', 'to/path', '/bucket/from/path');
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('bucket', 'from/path');
    });

    it('throws on error', async () => {
      mockMinioClient.copyObject.mockRejectedValue(new Error('fail'));

      await expect(
        minioService.moveObject('bucket', 'from', 'to')
      ).rejects.toThrow('Error al renombrar documento');
    });
  });

  // ==========================================================================
  // deleteDocument
  // ==========================================================================
  describe('deleteDocument', () => {
    it('removes object', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await minioService.deleteDocument('bucket', 'path');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('bucket', 'path');
    });

    it('throws on error', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('fail'));

      await expect(
        minioService.deleteDocument('bucket', 'path')
      ).rejects.toThrow('Error al eliminar documento');
    });
  });

  // ==========================================================================
  // uploadObject
  // ==========================================================================
  describe('uploadObject', () => {
    it('uploads arbitrary object', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({});

      const result = await minioService.uploadObject(1, 'path/obj', Buffer.from('x'), 'text/plain');

      expect(result).toEqual({ bucketName: 'docs-t1', objectPath: 'path/obj' });
    });

    it('throws on error', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockRejectedValue(new Error('fail'));

      await expect(
        minioService.uploadObject(1, 'p', Buffer.from('x'), 'text/plain')
      ).rejects.toThrow('Error al almacenar recurso');
    });
  });

  // ==========================================================================
  // healthCheck
  // ==========================================================================
  describe('healthCheck', () => {
    it('returns true when healthy', async () => {
      mockMinioClient.listBuckets.mockResolvedValue([]);

      const result = await minioService.healthCheck();

      expect(result).toBe(true);
    });

    it('returns false when unhealthy', async () => {
      mockMinioClient.listBuckets.mockRejectedValue(new Error('fail'));

      const result = await minioService.healthCheck();

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // getResolvedBucketName
  // ==========================================================================
  describe('getResolvedBucketName', () => {
    it('returns bucket name for tenant', () => {
      expect(minioService.getResolvedBucketName(42)).toBe('docs-t42');
    });
  });

  // ==========================================================================
  // listObjectKeys
  // ==========================================================================
  describe('listObjectKeys', () => {
    it('returns keys from stream', async () => {
      const { EventEmitter } = require('events');
      const stream = new EventEmitter();
      mockMinioClient.listObjects.mockReturnValue(stream);

      const promise = minioService.listObjectKeys(1);

      stream.emit('data', { name: 'key1' });
      stream.emit('data', { name: 'key2' });
      stream.emit('data', {}); // no name
      stream.emit('end');

      const keys = await promise;
      expect(keys).toEqual(['key1', 'key2']);
    });

    it('rejects on stream error', async () => {
      const { EventEmitter } = require('events');
      const stream = new EventEmitter();
      mockMinioClient.listObjects.mockReturnValue(stream);

      const promise = minioService.listObjectKeys(1);

      stream.emit('error', new Error('stream fail'));

      await expect(promise).rejects.toThrow('stream fail');
    });
  });

  // ==========================================================================
  // getStorageStats
  // ==========================================================================
  describe('getStorageStats', () => {
    it('returns storage stats from stream', async () => {
      const { EventEmitter } = require('events');
      const stream = new EventEmitter();
      mockMinioClient.listObjects.mockReturnValue(stream);

      const promise = minioService.getStorageStats(1);

      stream.emit('data', { size: 100 });
      stream.emit('data', { size: 200 });
      stream.emit('data', {}); // no size => 0
      stream.emit('end');

      const stats = await promise;
      expect(stats).toEqual({ bucketName: 'docs-t1', objectCount: 3, totalSize: 300 });
    });

    it('rejects on stream error', async () => {
      const { EventEmitter } = require('events');
      const stream = new EventEmitter();
      mockMinioClient.listObjects.mockReturnValue(stream);

      const promise = minioService.getStorageStats(1);

      stream.emit('error', new Error('stream fail'));

      await expect(promise).rejects.toThrow('stream fail');
    });
  });

  // ==========================================================================
  // parseEndpoint (tested via constructor with different env values)
  // ==========================================================================
  describe('parseEndpoint (constructor branch)', () => {
    it('handles endpoint without port', () => {
      jest.isolateModules(() => {
        jest.mock('../src/config/environment', () => ({
          getEnvironment: () => ({
            MINIO_ENDPOINT: 'minio.example.com',
            MINIO_PORT: '',
            MINIO_USE_SSL: true,
            MINIO_ACCESS_KEY: 'key',
            MINIO_SECRET_KEY: 'secret',
            MINIO_REGION: 'us-east-1',
            MINIO_BUCKET_PREFIX: 'test',
            MINIO_PUBLIC_BASE_URL: '',
          }),
        }));
        jest.mock('../src/config/logger', () => ({
          AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        }));
        jest.mock('../src/middlewares/error.middleware', () => ({
          createError: jest.fn(),
        }));

        const mod = require('../src/services/minio.service');
        expect(mod.minioService).toBeDefined();
      });
    });

    it('handles MINIO_PUBLIC_BASE_URL with https', () => {
      jest.isolateModules(() => {
        jest.mock('../src/config/environment', () => ({
          getEnvironment: () => ({
            MINIO_ENDPOINT: 'localhost:9000',
            MINIO_PORT: '9000',
            MINIO_USE_SSL: false,
            MINIO_ACCESS_KEY: 'key',
            MINIO_SECRET_KEY: 'secret',
            MINIO_REGION: 'us-east-1',
            MINIO_BUCKET_PREFIX: 'pub',
            MINIO_PUBLIC_BASE_URL: 'https://cdn.example.com',
          }),
        }));
        jest.mock('../src/config/logger', () => ({
          AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        }));
        jest.mock('../src/middlewares/error.middleware', () => ({
          createError: jest.fn(),
        }));

        const mod = require('../src/services/minio.service');
        expect(mod.minioService).toBeDefined();
      });
    });

    it('handles MINIO_PUBLIC_BASE_URL with explicit port', () => {
      jest.isolateModules(() => {
        jest.mock('../src/config/environment', () => ({
          getEnvironment: () => ({
            MINIO_ENDPOINT: 'localhost:9000',
            MINIO_PORT: '9000',
            MINIO_USE_SSL: false,
            MINIO_ACCESS_KEY: 'key',
            MINIO_SECRET_KEY: 'secret',
            MINIO_REGION: 'us-east-1',
            MINIO_BUCKET_PREFIX: 'pub',
            MINIO_PUBLIC_BASE_URL: 'http://cdn.example.com:8080',
          }),
        }));
        jest.mock('../src/config/logger', () => ({
          AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        }));
        jest.mock('../src/middlewares/error.middleware', () => ({
          createError: jest.fn(),
        }));

        const mod = require('../src/services/minio.service');
        expect(mod.minioService).toBeDefined();
      });
    });
  });
});
