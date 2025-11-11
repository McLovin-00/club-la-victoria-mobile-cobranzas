jest.mock('archiver', () => {
  const { PassThrough } = require('stream');
  return function mockArchiver() {
    const out = new PassThrough();
    (out as any).append = jest.fn();
    (out as any).finalize = () => { setImmediate(() => (out as any).end()); };
    return out;
  };
});

jest.mock('../src/services/minio.service', () => ({
  minioService: {
    getObject: async () => {
      const { PassThrough } = require('stream');
      return new PassThrough();
    },
    uploadObject: async (_tenant: number, objectPath: string) => ({ bucketName: 'test-bucket', objectPath }),
  },
}));

describe('DocumentZipService worker mode', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, NODE_ENV: 'test', ZIP_USE_WORKER: 'true', ZIP_ENABLE_ASYNC: 'true' };
  });
  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('completes job using worker for empty set', async () => {
    const { DocumentZipService } = require('../src/services/document-zip.service');
    const jobId = DocumentZipService.enqueueZipJob(1, []);
    const deadline = Date.now() + 8000;
    let job;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      job = DocumentZipService.getJob(jobId);
      if (job?.status === 'completed') break;
      if (job?.status === 'failed') throw new Error('Job failed in worker mode');
      if (Date.now() > deadline) throw new Error('Timeout waiting job (worker)');
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(job?.artifact).toBeTruthy();
  });
});


