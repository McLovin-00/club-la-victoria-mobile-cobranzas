jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/controllers/flowise-config.controller', () => ({
  getCurrentFlowiseConfig: jest.fn(async () => ({ enabled: true, baseUrl: 'http://flowise', flowId: 'fid', apiKey: 'k' })),
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    MINIO_PUBLIC_BASE_URL: 'http://public',
    MINIO_INTERNAL_BASE_URL: 'http://internal',
  }),
}));

jest.mock('../../src/services/minio.service', () => ({
  minioService: { getSignedUrlInternal: jest.fn(async () => 'http://internal/signed') },
}));

jest.mock('axios');
import axios from 'axios';

// Force rasterization to fail first and succeed on fallback
jest.mock('child_process', () => ({
  execFile: jest.fn((cmd: any, _args: any, _opts: any, cb: any) => {
    if (cmd === 'pdftoppm') return cb(new Error('fail'));
    return cb(null, { stdout: '', stderr: '' });
  }),
}));

jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn(async () => '/tmp/dir'),
  writeFile: jest.fn(async () => undefined),
  readdir: jest.fn(async () => ['page-1.png']),
  readFile: jest.fn(async (_p: string) => Buffer.from('img')),
}));

jest.mock('fs', () => ({ promises: { rm: jest.fn() } }));
jest.mock('os', () => ({ tmpdir: () => '/tmp' }));

import { FlowiseService } from '../../src/services/flowise.service';
import { minioService } from '../../src/services/minio.service';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FlowiseService (more)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getInternalFileUrl uses internal signed url when hostname matches public base', async () => {
    const svc = FlowiseService.getInstance();
    mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { text: 'Entidad: CHOFER\nId_Entidad: 1\nComprobante: x\nVencimiento: 01/01/2025' } } as any);
    await svc.extractDocumentText('http://public/bucket/path.png', 'AUTO');
    expect(minioService.getSignedUrlInternal).toHaveBeenCalled();
  });

  it('parseFlowiseResponse returns error for invalid formats (via validateDocument)', async () => {
    const svc = FlowiseService.getInstance();
    mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { nope: true } } as any);
    const out = await svc.validateDocument('http://public/bucket/x.png', 'TPL', 'CHOFER');
    expect(out.isValid).toBe(false);
  });

  it('healthCheck returns false when disabled and when request fails', async () => {
    jest.resetModules();
    jest.doMock('../../src/controllers/flowise-config.controller', () => ({
      getCurrentFlowiseConfig: jest.fn(async () => ({ enabled: false, baseUrl: '', flowId: '', apiKey: '' })),
    }));
    const { FlowiseService: Svc2 } = await import('../../src/services/flowise.service');
    const svc2 = Svc2.getInstance();
    await expect(svc2.healthCheck()).resolves.toBe(false);

    jest.resetModules();
    const { FlowiseService: Svc3 } = await import('../../src/services/flowise.service');
    const svc3 = Svc3.getInstance();
    (axios as any).get.mockRejectedValueOnce(new Error('down'));
    await expect(svc3.healthCheck()).resolves.toBe(false);
  });

  it('sendDirectRequest invalid response results in extractDocumentText error (PDF fallback path)', async () => {
    const svc = FlowiseService.getInstance();
    mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('%PDF'), headers: { 'content-type': 'application/pdf' } } as any);
    mockedAxios.post.mockResolvedValueOnce({ status: 500, data: {} } as any);
    const out = await svc.extractDocumentText('http://public/bucket/x.pdf', 'AUTO');
    expect(out.success).toBe(false);
  });
});


