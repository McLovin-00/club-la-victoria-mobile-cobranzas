export const mockMinioService = {
  getInstance: jest.fn().mockReturnThis(),
  ensureBucketExists: jest.fn(),
  uploadDocument: jest.fn().mockResolvedValue({
    bucketName: 'test-bucket',
    objectPath: 'test/path.pdf'
  }),
  getSignedUrl: jest.fn().mockResolvedValue('http://test.url/signed'),
  getSignedUrlInternal: jest.fn().mockResolvedValue('http://test.url/signed'),
  getObject: jest.fn().mockResolvedValue({
    on: jest.fn().mockReturnThis(),
    pipe: jest.fn().mockReturnThis()
  }),
  getDocumentStream: jest.fn().mockResolvedValue({}),
  moveObject: jest.fn(),
  deleteDocument: jest.fn(),
  uploadObject: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue(true),
  getStorageStats: jest.fn(),
  presignedGetObject: jest.fn().mockResolvedValue('http://test.url/signed')
};
