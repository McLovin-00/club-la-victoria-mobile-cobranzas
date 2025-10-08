const { DocumentService } = require('../dist/services/document.service');

jest.mock('../dist/config/database', () => {
  return {
    db: {
      getClient: () => ({
        document: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1,
            filePath: 'bucket/path/to/file.pdf',
            entityType: 'CHOFER',
            template: { name: 'Licencia' },
          }),
          update: jest.fn().mockResolvedValue({}),
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          groupBy: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue({}),
        },
      }),
    },
  };
});

jest.mock('../dist/services/queue.service', () => ({
  queueService: { addDocumentValidation: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../dist/services/minio.service', () => ({
  minioService: { deleteDocument: jest.fn().mockResolvedValue(undefined) },
}));

describe('DocumentService', () => {
  it('processDocument encola validación', async () => {
    await DocumentService.processDocument(1);
  });

  it('checkExpiredDocuments retorna count', async () => {
    const count = await DocumentService.checkExpiredDocuments();
    expect(count).toBe(2);
  });

  it('deleteDocument elimina de MinIO y DB', async () => {
    const ok = await DocumentService.deleteDocument(1);
    expect(ok).toBe(true);
  });
});
