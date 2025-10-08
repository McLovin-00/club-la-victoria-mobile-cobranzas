const { minioService } = require('../dist/services/minio.service');

jest.mock('minio', () => {
  return {
    Client: class {
      async bucketExists() { return false; }
      async makeBucket() { return; }
      async setBucketPolicy() { return; }
      async putObject() { return { etag: 'etag' }; }
      async statObject() { return { size: 1 }; }
      async presignedGetObject() { return 'http://signed-url'; }
      async getObject() { return { pipe: () => {} } as any; }
      async removeObject() { return; }
      listBuckets() { return Promise.resolve([] as any); }
      listObjects() {
        const { Readable } = require('stream');
        const r = new Readable({ objectMode: true, read() {} });
        process.nextTick(() => { r.push({ size: 42 }); r.push(null); });
        return r as any;
      }
    }
  };
});

describe('MinIOService', () => {
  it('uploadDocument retorna bucket y objectPath', async () => {
    const res = await minioService.uploadDocument(1, 'CHOFER', 1, 'Licencia', 'a.pdf', Buffer.from('x'), 'application/pdf');
    expect(res.bucketName).toContain('documentos-empresa');
    expect(res.objectPath).toContain('chofer');
  });

  it('getSignedUrl retorna url', async () => {
    const url = await minioService.getSignedUrl('b', 'o');
    expect(url).toContain('http');
  });
});
