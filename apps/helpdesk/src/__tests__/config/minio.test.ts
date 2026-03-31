// Mock getEnvironment
jest.mock('../../config/environment');
const mockGetEnvironment = require('../../config/environment').getEnvironment;

import { Client as MinioClient } from 'minio';
import { getMinioClient, initializeBucket, getPresignedUrl, uploadFile, downloadFile, closeMinio } from '../../config/minio';

// Mock MinioClient
jest.mock('minio');
const MockMinioClient = MinioClient as jest.MockedClass<typeof MinioClient>;

describe('MinIO Configuration', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      presignedGetObject: jest.fn(),
      putObject: jest.fn(),
      getObject: jest.fn(),
    };

    MockMinioClient.mockImplementation(() => mockClient);

    mockGetEnvironment.mockReturnValue({
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_USE_SSL: false,
      MINIO_ACCESS_KEY: 'test-key',
      MINIO_SECRET_KEY: 'test-secret',
      MINIO_REGION: 'us-east-1',
      MINIO_BUCKET_PREFIX: 'helpdesk',
    });

    // Reset the cached client
    closeMinio();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMinioClient', () => {
    it('should create and return MinIO client', () => {
      const client = getMinioClient();

      expect(MockMinioClient).toHaveBeenCalledWith({
        endPoint: 'localhost',
        port: 9000,
        useSSL: false,
        accessKey: 'test-key',
        secretKey: 'test-secret',
        region: 'us-east-1',
      });
      expect(client).toBe(mockClient);
    });

    it('should return cached client on subsequent calls', () => {
      const client1 = getMinioClient();
      const client2 = getMinioClient();

      expect(client1).toBe(client2);
      expect(MockMinioClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeBucket', () => {
    it('should create bucket if it does not exist', async () => {
      mockClient.bucketExists.mockResolvedValue(false);
      mockClient.makeBucket.mockResolvedValue();

      await initializeBucket();

      expect(mockClient.bucketExists).toHaveBeenCalledWith('helpdesk-attachments');
      expect(mockClient.makeBucket).toHaveBeenCalledWith('helpdesk-attachments', 'us-east-1');
    });

    it('should not create bucket if it already exists', async () => {
      mockClient.bucketExists.mockResolvedValue(true);

      await initializeBucket();

      expect(mockClient.bucketExists).toHaveBeenCalledWith('helpdesk-attachments');
      expect(mockClient.makeBucket).not.toHaveBeenCalled();
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate presigned URL', async () => {
      const expectedUrl = 'https://example.com/presigned';
      mockClient.presignedGetObject.mockResolvedValue(expectedUrl);

      const url = await getPresignedUrl('test-object');

      expect(mockClient.presignedGetObject).toHaveBeenCalledWith('helpdesk-attachments', 'test-object', 3600);
      expect(url).toBe(expectedUrl);
    });
  });

  describe('uploadFile', () => {
    it('should upload file to MinIO', async () => {
      const buffer = Buffer.from('test content');
      const metadata = { 'content-type': 'text/plain' };

      await uploadFile('test-object', buffer, metadata);

      expect(mockClient.putObject).toHaveBeenCalledWith(
        'helpdesk-attachments',
        'test-object',
        buffer,
        buffer.length,
        metadata
      );
    });
  });

  describe('downloadFile', () => {
    it('should download file from MinIO', async () => {
      const mockStream = {
        on: jest.fn(),
      };
      mockClient.getObject.mockReturnValue(mockStream);

      mockStream.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('chunk1'));
          callback(Buffer.from('chunk2'));
        } else if (event === 'end') {
          callback();
        }
      });

      const result = await downloadFile('test-object');

      expect(mockClient.getObject).toHaveBeenCalledWith('helpdesk-attachments', 'test-object');
      expect(result).toEqual(Buffer.concat([Buffer.from('chunk1'), Buffer.from('chunk2')]));
    });
  });

  describe('closeMinio', () => {
    it('should reset the client', () => {
      getMinioClient(); // Initialize client
      closeMinio();

      // Next call should create new client
      const newClient = getMinioClient();
      expect(newClient).toBe(mockClient);
      expect(MockMinioClient).toHaveBeenCalledTimes(2);
    });
  });
});
