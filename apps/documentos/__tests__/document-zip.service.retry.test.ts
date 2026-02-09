jest.mock('archiver', () => {
  const { PassThrough } = require('stream');
  return function mockArchiver() {
    const out = new PassThrough();
    // minimal API used by service
    (out as any).append = jest.fn();
    (out as any).finalize = () => {
      // simulate async pipeline end (source ends → dest.finish)
      setImmediate(() => (out as any).end());
    };
    return out;
  };
});

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    getObject: async () => {
      // return empty stream
      const { PassThrough } = require('stream');
      return new PassThrough();
    },
    uploadObject: async (_tenant: number, objectPath: string) => ({
      bucketName: 'test-bucket',
      objectPath,
    }),
  },
}));

// Avoid real DB calls when equipoIds=[]
// Do not mock prisma here; equipoIds=[] avoids DB usage

describe('DocumentZipService retries', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, NODE_ENV: 'test', ZIP_ENABLE_ASYNC: 'true', ZIP_FORCE_FAIL_FIRST: 'true', DOCUMENT_ZIP_MAX_RETRIES: '2' };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('retries once and completes', async () => {
    const { DocumentZipService } = require('../src/services/document-zip.service');
    const jobId = DocumentZipService.enqueueZipJob(1, []); // empty equipos → quick zip
    // Poll for completion with timeout
    const deadline = Date.now() + 15000;

    let job;
     
    while (true) {
      job = DocumentZipService.getJob(jobId);
      if (job?.status === 'completed') break;
      if (job?.status === 'failed') {
        throw new Error('Job failed unexpectedly');
      }
      if (Date.now() > deadline) throw new Error('Timeout waiting job');
      // wait a bit
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(job?.status).toBe('completed');
    expect(job?.artifact).toBeTruthy();
  }, 20000);
});



