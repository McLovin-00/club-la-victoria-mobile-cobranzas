describe('document-zip.worker', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('posts ok=true when runJob succeeds', async () => {
    const postMessage = jest.fn();
    jest.doMock('worker_threads', () => ({
      parentPort: { postMessage },
      workerData: { jobId: '1', tenantEmpresaId: 1, equipoIds: [1, 2] },
    }));

    jest.doMock('../../src/services/document-zip.service', () => ({
      DocumentZipService: { runJob: jest.fn(async () => undefined) },
    }));

    await import('../../src/workers/document-zip.worker');
    // main() is async but posts message at the end; allow microtask flush
    await new Promise((r) => setTimeout(r, 0));
    expect(postMessage).toHaveBeenCalledWith({ ok: true });
  });

  it('posts ok=false when runJob throws', async () => {
    const postMessage = jest.fn();
    jest.doMock('worker_threads', () => ({
      parentPort: { postMessage },
      workerData: { jobId: '1', tenantEmpresaId: 1, equipoIds: [1] },
    }));

    jest.doMock('../../src/services/document-zip.service', () => ({
      DocumentZipService: { runJob: jest.fn(async () => { throw new Error('boom'); }) },
    }));

    await import('../../src/workers/document-zip.worker');
    await new Promise((r) => setTimeout(r, 0));
    expect(postMessage).toHaveBeenCalledWith({ ok: false, error: 'boom' });
  });
});


