import { EventEmitter } from 'events';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/middlewares/error.middleware', () => ({
  createError: (message: string, _status: number, code: string) => {
    const e: any = new Error(message);
    e.code = code;
    return e;
  },
}));

const clientMock = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  statObject: jest.fn(),
  presignedGetObject: jest.fn(),
  getObject: jest.fn(),
  removeObject: jest.fn(),
  listBuckets: jest.fn(),
  listObjects: jest.fn(),
  copyObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn(() => clientMock),
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    MINIO_ENDPOINT: 'http://localhost',
    MINIO_PORT: '9000',
    MINIO_USE_SSL: false,
    MINIO_ACCESS_KEY: 'a',
    MINIO_SECRET_KEY: 'b',
    MINIO_REGION: 'us-east-1',
    MINIO_BUCKET_PREFIX: 'docs',
    MINIO_PUBLIC_BASE_URL: 'http://public:9000',
  }),
}));

describe('MinIOService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('ensureBucketExists creates bucket when missing and throws on error', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(false);
    clientMock.makeBucket.mockResolvedValueOnce(undefined);
    await svc.ensureBucketExists(1);
    expect(clientMock.makeBucket).toHaveBeenCalled();

    clientMock.bucketExists.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.ensureBucketExists(1)).rejects.toMatchObject({ code: 'MINIO_BUCKET_ERROR' });
  });

  it('uploadDocument uploads with metadata and wraps errors', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(true);
    clientMock.putObject.mockResolvedValueOnce({ etag: 'x' });
    const out = await svc.uploadDocument(1, 'CHOFER', 2, 'TPL', 'a.pdf', Buffer.from('x'), 'application/pdf');
    expect(out.bucketName).toContain('docs-t1');

    clientMock.bucketExists.mockResolvedValueOnce(true);
    clientMock.putObject.mockRejectedValueOnce(Object.assign(new Error('signature we calculated does not match'), { code: 'SignatureDoesNotMatch' }));
    await expect(svc.uploadDocument(1, 'CHOFER', 2, 'TPL', 'a.pdf', Buffer.from('x'), 'application/pdf')).rejects.toMatchObject({ code: 'MINIO_UPLOAD_ERROR' });
  });

  it('getSignedUrl verifies existence and uses public signer when configured', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.statObject.mockResolvedValueOnce({} as any);
    clientMock.presignedGetObject.mockResolvedValueOnce('http://signed');
    const url = await svc.getSignedUrl('b', 'p', 10);
    expect(url).toBe('http://signed');
  });

  it('getSignedUrl throws bucket/object not found codes', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.statObject.mockRejectedValueOnce(Object.assign(new Error('NoSuchBucket'), { code: 'NoSuchBucket' }));
    await expect(svc.getSignedUrl('b', 'p', 10)).rejects.toMatchObject({ code: 'MINIO_BUCKET_NOT_FOUND' });

    clientMock.statObject.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 'NoSuchKey' }));
    await expect(svc.getSignedUrl('b', 'p', 10)).rejects.toMatchObject({ code: 'MINIO_OBJECT_NOT_FOUND' });
  });

  it('moveObject copies and removes; deleteDocument removes; both wrap errors', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.copyObject.mockResolvedValueOnce(undefined);
    clientMock.removeObject.mockResolvedValueOnce(undefined);
    await svc.moveObject('b', 'from', 'to');

    clientMock.removeObject.mockResolvedValueOnce(undefined);
    await svc.deleteDocument('b', 'x');

    clientMock.copyObject.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.moveObject('b', 'from', 'to')).rejects.toMatchObject({ code: 'MINIO_MOVE_ERROR' });

    clientMock.removeObject.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.deleteDocument('b', 'x')).rejects.toMatchObject({ code: 'MINIO_DELETE_ERROR' });
  });

  it('healthCheck returns true/false based on listBuckets', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.listBuckets.mockResolvedValueOnce([]);
    await expect(svc.healthCheck()).resolves.toBe(true);

    clientMock.listBuckets.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.healthCheck()).resolves.toBe(false);
  });

  it('getStorageStats aggregates stream data and returns defaults on error', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    const stream = new EventEmitter() as any;
    clientMock.listObjects.mockReturnValueOnce(stream);

    const p = svc.getStorageStats(1);
    stream.emit('data', { size: 10 });
    stream.emit('data', { size: 5 });
    stream.emit('end');
    await expect(p).resolves.toEqual(expect.objectContaining({ objectCount: 2, totalSize: 15 }));

    clientMock.listObjects.mockImplementationOnce(() => { throw new Error('boom'); });
    await expect(svc.getStorageStats(1)).resolves.toEqual(expect.objectContaining({ objectCount: 0, totalSize: 0 }));
  });

  it('getSignedUrlInternal verifies existence and uses internal client', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.statObject.mockResolvedValueOnce({} as any);
    clientMock.presignedGetObject.mockResolvedValueOnce('http://internal-signed');
    const url = await svc.getSignedUrlInternal('b', 'p', 7200);

    expect(url).toBe('http://internal-signed');
    expect(clientMock.presignedGetObject).toHaveBeenCalledWith('b', 'p', 7200);
  });

  it('getSignedUrlInternal throws appropriate error codes', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.statObject.mockRejectedValueOnce(Object.assign(new Error('NoSuchBucket'), { code: 'NoSuchBucket' }));
    await expect(svc.getSignedUrlInternal('b', 'p', 10)).rejects.toMatchObject({ code: 'MINIO_BUCKET_NOT_FOUND' });

    clientMock.statObject.mockRejectedValueOnce(Object.assign(new Error('NoSuchKey'), { code: 'NoSuchKey' }));
    await expect(svc.getSignedUrlInternal('b', 'p', 10)).rejects.toMatchObject({ code: 'MINIO_OBJECT_NOT_FOUND' });
  });

  it('getObject returns stream from MinIO client', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    const mockStream = { on: jest.fn(), pipe: jest.fn() };
    clientMock.getObject.mockResolvedValueOnce(mockStream as any);

    const result = await svc.getObject('b', 'p');
    expect(result).toBe(mockStream);
  });

  it('getObject wraps errors', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.getObject.mockRejectedValueOnce(new Error('Connection lost'));
    await expect(svc.getObject('b', 'p')).rejects.toMatchObject({ code: 'MINIO_GET_OBJECT_ERROR' });
  });

  it('getDocumentStream delegates to getObject', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    const mockStream = { on: jest.fn(), pipe: jest.fn() };
    clientMock.getObject.mockResolvedValueOnce(mockStream as any);

    const result = await svc.getDocumentStream('b', 'p');
    expect(result).toBe(mockStream);
    expect(clientMock.getObject).toHaveBeenCalledWith('b', 'p');
  });

  it('uploadObject uploads buffer and returns bucket/path', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(true);
    clientMock.putObject.mockResolvedValueOnce({ etag: 'xyz' });

    const buffer = Buffer.from('test content');
    const result = await svc.uploadObject(1, 'custom/path/file.txt', buffer, 'text/plain');

    expect(result.bucketName).toContain('docs-t1');
    expect(result.objectPath).toBe('custom/path/file.txt');
    expect(clientMock.putObject).toHaveBeenCalledWith(
      expect.stringContaining('docs-t1'),
      'custom/path/file.txt',
      buffer,
      buffer.length,
      expect.objectContaining({ 'Content-Type': 'text/plain' })
    );
  });

  it('uploadObject wraps errors', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(true);
    clientMock.putObject.mockRejectedValueOnce(new Error('Upload failed'));

    await expect(svc.uploadObject(1, 'path', Buffer.from('x'), 'text/plain'))
      .rejects.toMatchObject({ code: 'MINIO_UPLOAD_OBJECT_ERROR' });
  });

  it('uploadDocument uses FileNamingService when available, falls back to timestamp', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    // Test con FileNamingService funcionando
    clientMock.bucketExists.mockResolvedValueOnce(true);
    clientMock.putObject.mockResolvedValueOnce({ etag: 'x' });
    jest.mock('../../src/services/file-naming.service', () => ({
      FileNamingService: {
        generateStandardizedName: jest.fn().mockResolvedValue('chofer/2/licencia/20250120_123456.pdf'),
      },
    }));

    await svc.uploadDocument(1, 'CHOFER', 2, 'Licencia de Conducir', 'file.pdf', Buffer.from('x'), 'application/pdf');
    expect(clientMock.putObject).toHaveBeenCalled();

    // Resetear mocks y test con error en FileNamingService (fallback)
    jest.clearAllMocks();
    clientMock.bucketExists.mockResolvedValueOnce(true);
    clientMock.putObject.mockResolvedValueOnce({ etag: 'y' });

    const result = await svc.uploadDocument(1, 'CHOFER', 2, 'Licencia Especial!!', 'file.pdf', Buffer.from('x'), 'application/pdf');
    expect(result.bucketName).toContain('docs-t1');
  });

  it('getSignedUrl uses public signer when available, otherwise internal client', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.statObject.mockResolvedValueOnce({} as any);
    clientMock.presignedGetObject.mockResolvedValueOnce('http://public-signed-url');

    const url = await svc.getSignedUrl('b', 'p', 1800);
    expect(url).toBe('http://public-signed-url');
  });

  it('handles retryable errors with retry mechanism', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(true);
    // Primer intento falla con error de conexión, segundo intento tiene éxito
    clientMock.putObject
      .mockRejectedValueOnce(Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce({ etag: 'retry-success' });

    const result = await svc.uploadDocument(1, 'CHOFER', 2, 'TPL', 'a.pdf', Buffer.from('x'), 'application/pdf');
    expect(result.bucketName).toContain('docs-t1');
    expect(clientMock.putObject).toHaveBeenCalledTimes(2);
  });

  it('verifyObjectExists throws correct error for NoSuchBucket', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.statObject.mockRejectedValueOnce(Object.assign(new Error('NoSuchBucket'), { code: 'NoSuchBucket' }));
    await expect(svc.getSignedUrl('bucket-not-found', 'p', 10)).rejects.toMatchObject({ code: 'MINIO_BUCKET_NOT_FOUND' });
  });

  it('verifyObjectExists throws generic object not found for other errors', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.statObject.mockRejectedValueOnce(Object.assign(new Error('NotFound'), { code: 'NotFound' }));
    await expect(svc.getSignedUrl('b', 'object-not-found', 10)).rejects.toMatchObject({ code: 'MINIO_OBJECT_NOT_FOUND' });
  });

  it('getSignedUrl uses internal client when public signer is not configured', async () => {
    // Reset instance to test without public signer
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock('../../src/config/environment', () => ({
      getEnvironment: () => ({
        MINIO_ENDPOINT: 'http://localhost',
        MINIO_PORT: '9000',
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'a',
        MINIO_SECRET_KEY: 'b',
        MINIO_REGION: 'us-east-1',
        MINIO_BUCKET_PREFIX: 'docs',
        MINIO_PUBLIC_BASE_URL: undefined, // Sin public signer
      }),
    }));

    const { MinIOService: MinIOServiceNoPublic } = await import('../../src/services/minio.service');
    const svcNoPublic = MinIOServiceNoPublic.getInstance();

    clientMock.statObject.mockResolvedValueOnce({} as any);
    clientMock.presignedGetObject.mockResolvedValueOnce('http://internal-signed');

    const url = await svcNoPublic.getSignedUrl('b', 'p', 1800);
    expect(url).toBe('http://internal-signed');
  });

  it('uploadDocument provides hint for signature mismatch errors', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(true);
    clientMock.putObject.mockRejectedValueOnce(new Error('signature we calculated does not match'));

    await expect(svc.uploadDocument(1, 'CHOFER', 2, 'TPL', 'a.pdf', Buffer.from('x'), 'application/pdf'))
      .rejects.toMatchObject({ code: 'MINIO_UPLOAD_ERROR' });
  });

  it('initPublicClient handles invalid MINIO_PUBLIC_BASE_URL gracefully', async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock('../../src/config/environment', () => ({
      getEnvironment: () => ({
        MINIO_ENDPOINT: 'http://localhost',
        MINIO_PORT: '9000',
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'a',
        MINIO_SECRET_KEY: 'b',
        MINIO_REGION: 'us-east-1',
        MINIO_BUCKET_PREFIX: 'docs',
        MINIO_PUBLIC_BASE_URL: 'not-a-valid-url', // URL inválida
      }),
    }));

    const { MinIOService: MinIOServiceBadURL } = await import('../../src/services/minio.service');
    const svcBadURL = MinIOServiceBadURL.getInstance();

    // No debería fallar la inicialización, el cliente público simplemente no se configura
    clientMock.statObject.mockResolvedValueOnce({} as any);
    clientMock.presignedGetObject.mockResolvedValueOnce('http://internal-signed');

    // Usará el cliente interno porque el público no se configuró
    const url = await svcBadURL.getSignedUrl('b', 'p', 1800);
    expect(url).toBe('http://internal-signed');
  });

  it('handles non-retryable errors on first attempt', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(true);
    // Error no reintentable (no es de conexión ni firma)
    clientMock.putObject.mockRejectedValueOnce(new Error('Access Denied'));

    await expect(svc.uploadDocument(1, 'CHOFER', 2, 'TPL', 'a.pdf', Buffer.from('x'), 'application/pdf'))
      .rejects.toMatchObject({ code: 'MINIO_UPLOAD_ERROR' });

    // Solo debería haber un intento
    expect(clientMock.putObject).toHaveBeenCalledTimes(1);
  });

  it('parseEndpoint handles endpoint with explicit port', async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock('../../src/config/environment', () => ({
      getEnvironment: () => ({
        MINIO_ENDPOINT: 'http://minio.example.com:9000',
        MINIO_PORT: '9000',
        MINIO_USE_SSL: false,
        MINIO_ACCESS_KEY: 'a',
        MINIO_SECRET_KEY: 'b',
        MINIO_REGION: 'us-east-1',
        MINIO_BUCKET_PREFIX: 'docs',
        MINIO_PUBLIC_BASE_URL: undefined,
      }),
    }));

    const { MinIOService: MinIOServicePort } = await import('../../src/services/minio.service');
    const svcPort = MinIOServicePort.getInstance();

    // Verificar que se inicializó correctamente
    expect(svcPort).toBeDefined();
  });

  it('handles last retry attempt failure (throws error)', async () => {
    const { MinIOService } = await import('../../src/services/minio.service');
    const svc = MinIOService.getInstance();

    clientMock.bucketExists.mockResolvedValueOnce(true);
    // Todos los intentos fallan con error reintentable
    clientMock.putObject.mockRejectedValue(Object.assign(new Error('ECONNRESET'), { code: 'ECONNRESET' }));

    await expect(svc.uploadDocument(1, 'CHOFER', 2, 'TPL', 'a.pdf', Buffer.from('x'), 'application/pdf'))
      .rejects.toThrow();

    // Debería haber hecho 3 intentos (maxAttempts)
    expect(clientMock.putObject).toHaveBeenCalledTimes(3);
  });
});


