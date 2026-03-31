/**
 * MinIO Client Mock for Unit Tests
 * Provides mock implementations of MinIO S3-compatible storage methods
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MockMinioClient {
  putObject: any;
  getObject: any;
  statObject: any;
  removeObject: any;
  bucketExists: any;
  makeBucket: any;
  removeBucket: any;
  listObjects: any;
  presignedGetObject: any;
  presignedPutObject: any;
}

/**
 * File size limits by attachment type (in bytes)
 */
export const FILE_LIMITS = {
  image: 10 * 1024 * 1024,      // 10MB
  audio: 25 * 1024 * 1024,      // 25MB
  video: 50 * 1024 * 1024,      // 50MB
  document: 25 * 1024 * 1024    // 25MB
};

/**
 * Create a mock MinIO client instance
 */
export function createMinioMock(): MockMinioClient {
  const mockFn = (): any => jest.fn();

  return {
    putObject: mockFn().mockResolvedValue({ etag: 'test-etag-12345', versionId: null }),
    
    getObject: mockFn().mockImplementation(() => {
      // Return a readable stream mock
      return Promise.resolve({
        on: mockFn().mockImplementation(function(this: any, event: string, cb: any) {
          if (event === 'data') {
            cb(Buffer.from('test file content'));
          }
          if (event === 'end') {
            cb();
          }
          return this;
        }),
        pipe: mockFn().mockReturnThis(),
      });
    }),
    
    statObject: mockFn().mockResolvedValue({
      size: 1024,
      metaData: { 'content-type': 'application/pdf' },
      lastModified: new Date(),
      etag: 'test-etag-12345',
    }),
    
    removeObject: mockFn().mockResolvedValue(undefined),
    
    bucketExists: mockFn().mockResolvedValue(true),
    
    makeBucket: mockFn().mockResolvedValue(undefined),
    
    removeBucket: mockFn().mockResolvedValue(undefined),
    
    listObjects: mockFn().mockImplementation(() => ({
      on: mockFn().mockImplementation(function(this: any, event: string, cb: any) {
        if (event === 'data') {
          cb({ name: 'test-file.pdf', size: 1024 });
        }
        if (event === 'end') {
          cb();
        }
        return this;
      }),
    })),
    
    presignedGetObject: mockFn().mockResolvedValue(
      'https://minio.example.com/bucket/object?X-Amz-Signature=test'
    ),
    
    presignedPutObject: mockFn().mockResolvedValue(
      'https://minio.example.com/bucket/object?X-Amz-Signature=test-upload'
    ),
  };
}

/**
 * Create a mock readable stream for file downloads
 */
export function createMockReadStream(content: Buffer = Buffer.from('test content')): any {
  const mockFn = (): any => jest.fn();
  
  return {
    on: mockFn().mockImplementation(function(this: any, event: string, cb: any) {
      if (event === 'data') {
        cb(content);
      }
      if (event === 'end') {
        cb();
      }
      return this;
    }),
    pipe: mockFn().mockReturnThis(),
    read: mockFn().mockReturnValue(content),
  };
}

/**
 * Mock for MinIO errors
 */
export class MockMinioError extends Error {
  public code: string;
  public statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'MinioError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Common MinIO error factories
 */
export const MinioErrors = {
  NoSuchBucket: (bucket: string = 'test-bucket') => 
    new MockMinioError(`The specified bucket does not exist: ${bucket}`, 'NoSuchBucket', 404),
  
  NoSuchKey: (key: string = 'test-key') => 
    new MockMinioError(`The specified key does not exist: ${key}`, 'NoSuchKey', 404),
  
  AccessDenied: () => 
    new MockMinioError('Access Denied', 'AccessDenied', 403),
  
  EntityTooLarge: (size: number = 100000000) => 
    new MockMinioError(`Your proposed upload exceeds the maximum allowed object size: ${size}`, 'EntityTooLarge', 400),
  
  InternalError: () => 
    new MockMinioError('Internal Server Error', 'InternalError', 500),
};

/**
 * Create mock file upload data for multipart/form-data tests
 */
export function createMockFileUpload(
  filename: string = 'test.pdf',
  mimetype: string = 'application/pdf',
  size: number = 1024
): { fieldname: string; originalname: string; encoding: string; mimetype: string; size: number; buffer: Buffer } {
  return {
    fieldname: 'attachments',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size,
    buffer: Buffer.alloc(size, 'a'),
  };
}

/**
 * Create mock image upload data
 */
export function createMockImageUpload(filename: string = 'test.jpg'): ReturnType<typeof createMockFileUpload> {
  return createMockFileUpload(filename, 'image/jpeg', 500 * 1024); // 500KB
}

/**
 * Create mock audio upload data
 */
export function createMockAudioUpload(filename: string = 'test.mp3'): ReturnType<typeof createMockFileUpload> {
  return createMockFileUpload(filename, 'audio/mpeg', 2 * 1024 * 1024); // 2MB
}

/**
 * Create mock video upload data
 */
export function createMockVideoUpload(filename: string = 'test.mp4'): ReturnType<typeof createMockFileUpload> {
  return createMockFileUpload(filename, 'video/mp4', 5 * 1024 * 1024); // 5MB
}
