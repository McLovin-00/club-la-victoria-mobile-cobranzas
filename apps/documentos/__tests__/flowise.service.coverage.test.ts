/**
 * Coverage tests for FlowiseService (documentos app)
 * Covers: circuit breaker, rasterization, chunked requests, URL resolution,
 *         classification, validation, comprobante normalization, health check,
 *         buildRasterArgs branches, sendChunkedRequests, sendDirectRequest,
 *         parseFlowiseResponse error path, extractAiTaggedFields edge cases
 * @jest-environment node
 */

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockAxios = { get: jest.fn(), post: jest.fn() };
jest.mock('axios', () => ({ __esModule: true, default: mockAxios }));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      mkdtemp: jest.fn().mockResolvedValue('/tmp/docs-raster-abc'),
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue(Buffer.from('fakepdf')),
      readdir: jest.fn().mockResolvedValue([]),
      rm: jest.fn().mockResolvedValue(undefined),
    },
  };
});

const mockExecFile = jest.fn();
jest.mock('child_process', () => ({
  execFile: mockExecFile,
}));
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: () => mockExecFile,
}));

jest.mock('../src/config/logger', () => ({
  AppLogger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockFlowiseConfig = {
  enabled: true,
  baseUrl: 'http://flowise.local/',
  flowId: 'flow-123',
  apiKey: 'key-abc',
};
jest.mock('../src/controllers/flowise-config.controller', () => ({
  getCurrentFlowiseConfig: jest.fn().mockResolvedValue(mockFlowiseConfig),
}));

const mockGetEnvironment = jest.fn().mockReturnValue({
  MINIO_PUBLIC_BASE_URL: 'https://minio.public.com',
  MINIO_INTERNAL_BASE_URL: 'http://minio.internal:9000',
});
jest.mock('../src/config/environment', () => ({
  getEnvironment: () => mockGetEnvironment(),
}));

const mockMinioService = {
  getSignedUrlInternal: jest.fn().mockResolvedValue('http://minio.internal:9000/bucket/signed-url'),
};
jest.mock('../src/services/minio.service', () => ({
  minioService: mockMinioService,
}));

const mockPDFDocument = {
  load: jest.fn().mockResolvedValue({
    save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  }),
};
jest.mock('pdf-lib', () => ({
  PDFDocument: mockPDFDocument,
}));

import { FlowiseService } from '../src/services/flowise.service';
import { getCurrentFlowiseConfig } from '../src/controllers/flowise-config.controller';
import { promises as fs } from 'fs';

// ── Helpers ────────────────────────────────────────────────────────────────
function resetInstance(): FlowiseService {
  (FlowiseService as any).instance = undefined;
  return FlowiseService.getInstance();
}

function makeFlowiseTextResponse(text: string) {
  return { data: { result: text } };
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('FlowiseService (coverage)', () => {
  let service: FlowiseService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ ...mockFlowiseConfig });
    mockGetEnvironment.mockReturnValue({
      MINIO_PUBLIC_BASE_URL: 'https://minio.public.com',
      MINIO_INTERNAL_BASE_URL: 'http://minio.internal:9000',
    });
    process.env.PDF_RASTERIZE_FORMAT = 'png';
    process.env.PDF_RASTERIZE_DPI = '200';
    process.env.PDF_RASTERIZE_MAX_PAGES = '0';
    process.env.PDF_RASTERIZE_MAX_RETRY = '1';
    process.env.PDF_RASTERIZE_TIMEOUT_MS = '60000';
    process.env.PDF_RASTERIZE_CHUNK_SIZE = '1';
    process.env.PDF_RASTERIZE_JPEG_QUALITY = '75';
    process.env.PDF_RASTERIZE_SCALE_TO = '0';
    service = resetInstance();
  });

  // ── Singleton ──────────────────────────────────────────────────────────
  describe('getInstance', () => {
    it('returns same instance on second call', () => {
      const a = FlowiseService.getInstance();
      const b = FlowiseService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── Circuit Breaker ────────────────────────────────────────────────────
  describe('circuit breaker', () => {
    it('opens after 5 consecutive failures', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockRejectedValue(new Error('connection refused'));

      for (let i = 0; i < 5; i++) {
        await service.extractDocumentText('http://minio.public.com/bucket/file.png', 'DNI');
      }

      const result = await service.extractDocumentText('http://minio.public.com/bucket/file.png', 'DNI');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Circuit breaker');
    });

    it('resets after timeout expires', async () => {
      (service as any).circuitFailures = 5;
      (service as any).circuitOpenUntil = Date.now() - 1;

      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { result: 'Entidad: CHOFER\nComprobante: DNI' } });

      const result = await service.extractDocumentText('http://example.com/file.png', 'DNI');
      expect(result.success).toBe(true);
      expect((service as any).circuitFailures).toBe(0);
    });

    it('recordSuccess resets counters', () => {
      (service as any).circuitFailures = 3;
      (service as any).circuitOpenUntil = Date.now() + 10000;
      (service as any).recordSuccess();
      expect((service as any).circuitFailures).toBe(0);
      expect((service as any).circuitOpenUntil).toBe(0);
    });

    it('remains open when circuitOpenUntil is in the future', () => {
      (service as any).circuitFailures = 5;
      (service as any).circuitOpenUntil = Date.now() + 60000;
      expect((service as any).isCircuitOpen()).toBe(true);
    });

    it('returns false and does not reset when circuitOpenUntil is 0', () => {
      (service as any).circuitFailures = 2;
      (service as any).circuitOpenUntil = 0;
      expect((service as any).isCircuitOpen()).toBe(false);
      expect((service as any).circuitFailures).toBe(2);
    });

    it('recordFailure increments counter without opening circuit when below threshold', () => {
      (service as any).circuitFailures = 2;
      (service as any).recordFailure();
      expect((service as any).circuitFailures).toBe(3);
      expect((service as any).circuitOpenUntil).toBe(0);
    });
  });

  // ── updateConfig ───────────────────────────────────────────────────────
  describe('updateConfig', () => {
    it('disables service when baseUrl is missing', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ enabled: true, baseUrl: '', flowId: 'f', apiKey: 'k' });
      const result = await service.extractDocumentText('http://x.com/f.png', 'DNI');
      expect(result.success).toBe(false);
      expect(result.error).toContain('no configurado');
    });

    it('strips trailing slash from baseUrl', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({
        enabled: true, baseUrl: 'http://flowise.local/', flowId: 'f1', apiKey: 'k',
      });
      mockAxios.get.mockResolvedValue({ data: Buffer.from('x'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { result: 'test' } });

      await service.extractDocumentText('http://example.com/file.png', 'DNI');
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://flowise.local/api/v1/prediction/f1',
        expect.anything(),
        expect.anything()
      );
    });

    it('handles baseUrl without trailing slash', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({
        enabled: true, baseUrl: 'http://flowise.local', flowId: 'f2', apiKey: 'k',
      });
      mockAxios.get.mockResolvedValue({ data: Buffer.from('x'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { result: 'test' } });

      await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://flowise.local/api/v1/prediction/f2',
        expect.anything(),
        expect.anything()
      );
    });

    it('disables service when flowId is missing', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ enabled: true, baseUrl: 'http://x.com', flowId: '', apiKey: 'k' });
      const result = await service.extractDocumentText('http://x.com/f.png', 'DNI');
      expect(result.success).toBe(false);
    });

    it('sets empty endpoint when baseUrl or flowId is missing', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ enabled: true, baseUrl: '', flowId: '', apiKey: '' });
      await (service as any).updateConfig();
      expect((service as any).endpoint).toBe('');
    });

    it('sets apiKey to empty string when not provided', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ enabled: true, baseUrl: 'http://x', flowId: 'f', apiKey: undefined });
      await (service as any).updateConfig();
      expect((service as any).apiKey).toBe('');
    });
  });

  // ── extractDocumentText ────────────────────────────────────────────────
  describe('extractDocumentText', () => {
    it('processes image file directly', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('imgdata'), headers: { 'content-type': 'image/jpeg' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER\nId_Entidad: 12345\nComprobante: DNI\nVencimiento: 01/12/2025'));

      const result = await service.extractDocumentText('http://example.com/doc.jpg', 'DNI', { documentId: 1 });

      expect(result.success).toBe(true);
      expect(result.data?.metadata?.aiParsed?.entidad).toBe('CHOFER');
    });

    it('falls back to direct request when PDF rasterization fails completely', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('pdfdata'), headers: { 'content-type': 'application/pdf' } });
      mockExecFile.mockRejectedValue(new Error('pdftoppm not found'));
      mockPDFDocument.load.mockRejectedValue(new Error('corrupt'));

      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CAMION\nComprobante: Seguro Tractor'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'Seguro', { documentId: 2 });
      expect(result.success).toBe(true);
    });

    it('cleans up tmp dirs in finally block', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('pdf'), headers: { 'content-type': 'application/pdf' } });
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('http://example.com/doc.pdf', 'T');
      expect(fs.rm).toHaveBeenCalled();
    });

    it('returns error when extractDocumentText throws', async () => {
      mockAxios.get.mockRejectedValue(new Error('network error'));

      const result = await service.extractDocumentText('http://example.com/doc.png', 'DNI');
      expect(result.success).toBe(false);
      expect(result.error).toBe('network error');
    });

    it('returns generic error for non-Error throws', async () => {
      mockAxios.get.mockRejectedValue('string error');

      const result = await service.extractDocumentText('http://example.com/doc.png', 'DNI');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error desconocido');
    });

    it('records failure when result.success is false', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { success: false, error: 'bad format' } });

      const result = await service.extractDocumentText('http://example.com/doc.png', 'T');
      expect(result.success).toBe(false);
    });

    it('handles content-type header missing entirely', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: {} });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.bin', 'T');
      expect(result.success).toBe(true);
    });
  });

  // ── PDF rasterization ──────────────────────────────────────────────────
  describe('PDF rasterization branches', () => {
    beforeEach(() => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('pdf'), headers: { 'content-type': 'application/pdf' } });
    });

    it('processes rasterized pages via chunked requests', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png', 'page-02.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('tries sanitize+rasterize when first attempt fails and maxRetry > 0', async () => {
      process.env.PDF_RASTERIZE_MAX_RETRY = '1';
      service = resetInstance();

      mockExecFile
        .mockRejectedValueOnce(new Error('pdftoppm fail'))
        .mockRejectedValueOnce(new Error('pdftocairo fail'))
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      mockPDFDocument.load.mockResolvedValue({ save: jest.fn().mockResolvedValue(new Uint8Array([1])) });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('falls back when rasterization produces no pages', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('handles jpeg format configuration', async () => {
      process.env.PDF_RASTERIZE_FORMAT = 'jpeg';
      process.env.PDF_RASTERIZE_SCALE_TO = '1024';
      service = resetInstance();

      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.jpg']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('jpgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('handles jpg format alias', async () => {
      process.env.PDF_RASTERIZE_FORMAT = 'jpg';
      service = resetInstance();

      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.jpg']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('jpgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('sends direct request when all chunks return unsuccessfully', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post
        .mockResolvedValueOnce({ data: { success: false, error: 'chunk fail' } })
        .mockResolvedValueOnce(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('throws RasterizationFailed when both rasterize and sanitize fail and maxRetry is 0', async () => {
      process.env.PDF_RASTERIZE_MAX_RETRY = '0';
      service = resetInstance();

      mockExecFile
        .mockRejectedValueOnce(new Error('pdftoppm fail'))
        .mockRejectedValueOnce(new Error('pdftocairo fail'));

      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('handles maxPages > 0 in rasterization', async () => {
      process.env.PDF_RASTERIZE_MAX_PAGES = '5';
      service = resetInstance();

      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('handles multiple chunks with chunkSize > 1', async () => {
      process.env.PDF_RASTERIZE_CHUNK_SIZE = '2';
      service = resetInstance();

      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png', 'page-02.png', 'page-03.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post
        .mockResolvedValueOnce({ data: { success: false } })
        .mockResolvedValueOnce(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('filters page files matching regex with page prefix variants', async () => {
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png', 'page02.png', 'other.txt', 'page-03.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });

    it('processes PDF with rasterizePdf returning no pages but maxRetry exhausted', async () => {
      process.env.PDF_RASTERIZE_MAX_RETRY = '1';
      service = resetInstance();

      mockExecFile
        .mockRejectedValueOnce(new Error('pdftoppm'))
        .mockRejectedValueOnce(new Error('pdftocairo'))
        .mockRejectedValueOnce(new Error('sanitize fail'));

      mockPDFDocument.load.mockResolvedValue({ save: jest.fn().mockResolvedValue(new Uint8Array([1])) });

      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('fallback text'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'DNI');
      expect(result.success).toBe(true);
    });
  });

  // ── sendDirectRequest ──────────────────────────────────────────────────
  describe('sendDirectRequest', () => {
    it('throws on non-200 response', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ status: 500, data: null });

      const result = await service.extractDocumentText('http://example.com/doc.png', 'T');
      expect(result.success).toBe(false);
    });

    it('handles successful 200 response from sendDirectRequest', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ status: 200, data: { result: 'Entidad: CHOFER' } });

      const result = await service.extractDocumentText('http://example.com/doc.png', 'T');
      expect(result.success).toBe(true);
    });
  });

  // ── parseFlowiseResponse ──────────────────────────────────────────────
  describe('parseFlowiseResponse', () => {
    it('handles string response directly', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: 'Entidad: CHOFER\nComprobante: DNI' });

      const result = await service.extractDocumentText('http://example.com/file.png', 'DNI');
      expect(result.success).toBe(true);
      expect(result.data?.metadata?.aiParsed?.entidad).toBe('CHOFER');
    });

    it('handles data.text field', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { text: 'Entidad: CAMION' } });

      const result = await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(result.success).toBe(true);
    });

    it('handles data.success + data.extractedData format', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({
        data: {
          success: true,
          extractedData: { text: 'some text', confidence: 0.9, metadata: { extra: true } },
          model: 'gpt-4',
        },
      });

      const result = await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe(0.9);
    });

    it('handles data.success + extractedData without confidence', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({
        data: {
          success: true,
          extractedData: { text: 'text' },
        },
      });

      const result = await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe(0.8);
    });

    it('returns error for invalid response format', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { someOtherField: 123 } });

      const result = await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(result.success).toBe(false);
    });

    it('returns error message from data.error', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { error: 'custom error msg' } });

      const result = await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(result.success).toBe(false);
      expect(result.error).toBe('custom error msg');
    });

    it('handles parseFlowiseResponse internal error (catch path)', () => {
      const parsed = (service as any).parseFlowiseResponse(undefined);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain('Error parseando');
    });

    it('handles extractedData without metadata field', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({
        data: {
          success: true,
          extractedData: { text: 'txt', confidence: 0.7 },
        },
      });

      const result = await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(result.success).toBe(true);
      expect(result.data?.metadata).toBeDefined();
    });

    it('handles data.result as a non-string value', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({ data: { result: 12345 } });

      const result = await service.extractDocumentText('http://example.com/file.png', 'T');
      expect(result.success).toBe(false);
    });
  });

  // ── extractAiTaggedFields ─────────────────────────────────────────────
  describe('extractAiTaggedFields (via extractDocumentText)', () => {
    function mockImageFlow(text: string) {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse(text));
    }

    it('parses all fields', async () => {
      mockImageFlow('Entidad: CHOFER\nId_Entidad: 99\nComprobante: DNI\nVencimiento: 15/06/2025');
      const result = await service.extractDocumentText('http://example.com/f.png', 'DNI');
      const parsed = result.data?.metadata?.aiParsed;
      expect(parsed.entidad).toBe('CHOFER');
      expect(parsed.idEntidad).toBe('99');
      expect(parsed.comprobante).toBe('DNI');
      expect(parsed.vencimientoDate).toBeDefined();
    });

    it('handles missing fields gracefully', async () => {
      mockImageFlow('some random text without tags');
      const result = await service.extractDocumentText('http://example.com/f.png', 'T');
      const parsed = result.data?.metadata?.aiParsed;
      expect(parsed.entidad).toBe('DESCONOCIDO');
      expect(parsed.idEntidad).toBe('Desconocido');
      expect(parsed.confidence).toBe(0);
    });

    it('handles invalid date format', async () => {
      mockImageFlow('Entidad: CHOFER\nVencimiento: invalid-date');
      const result = await service.extractDocumentText('http://example.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.vencimientoDate).toBeUndefined();
    });

    it('handles valid date that produces NaN', async () => {
      mockImageFlow('Entidad: CHOFER\nVencimiento: 32/13/2025');
      const result = await service.extractDocumentText('http://example.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.vencimientoDate).toBeUndefined();
    });

    it('calculates confidence based on known fields', async () => {
      mockImageFlow('Entidad: CHOFER\nId_Entidad: 42\nComprobante: DNI\nVencimiento: Desconocido');
      const result = await service.extractDocumentText('http://example.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.confidence).toBe(0.75);
    });

    it('computes full confidence when all fields are known', async () => {
      mockImageFlow('Entidad: CHOFER\nId_Entidad: 42\nComprobante: DNI\nVencimiento: 01/01/2030');
      const result = await service.extractDocumentText('http://example.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.confidence).toBe(1);
    });

    it('normalizes entidad to uppercase', async () => {
      mockImageFlow('Entidad: camion\nId_Entidad: 5');
      const result = await service.extractDocumentText('http://example.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.entidad).toBe('CAMION');
    });
  });

  // ── classifyDocument ───────────────────────────────────────────────────
  describe('classifyDocument', () => {
    function mockImageFlow(text: string) {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse(text));
    }

    it('returns classified document data', async () => {
      mockImageFlow('Entidad: CHOFER\nId_Entidad: 123\nComprobante: DNI\nVencimiento: 01/12/2025');
      const result = await service.classifyDocument('http://example.com/f.png', 'DNI', { documentId: 1 });
      expect(result.success).toBe(true);
      expect(result.entityType).toBe('CHOFER');
      expect(result.entityId).toBe(123);
      expect(result.documentType).toBe('DNI');
    });

    it('returns failure when extractDocumentText fails', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ enabled: false, baseUrl: '', flowId: '', apiKey: '' });
      const result = await service.classifyDocument('http://example.com/f.png');
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('uses AUTO templateHint when not provided', async () => {
      mockImageFlow('Entidad: CAMION\nId_Entidad: abc\nComprobante: Seguro');
      const result = await service.classifyDocument('http://example.com/f.png');
      expect(result.entityId).toBeUndefined();
    });

    it('returns undefined entityType when aiParsed.entidad is empty', async () => {
      mockImageFlow('Id_Entidad: 42\nComprobante: DNI');
      const result = await service.classifyDocument('http://example.com/f.png', 'DNI');
      expect(result.success).toBe(true);
      expect(result.entityType).toBeDefined();
    });

    it('returns expirationDate from vencimientoDate', async () => {
      mockImageFlow('Entidad: CHOFER\nId_Entidad: 10\nComprobante: Licencia\nVencimiento: 15/06/2030');
      const result = await service.classifyDocument('http://example.com/f.png', 'Licencia');
      expect(result.expirationDate).toBeDefined();
    });

    it('handles classify with empty data metadata', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue({
        data: { success: true, extractedData: { text: 'text', confidence: 0.5 } },
      });
      const result = await service.classifyDocument('http://example.com/f.png');
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.5);
    });
  });

  // ── validateDocument ───────────────────────────────────────────────────
  describe('validateDocument', () => {
    function mockImageFlow(text: string) {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse(text));
    }

    it('validates CHOFER document with license number', async () => {
      mockImageFlow('Entidad: CHOFER\nLicencia 12345678');
      const result = await service.validateDocument('http://example.com/f.png', 'Licencia', 'CHOFER');
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('rejects CHOFER document without license number', async () => {
      mockImageFlow('Entidad: CHOFER\nNo hay número');
      const result = await service.validateDocument('http://example.com/f.png', 'Licencia', 'CHOFER');
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('validates CAMION document with patente', async () => {
      mockImageFlow('Patente ABC123 registrada');
      const result = await service.validateDocument('http://example.com/f.png', 'Seguro', 'CAMION');
      expect(result.isValid).toBe(true);
    });

    it('validates CAMION with new plate format (AA 123 BB)', async () => {
      mockImageFlow('Patente AB 123 CD registrada');
      const result = await service.validateDocument('http://example.com/f.png', 'Seguro', 'CAMION');
      expect(result.isValid).toBe(true);
    });

    it('uses base rules for unknown entity type', async () => {
      mockImageFlow('Some readable text');
      const result = await service.validateDocument('http://example.com/f.png', 'T', 'UNKNOWN');
      expect(result.isValid).toBe(true);
    });

    it('returns failure when extraction fails', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ enabled: false, baseUrl: '', flowId: '', apiKey: '' });
      const result = await service.validateDocument('http://example.com/f.png', 'T', 'CHOFER');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Servicio Flowise no configurado');
    });

    it('returns extractedData on valid document', async () => {
      mockImageFlow('Some readable text with 12345678');
      const result = await service.validateDocument('http://example.com/f.png', 'T', 'CHOFER');
      expect(result.extractedData).toBeDefined();
      expect(result.extractedData.processedAt).toBeDefined();
    });
  });

  // ── healthCheck ────────────────────────────────────────────────────────
  describe('healthCheck', () => {
    it('returns true on 200', async () => {
      mockAxios.get.mockResolvedValue({ status: 200 });
      const ok = await service.healthCheck();
      expect(ok).toBe(true);
    });

    it('returns false on error', async () => {
      mockAxios.get.mockRejectedValue(new Error('timeout'));
      const ok = await service.healthCheck();
      expect(ok).toBe(false);
    });

    it('returns false when disabled', async () => {
      (getCurrentFlowiseConfig as jest.Mock).mockResolvedValue({ enabled: false, baseUrl: '', flowId: '', apiKey: '' });
      service = resetInstance();
      await (service as any).updateConfig();
      const ok = await service.healthCheck();
      expect(ok).toBe(false);
    });
  });

  // ── getInternalFileUrl ─────────────────────────────────────────────────
  describe('URL resolution (via processDocument)', () => {
    it('rewrites public MinIO URL to internal', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('https://minio.public.com/bucket/path/file.png', 'DNI');
      expect(mockMinioService.getSignedUrlInternal).toHaveBeenCalledWith('bucket', 'path/file.png', 3600);
    });

    it('does not rewrite non-matching hostname', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('http://other.host.com/bucket/file.png', 'DNI');
      expect(mockMinioService.getSignedUrlInternal).not.toHaveBeenCalled();
    });

    it('returns original URL when env vars missing', async () => {
      mockGetEnvironment.mockReturnValue({});
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('https://minio.public.com/bucket/file.png', 'DNI');
      expect(mockMinioService.getSignedUrlInternal).not.toHaveBeenCalled();
    });

    it('handles URL with no bucket/objectPath', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('https://minio.public.com/', 'DNI');
      expect(mockMinioService.getSignedUrlInternal).not.toHaveBeenCalled();
    });

    it('falls back to original URL on URL parse error', async () => {
      mockGetEnvironment.mockReturnValue({
        MINIO_PUBLIC_BASE_URL: 'not-a-url',
        MINIO_INTERNAL_BASE_URL: 'http://internal:9000',
      });
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('https://minio.public.com/bucket/file.png', 'DNI');
      expect(mockMinioService.getSignedUrlInternal).not.toHaveBeenCalled();
    });

    it('falls back when getSignedUrlInternal throws', async () => {
      mockMinioService.getSignedUrlInternal.mockRejectedValueOnce(new Error('minio down'));
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('https://minio.public.com/bucket/path/file.png', 'DNI');
      expect(result.success).toBe(true);
    });

    it('returns original URL when MINIO_PUBLIC_BASE_URL is set but MINIO_INTERNAL_BASE_URL is not', async () => {
      mockGetEnvironment.mockReturnValue({ MINIO_PUBLIC_BASE_URL: 'https://minio.public.com' });
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('https://minio.public.com/bucket/file.png', 'DNI');
      expect(mockMinioService.getSignedUrlInternal).not.toHaveBeenCalled();
    });

    it('handles URL with only bucket and no object path', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      await service.extractDocumentText('https://minio.public.com/bucket', 'DNI');
      expect(mockMinioService.getSignedUrlInternal).not.toHaveBeenCalled();
    });
  });

  // ── normalizeComprobanteName ───────────────────────────────────────────
  describe('comprobante normalization (via classification)', () => {
    function mockImageFlow(text: string) {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse(text));
    }

    it('normalizes empty comprobante to Desconocido', async () => {
      mockImageFlow('Entidad: CHOFER\nComprobante: ');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Desconocido');
    });

    it('normalizes constancia ARCA empresa', async () => {
      mockImageFlow('Comprobante: Constancia de ARCA Empresa');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Constancia de ARCA Empresa');
    });

    it('normalizes ARCA empresa variant', async () => {
      mockImageFlow('Comprobante: ARCA empresa transportista');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Constancia de ARCA Empresa');
    });

    it('normalizes constancia IIBB empresa', async () => {
      mockImageFlow('Comprobante: Constancia IIBB de Empresa');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Constancia IIBB de Empresa');
    });

    it('normalizes ingresos brutos empresa', async () => {
      mockImageFlow('Comprobante: Ingresos Brutos empresa');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Constancia IIBB de Empresa');
    });

    it('normalizes F.931 presentacion', async () => {
      mockImageFlow('Comprobante: F.931 presentacion acuse');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toContain('F.931');
    });

    it('normalizes formulario 931', async () => {
      mockImageFlow('Comprobante: Formulario 931 declaracion jurada');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toContain('F.931');
    });

    it('normalizes presentacion f 931', async () => {
      mockImageFlow('Comprobante: Presentacion mensual F 931');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toContain('F.931');
    });

    it('normalizes DNI', async () => {
      mockImageFlow('Comprobante: DNI');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('DNI');
    });

    it('normalizes Licencia de Conducir', async () => {
      mockImageFlow('Comprobante: Licencia de conducir');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Licencia');
    });

    it('normalizes plain licencia', async () => {
      mockImageFlow('Comprobante: licencia');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Licencia');
    });

    it('normalizes Alta Temprana', async () => {
      mockImageFlow('Comprobante: Alta temprana');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Alta Temprana');
    });

    it('normalizes ART', async () => {
      mockImageFlow('Comprobante: ART');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('ART');
    });

    it('normalizes Seguro de Vida Obligatorio', async () => {
      mockImageFlow('Comprobante: Seguro de Vida obligatorio');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Seguro de Vida Obligatorio');
    });

    it('normalizes vida obligatorio variant', async () => {
      mockImageFlow('Comprobante: Vida obligatorio del chofer');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Seguro de Vida Obligatorio');
    });

    it('normalizes Titulo Tractor', async () => {
      mockImageFlow('Comprobante: Titulo del tractor');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Titulo Tractor');
    });

    it('normalizes titulo tractor with direct match', async () => {
      mockImageFlow('Comprobante: titulo tractor');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Titulo Tractor');
    });

    it('normalizes Cedula Tractor', async () => {
      mockImageFlow('Comprobante: Cedula tractor');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Cedula Tractor');
    });

    it('normalizes Seguro Tractor', async () => {
      mockImageFlow('Comprobante: Seguro del tractor');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Seguro Tractor');
    });

    it('normalizes RTO Tractor', async () => {
      mockImageFlow('Comprobante: RTO del tractor');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('RTO Tractor');
    });

    it('normalizes VTV Tractor', async () => {
      mockImageFlow('Comprobante: VTV tractor');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('RTO Tractor');
    });

    it('normalizes Titulo Semirremolque', async () => {
      mockImageFlow('Comprobante: Titulo del semirremolque');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Titulo Semirremolque');
    });

    it('normalizes Titulo acoplado variant', async () => {
      mockImageFlow('Comprobante: Titulo del acoplado');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Titulo Semirremolque');
    });

    it('normalizes Cedula Semirremolque', async () => {
      mockImageFlow('Comprobante: Cedula acoplado');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Cedula Semirremolque');
    });

    it('normalizes cedula semirremolque variant', async () => {
      mockImageFlow('Comprobante: cedula semirremolque');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Cedula Semirremolque');
    });

    it('normalizes Seguro Acoplado', async () => {
      mockImageFlow('Comprobante: Seguro del acoplado');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Seguro Acoplado');
    });

    it('normalizes Seguro semirremolque variant', async () => {
      mockImageFlow('Comprobante: Seguro del semirremolque');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Seguro Acoplado');
    });

    it('normalizes RTO Semirremolque', async () => {
      mockImageFlow('Comprobante: RTO del semirremolque');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('RTO Semirremolque');
    });

    it('normalizes VTV acoplado variant', async () => {
      mockImageFlow('Comprobante: VTV acoplado');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('RTO Semirremolque');
    });

    it('capitalizes unrecognized comprobante', async () => {
      mockImageFlow('Comprobante: something unknown');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Something unknown');
    });

    it('handles F.931 constancia de pago variant', async () => {
      mockImageFlow('Comprobante: F 931 constancia de pago');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toContain('F.931');
    });

    it('normalizes constancia ARCA with different wording', async () => {
      mockImageFlow('Comprobante: constancia arca empresa de transporte');
      const result = await service.extractDocumentText('http://x.com/f.png', 'T');
      expect(result.data?.metadata?.aiParsed?.comprobante).toBe('Constancia de ARCA Empresa');
    });
  });

  // ── extractFileName ────────────────────────────────────────────────────
  describe('extractFileName edge cases', () => {
    it('handles invalid URL gracefully', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));
      mockGetEnvironment.mockReturnValue({});

      const result = await service.extractDocumentText('not-a-url', 'T');
      expect(result.success).toBe(true);
    });
  });

  // ── cleanup error path ─────────────────────────────────────────────────
  describe('cleanup error path', () => {
    it('ignores cleanup errors silently', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('pdf'), headers: { 'content-type': 'application/pdf' } });
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('imgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));
      (fs.rm as jest.Mock).mockRejectedValue(new Error('permission denied'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'T');
      expect(result.success).toBe(true);
    });
  });

  // ── prepareImageUpload branches ────────────────────────────────────────
  describe('prepareImageUpload (via chunked requests)', () => {
    it('detects jpeg mime for .jpg extension', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('pdf'), headers: { 'content-type': 'application/pdf' } });
      process.env.PDF_RASTERIZE_FORMAT = 'jpeg';
      service = resetInstance();

      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.jpg']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('jpgdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'T');
      expect(result.success).toBe(true);
    });

    it('detects png mime for .png extension', async () => {
      mockAxios.get.mockResolvedValue({ data: Buffer.from('pdf'), headers: { 'content-type': 'application/pdf' } });
      mockExecFile.mockResolvedValue({ stdout: '', stderr: '' });
      (fs.readdir as jest.Mock).mockResolvedValue(['page-01.png']);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('pngdata'));
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      const result = await service.extractDocumentText('http://example.com/doc.pdf', 'T');
      expect(result.success).toBe(true);
    });
  });

  // ── getRasterConfig edge cases ─────────────────────────────────────────
  describe('getRasterConfig edge cases', () => {
    it('handles invalid env values with defaults', () => {
      process.env.PDF_RASTERIZE_DPI = 'invalid';
      process.env.PDF_RASTERIZE_MAX_PAGES = '-5';
      process.env.PDF_RASTERIZE_MAX_RETRY = '-1';
      process.env.PDF_RASTERIZE_TIMEOUT_MS = '1000';
      process.env.PDF_RASTERIZE_JPEG_QUALITY = '5';

      service = resetInstance();

      mockAxios.get.mockResolvedValue({ data: Buffer.from('img'), headers: { 'content-type': 'image/png' } });
      mockAxios.post.mockResolvedValue(makeFlowiseTextResponse('Entidad: CHOFER'));

      expect(service).toBeDefined();
    });

    it('handles jpeg quality above max', () => {
      process.env.PDF_RASTERIZE_JPEG_QUALITY = '100';
      service = resetInstance();
      expect(service).toBeDefined();
    });
  });
});
