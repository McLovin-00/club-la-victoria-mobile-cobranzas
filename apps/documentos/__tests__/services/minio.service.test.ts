/**
 * Tests unitarios para MinioService
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
    removeObject: jest.fn().mockResolvedValue(undefined),
    presignedGetObject: jest.fn().mockResolvedValue('http://presigned-url'),
  })),
}));

import { MinioService } from '../../src/services/minio.service';

describe('MinioService', () => {
  let minioService: MinioService;

  beforeEach(() => {
    jest.clearAllMocks();
    minioService = new MinioService();
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const buffer = Buffer.from('test content');
      const fileName = 'test.pdf';
      const contentType = 'application/pdf';

      const result = await minioService.uploadFile(buffer, fileName, contentType);

      expect(result).toBeDefined();
    });
  });

  describe('getFile', () => {
    it('should retrieve a file', async () => {
      const result = await minioService.getFile('test-path/file.pdf');

      expect(result).toBeDefined();
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      await expect(minioService.deleteFile('test-path/file.pdf')).resolves.not.toThrow();
    });
  });

  describe('getPresignedUrl', () => {
    it('should return presigned URL', async () => {
      const result = await minioService.getPresignedUrl('test-path/file.pdf');

      expect(result).toContain('http');
    });
  });

  describe('fileExists', () => {
    it('should check if file exists', async () => {
      const result = await minioService.fileExists('test-path/file.pdf');

      expect(typeof result).toBe('boolean');
    });
  });
});
