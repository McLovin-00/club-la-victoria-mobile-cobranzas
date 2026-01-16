import { resetPrismaMock } from '../mocks/prisma.mock';

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({ MINIO_PUBLIC_BASE_URL: 'http://public', MINIO_INTERNAL_BASE_URL: 'http://internal' }),
}));

jest.mock('../../src/controllers/flowise-config.controller', () => ({
  getCurrentFlowiseConfig: jest.fn(async () => ({ enabled: true, baseUrl: 'http://flowise/', flowId: 'fid', apiKey: 'k' })),
}));

jest.mock('axios');
import axios from 'axios';

jest.mock('fs', () => ({ promises: { rm: jest.fn() } }));
jest.mock('os', () => ({ tmpdir: () => '/tmp' }));

// Mock poppler execution + fs/promises for raster path building
jest.mock('child_process', () => ({ execFile: jest.fn((_c: any, _a: any, _o: any, cb: any) => cb(null, { stdout: '', stderr: '' })) }));
jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn(async () => '/tmp/dir'),
  writeFile: jest.fn(async () => undefined),
  readdir: jest.fn(async () => ['page-1.png']),
  readFile: jest.fn(async (_p: string) => Buffer.from('img')),
}));

import { FlowiseService } from '../../src/services/flowise.service';
import { getCurrentFlowiseConfig } from '../../src/controllers/flowise-config.controller';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FlowiseService', () => {
  beforeEach(() => {
    resetPrismaMock();
    jest.clearAllMocks();
  });

  it('extractDocumentText returns error when disabled', async () => {
    (getCurrentFlowiseConfig as jest.Mock).mockResolvedValueOnce({ enabled: false, baseUrl: '', flowId: '', apiKey: '' });
    const svc = FlowiseService.getInstance();
    const out = await svc.extractDocumentText('http://x', 'AUTO');
    expect(out.success).toBe(false);
  });

  it('extractDocumentText handles image flow (axios.get + axios.post)', async () => {
    const svc = FlowiseService.getInstance();
    mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { text: 'Entidad: DADOR\nId_Entidad: 123\nComprobante: x\nVencimiento: 01/01/2025' },
    } as any);
    const out = await svc.extractDocumentText('http://public/bucket/x.png', 'AUTO');
    expect(out.success).toBe(true);
  });

  it('extractDocumentText handles PDF flow via raster+chunk upload', async () => {
    const svc = FlowiseService.getInstance();
    mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('%PDF'), headers: { 'content-type': 'application/pdf' } } as any);
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { text: 'Entidad: DADOR\nId_Entidad: 123\nComprobante: x\nVencimiento: 01/01/2025' },
    } as any);
    const out = await svc.extractDocumentText('http://public/bucket/x.pdf', 'AUTO');
    expect(out.success).toBe(true);
  });

  it('classifyDocument maps aiParsed metadata', async () => {
    const svc = FlowiseService.getInstance();
    mockedAxios.get.mockResolvedValueOnce({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } } as any);
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { text: 'Entidad: DADOR\nId_Entidad: 123\nComprobante: x\nVencimiento: 01/01/2025' },
    } as any);
    const out = await svc.classifyDocument('http://public/bucket/x.png');
    expect(out.success).toBe(true);
    expect(out.entityId).toBe(123);
  });
});


