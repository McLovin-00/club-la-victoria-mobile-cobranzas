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
});


