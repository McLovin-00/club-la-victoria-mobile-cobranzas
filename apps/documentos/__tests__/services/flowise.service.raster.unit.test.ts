/**
 * Focused tests for FlowiseService PDF pipeline (rasterize + chunked upload + parsing)
 */

const axiosGet = jest.fn();
const axiosPost = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => axiosGet(...args),
    post: (...args: any[]) => axiosPost(...args),
  },
}));

const fsPromises = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  mkdtemp: jest.fn(),
  rm: jest.fn(),
};
jest.mock('fs', () => ({
  promises: fsPromises,
}));

const execFileMock = jest.fn();
jest.mock('child_process', () => ({
  execFile: (...args: any[]) => execFileMock(...args),
}));

const pdfLoadMock = jest.fn();
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: (...args: any[]) => pdfLoadMock(...args),
  },
}));

jest.mock('../../src/config/logger', () => ({
  AppLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../src/controllers/flowise-config.controller', () => ({
  getCurrentFlowiseConfig: jest.fn(async () => ({
    enabled: true,
    baseUrl: 'http://localhost:3000/',
    apiKey: 'k',
    flowId: 'flow',
  })),
}));

jest.mock('../../src/config/environment', () => ({
  getEnvironment: () => ({
    MINIO_PUBLIC_BASE_URL: 'https://public.example.com',
    MINIO_INTERNAL_BASE_URL: 'http://minio-internal',
  }),
}));

const minioGetSignedUrlInternalMock = jest.fn();
jest.mock('../../src/services/minio.service', () => ({
  minioService: {
    getSignedUrlInternal: (...args: any[]) => minioGetSignedUrlInternalMock(...args),
  },
}));

import { FlowiseService } from '../../src/services/flowise.service';

describe('FlowiseService raster pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FlowiseService as any).instance = undefined;
    process.env.PDF_RASTERIZE_FORMAT = 'png';
    process.env.PDF_RASTERIZE_DPI = '200';
    process.env.PDF_RASTERIZE_MAX_PAGES = '2';
    process.env.PDF_RASTERIZE_MAX_RETRY = '1';
    process.env.PDF_RASTERIZE_CHUNK_SIZE = '1';
  });

  it('extractDocumentText(pdf): should rasterize (fallback pdftoppm->pdftocairo), chunk-upload pages, parse tagged fields', async () => {
    minioGetSignedUrlInternalMock.mockResolvedValue('http://minio-internal/bucket/obj?sig=1');

    // Download PDF
    axiosGet.mockResolvedValueOnce({
      headers: { 'content-type': 'application/pdf' },
      data: new Uint8Array([1, 2, 3]).buffer,
    });

    // tmp dir + page images
    fsPromises.mkdtemp.mockResolvedValueOnce('C:\\tmp\\docs-raster-1');
    fsPromises.readdir.mockResolvedValueOnce(['page-1.png', 'page-2.png', 'note.txt']);

    // reads for prepareImageUpload
    fsPromises.readFile.mockImplementation(async (p: any) => {
      if (String(p).endsWith('.png')) return Buffer.from('img');
      return Buffer.from('%PDF');
    });

    // pdftoppm fails -> pdftocairo succeeds
    execFileMock.mockImplementation((bin: string, _args: any, _opts: any, cb: any) => {
      if (bin === 'pdftoppm') return cb(new Error('no pdftoppm'), '', '');
      return cb(null, '', '');
    });

    // Flowise response for first chunk succeeds
    axiosPost.mockResolvedValueOnce({
      status: 200,
      data: `Entidad: CHOFER\nId_Entidad: 123\nComprobante: DNI\nVencimiento: 01/01/2027`,
    });

    const svc = FlowiseService.getInstance();
    const out = await svc.extractDocumentText('https://public.example.com/bucket/path/file.pdf', 'DNI', { documentId: 10 });

    expect(minioGetSignedUrlInternalMock).toHaveBeenCalled();
    expect(out.success).toBe(true);
    expect(out.data?.metadata?.aiParsed).toEqual(
      expect.objectContaining({
        entidad: 'CHOFER',
        idEntidad: '123',
      })
    );
    expect(out.data?.metadata?.aiParsed?.vencimientoDate).toContain('2027');
  });

  it('extractDocumentText(image): should send image upload and parse success', async () => {
    axiosGet.mockResolvedValueOnce({
      headers: { 'content-type': 'image/png' },
      data: new Uint8Array([1, 2, 3]).buffer,
    });
    axiosPost.mockResolvedValueOnce({
      status: 200,
      data: { result: `Entidad: CAMION\nId_Entidad: 5\nComprobante: RTO Tractor\nVencimiento: Desconocido` },
    });

    const svc = FlowiseService.getInstance();
    const out = await svc.classifyDocument('https://public.example.com/bucket/path/file.png', 'RTO Tractor');

    expect(out.success).toBe(true);
    expect(out.entityType).toBe('CAMION');
    expect(out.entityId).toBe(5);
  });

  it('sendDirectRequest: should throw when Flowise returns non-200', async () => {
    axiosGet.mockResolvedValueOnce({
      headers: { 'content-type': 'image/png' },
      data: new Uint8Array([1, 2, 3]).buffer,
    });
    axiosPost.mockResolvedValueOnce({ status: 500, data: { ok: false } });

    const svc = FlowiseService.getInstance();
    const out = await svc.extractDocumentText('https://public.example.com/bucket/path/file.png', 'X');
    expect(out.success).toBe(false);
  });

  it('validateDocument: should apply entity-specific rules', async () => {
    // Force extractDocumentText to return known extractedText without hitting network
    const svc = FlowiseService.getInstance();
    jest.spyOn(svc, 'extractDocumentText')
      .mockResolvedValueOnce({
        success: true,
        data: { extractedText: 'LICENCIA 123456', confidence: 0.9, metadata: {} },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { extractedText: 'TEXTO SIN PATENTE', confidence: 0.9, metadata: {} },
      });

    const ok = await svc.validateDocument('x', 't', 'CHOFER');
    expect(ok.isValid).toBe(true);

    const bad = await svc.validateDocument('x', 't', 'CAMION');
    expect(bad.isValid).toBe(false);
  });

  it('healthCheck: should return false when disabled and true on 200', async () => {
    const svc = FlowiseService.getInstance();
    (svc as any).enabled = false;
    await expect(svc.healthCheck()).resolves.toBe(false);

    (svc as any).enabled = true;
    (svc as any).endpoint = 'http://localhost/api';
    (svc as any).apiKey = 'k';
    axiosGet.mockResolvedValueOnce({ status: 200 });
    await expect(svc.healthCheck()).resolves.toBe(true);
  });
});


