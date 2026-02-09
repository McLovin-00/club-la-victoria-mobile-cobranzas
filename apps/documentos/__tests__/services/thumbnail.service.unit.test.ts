import { Readable } from 'stream';
import { prismaMock, resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/database', () => ({
  db: { getClient: () => prismaMock },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ MINIO_BUCKET_PREFIX: 'documentos-empresa' }),
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { debug: jest.fn() },
}));

const minioService = {
  getSignedUrl: jest.fn(),
  getObject: jest.fn(),
  uploadObject: jest.fn(),
};
jest.mock('../../src/services/minio.service', () => ({
  minioService,
}));

jest.mock('sharp', () => {
  return () => ({
    rotate: () => ({
      resize: () => ({
        jpeg: () => ({
          toBuffer: async () => Buffer.from('thumb'),
        }),
      }),
    }),
  });
});

import { ThumbnailService } from '../../src/services/thumbnail.service';

describe('ThumbnailService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('getSignedUrl throws if document missing', async () => {
    prismaMock.document.findUnique.mockResolvedValueOnce(null);
    await expect(ThumbnailService.getSignedUrl(1)).rejects.toBeDefined();
  });

  it('getSignedUrl returns signed url when exists', async () => {
    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2 });
    minioService.getSignedUrl.mockResolvedValueOnce('url');
    await expect(ThumbnailService.getSignedUrl(1)).resolves.toBe('url');
  });

  it('getSignedUrl generates on not found and retries', async () => {
    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2 });
    minioService.getSignedUrl
      .mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 404 }))
      .mockResolvedValueOnce('url2');

    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, filePath: 'b/x.png', mimeType: 'image/png' });
    minioService.getObject.mockResolvedValueOnce(Readable.from([Buffer.from('img')]));
    minioService.uploadObject.mockResolvedValueOnce(undefined);

    await expect(ThumbnailService.getSignedUrl(1)).resolves.toBe('url2');
    expect(minioService.uploadObject).toHaveBeenCalled();
  });

  it('generate throws on unsupported mime', async () => {
    prismaMock.document.findUnique.mockResolvedValueOnce({ id: 1, tenantEmpresaId: 2, filePath: 'b/x.pdf', mimeType: 'application/pdf' });
    await expect(ThumbnailService.generate(1)).rejects.toBeDefined();
  });
});


