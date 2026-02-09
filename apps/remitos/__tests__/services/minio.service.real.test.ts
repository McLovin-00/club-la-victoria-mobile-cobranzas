/**
 * Tests reales para minio.service.ts
 * @jest-environment node
 */

const bucketExists = jest.fn();
const makeBucket = jest.fn();
const putObject = jest.fn();
const presignedGetObject = jest.fn().mockResolvedValue('http://signed');
const getObject = jest.fn();
const removeObject = jest.fn();

jest.mock('minio', () => ({
  Client: class MockMinioClient {
    bucketExists = bucketExists;
    makeBucket = makeBucket;
    putObject = putObject;
    presignedGetObject = presignedGetObject;
    getObject = getObject;
    removeObject = removeObject;
  },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_PORT: 9000,
    MINIO_USE_SSL: false,
    MINIO_ACCESS_KEY: 'a',
    MINIO_SECRET_KEY: 'b',
    MINIO_REGION: 'us-east-1',
  }),
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { minioService } from '../../src/services/minio.service';

describe('minioService (real)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uploadRemitoImage ensures bucket and uploads', async () => {
    bucketExists.mockResolvedValue(false);
    makeBucket.mockResolvedValue(undefined);
    putObject.mockResolvedValue(undefined);

    const out = await minioService.uploadRemitoImage(1, 2, 'a b.pdf', Buffer.from('x'), 'application/pdf');
    expect(makeBucket).toHaveBeenCalled();
    expect(putObject).toHaveBeenCalled();
    expect(out.bucketName).toContain('remitos-empresa-1');
  });

  it('getSignedUrl delegates to minio client', async () => {
    const out = await minioService.getSignedUrl('b', 'k', 10);
    expect(out).toBe('http://signed');
    expect(presignedGetObject).toHaveBeenCalledWith('b', 'k', 10);
  });
});


